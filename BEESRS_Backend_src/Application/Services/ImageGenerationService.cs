using Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Application.Services
{
    /// <summary>
    /// Service for generating images using Gemini API (gemini-2.5-flash-image model)
    /// </summary>
    public class ImageGenerationService : IImageGenerationService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<ImageGenerationService> _logger;
        private readonly string _apiKey;
        private readonly string _baseUrl;
        private readonly string _model;

        public ImageGenerationService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<ImageGenerationService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            
            // Use Gemini API for image generation
            _apiKey = configuration["Gemini:ApiKey"] ?? throw new ArgumentException("Gemini API Key not configured");
            _baseUrl = configuration["Gemini:BaseUrl"] ?? "https://generativelanguage.googleapis.com/v1beta";
            _model = "gemini-2.5-flash-image";
        }

        public async Task<byte[]> GenerateImageAsync(string prompt)
        {
            try
            {
                _logger.LogInformation("Generating image with Gemini API, prompt: {Prompt}", prompt);

                var request = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = prompt }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        responseModalities = new[] { "Image" }, // Ensure response is an image
                        imageConfig = new
                        {
                            aspectRatio = "16:9" // Good for cover images (1344x768)
                        }
                    }
                };

                var json = JsonSerializer.Serialize(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var url = $"{_baseUrl}/models/{_model}:generateContent?key={_apiKey}";
                
                _logger.LogDebug("Sending request to Gemini API: {Url}", url);

                var response = await _httpClient.PostAsync(url, content);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Gemini API error ({StatusCode}): {ErrorContent}", response.StatusCode, errorContent);
                    throw new HttpRequestException($"Gemini API returned {response.StatusCode}: {errorContent}");
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<GeminiImageResponse>(responseContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (result?.Candidates == null || result.Candidates.Length == 0)
                {
                    throw new Exception("No candidates returned from Gemini API");
                }

                var candidate = result.Candidates[0];
                if (candidate?.Content?.Parts == null || candidate.Content.Parts.Length == 0)
                {
                    throw new Exception("No content parts in response");
                }

                // Find the inline data part (image)
                foreach (var part in candidate.Content.Parts)
                {
                    if (part.InlineData != null && !string.IsNullOrEmpty(part.InlineData.Data))
                    {
                        // Decode base64 image data
                        var imageBytes = Convert.FromBase64String(part.InlineData.Data);
                        _logger.LogInformation("Image generated successfully, size: {Size} bytes", imageBytes.Length);
                        return imageBytes;
                    }
                }

                throw new Exception("No image data found in response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating image with prompt: {Prompt}", prompt);
                throw;
            }
        }

        private class GeminiImageResponse
        {
            public GeminiCandidate[] Candidates { get; set; }
        }

        private class GeminiCandidate
        {
            public GeminiContent Content { get; set; }
        }

        private class GeminiContent
        {
            public GeminiPart[] Parts { get; set; }
        }

        private class GeminiPart
        {
            public string Text { get; set; }
            public GeminiInlineData InlineData { get; set; }
        }

        private class GeminiInlineData
        {
            public string MimeType { get; set; }
            public string Data { get; set; }
        }
    }
}

