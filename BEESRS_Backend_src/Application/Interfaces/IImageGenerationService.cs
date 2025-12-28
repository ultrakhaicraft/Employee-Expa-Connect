using System.Threading.Tasks;

namespace Application.Interfaces
{
    /// <summary>
    /// Service for generating images from text prompts
    /// </summary>
    public interface IImageGenerationService
    {
        /// <summary>
        /// Generate an image from a text prompt
        /// </summary>
        /// <param name="prompt">Text prompt describing the image</param>
        /// <returns>Byte array of the generated image</returns>
        Task<byte[]> GenerateImageAsync(string prompt);
    }
}

