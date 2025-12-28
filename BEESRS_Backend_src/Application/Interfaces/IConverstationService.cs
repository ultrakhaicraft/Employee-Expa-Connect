using Infrastructure.Models.Converstation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IConverstationService
    {
        // Conversation Management
        Task<ConversationDto> CreateConversationAsync(Guid currentUserId, CreateConversationDto dto);
        Task<ConversationDto> GetConversationByIdAsync(Guid conversationId, Guid currentUserId);
        Task<ConversationListDto> GetUserConversationsAsync(Guid userId, int pageNumber = 1, int pageSize = 20);
        Task<ConversationDto> GetOrCreateDirectConversationAsync(Guid currentUserId, Guid otherUserId);
        Task<bool> DeleteConversationAsync(Guid conversationId, Guid currentUserId);
        Task<ConversationDto> UpdateConversationAsync(Guid conversationId, Guid currentUserId, string name, string avatar);

        // Participant Management
        Task<List<ParticipantDto>> AddParticipantsAsync(Guid conversationId, Guid currentUserId, List<Guid> userIds);
        Task<bool> RemoveParticipantAsync(Guid conversationId, Guid currentUserId, Guid userId);
        Task<bool> LeaveConversationAsync(Guid conversationId, Guid currentUserId);
        Task<bool> UpdateParticipantRoleAsync(Guid conversationId, Guid currentUserId, Guid userId, string role);
        Task<List<ParticipantDto>> GetConversationParticipantsAsync(Guid conversationId, Guid currentUserId);

        // Message Management
        Task<MessageDto> SendMessageAsync(Guid currentUserId, SendMessageDto dto);
        Task<MessageDto> EditMessageAsync(Guid currentUserId, EditMessageDto dto);
        Task<bool> DeleteMessageAsync(Guid messageId, Guid currentUserId);
        Task<MessageListDto> GetConversationMessagesAsync(Guid conversationId, Guid currentUserId, int pageNumber = 1, int pageSize = 50);
        Task<List<MessageDto>> GetNewMessagesAsync(Guid conversationId, Guid currentUserId, DateTimeOffset after);

        // Read Receipts
        Task<bool> MarkMessageAsReadAsync(Guid messageId, Guid currentUserId);
        Task<bool> MarkConversationAsReadAsync(Guid conversationId, Guid currentUserId);

        // Typing Status
        Task UpdateTypingStatusAsync(Guid conversationId, Guid currentUserId, bool isTyping);
        Task<List<TypingStatusDto>> GetTypingStatusAsync(Guid conversationId);
    }
}
