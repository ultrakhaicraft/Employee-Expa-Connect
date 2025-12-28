using Application.Interfaces.ThirdParty;
using Azure;
using Azure.AI.ContentSafety;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Application.Services.ThirdParty
{
    public class ContentSafetyService : IContentSafetyService
    {
        private readonly string endpoint;
        private readonly string apiKey;
        public ContentSafetyService(IConfiguration configuration)
        {
            endpoint = configuration["ContentSafety:Endpoint"] ?? throw new ArgumentException("Azure key not found!");
            apiKey = configuration["ContentSafety:ApiKey"] ?? throw new ArgumentException("Azure key not found!");
        }

        public async Task<bool> CheckTextSafetyAsync(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return true;

            var client = new ContentSafetyClient(new Uri(endpoint), new AzureKeyCredential(apiKey));

            var request = new AnalyzeTextOptions(text);
            AnalyzeTextResult result;

            try
            {
                result = await client.AnalyzeTextAsync(request);
            }
            catch (Exception ex)
            {
                throw new Exception($"Azure Content Safety API error: {ex.Message}");
            }

            var violations = new List<string>();

            foreach (var category in result.CategoriesAnalysis)
            {
                var name = category.Category.ToString();
                int severity = category.Severity ?? 0;

                if (
                    (name == "Hate" && severity >= 2) ||
                    (name == "SelfHarm" && severity >= 2) ||
                    (name == "Violence" && severity >= 2) ||
                    (name == "Sexual" && severity >= 2)
                )
                {
                    violations.Add($"{name} (severity {severity})");
                }
            }

            if (violations.Any())
            {
                string message ="Your text contains content that violates safety guidelines please revise your content and try again.";

                throw new InvalidDataException(message);
            }

            return true;
        }
    }
}
