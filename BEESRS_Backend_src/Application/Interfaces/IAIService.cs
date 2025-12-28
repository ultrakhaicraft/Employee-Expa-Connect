using Domain.Entities;
using Infrastructure.Models.Chat;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IAIService
    {
        Task<IntentResultDto> ClassifyIntentAsync(string message, string language);
        Task<List<ExtractedEntityDto>> ExtractEntitiesAsync(string message, string language);
        Task<string> GenerateResponseAsync(
            string message,
            string intent,
            List<ExtractedEntityDto> entities,
            List<ChatMessage> conversationHistory,
            string language
        );
        Task<string> TranslateAsync(string text, string targetLanguage);
        Task<string> GenerateImagePromptAsync(
            string title,
            string description,
            string tripType,
            string destinationCity,
            string destinationCountry);
    }
}
