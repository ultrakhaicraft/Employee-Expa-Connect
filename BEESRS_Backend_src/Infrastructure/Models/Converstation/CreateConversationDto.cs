using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Converstation
{
    public class CreateConversationDto
    {
        public string ConversationType { get; set; } 
        public string? ConversationName { get; set; }
        public string? ConversationAvatar { get; set; }
        public List<Guid> ParticipantIds { get; set; }
    }

    public class SendMessageDto
    {
        public Guid ConversationId { get; set; }
        public string MessageType { get; set; }
        public string MessageContent { get; set; }
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public string? FileMimeType { get; set; }
        public string? ThumbnailUrl { get; set; }
        public int? Duration { get; set; }
        public string? LocationName { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public Guid? ReplyToMessageId { get; set; }
    }

    public class EditMessageDto
    {
        public Guid MessageId { get; set; }
        public string MessageContent { get; set; }
    }

    public class AddParticipantsDto
    {
        public Guid ConversationId { get; set; }
        public List<Guid> UserIds { get; set; }
    }

    public class UpdateParticipantRoleDto
    {
        public Guid ConversationId { get; set; }
        public Guid UserId { get; set; }
        public string Role { get; set; } // "admin" or "member"
    }

    public class MarkAsReadDto
    {
        public Guid ConversationId { get; set; }
        public Guid? MessageId { get; set; } // Null = mark all as read
    }

    public class TypingIndicatorDto
    {
        public Guid ConversationId { get; set; }
        public bool IsTyping { get; set; }
    }

    // Response DTOs
    public class ConversationDto
    {
        public Guid ConversationId { get; set; }
        public string ConversationType { get; set; }
        public string ConversationName { get; set; }
        public string ConversationAvatar { get; set; }
        public Guid CreatedBy { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
        public DateTimeOffset? LastMessageAt { get; set; }
        public List<ParticipantDto> Participants { get; set; }
        public MessageDto LastMessage { get; set; }
        public int UnreadCount { get; set; }
    }

    public class ParticipantDto
    {
        public Guid ParticipantId { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public string UserAvatar { get; set; }
        public string Role { get; set; }
        public DateTimeOffset JoinedAt { get; set; }
        public DateTimeOffset? LeftAt { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset? LastReadAt { get; set; }
        public bool NotificationEnabled { get; set; }
        public string Nickname { get; set; }
        public bool IsOnline { get; set; }
    }

    public class MessageDto
    {
        public Guid MessageId { get; set; }
        public Guid ConversationId { get; set; }
        public Guid SenderId { get; set; }
        public string SenderName { get; set; }
        public string SenderAvatar { get; set; }
        public string MessageType { get; set; }
        public string MessageContent { get; set; }
        public string FileUrl { get; set; }
        public string FileName { get; set; }
        public long? FileSize { get; set; }
        public string FileMimeType { get; set; }
        public string ThumbnailUrl { get; set; }
        public int? Duration { get; set; }
        public string LocationName { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public Guid? ReplyToMessageId { get; set; }
        public MessageDto ReplyToMessage { get; set; }
        public bool IsEdited { get; set; }
        public bool IsDeleted { get; set; }
        public DateTimeOffset? EditedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public List<ReadReceiptDto> ReadReceipts { get; set; }
        public bool IsRead { get; set; }
    }

    public class ReadReceiptDto
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public DateTimeOffset ReadAt { get; set; }
    }

    public class TypingStatusDto
    {
        public Guid ConversationId { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; }
        public bool IsTyping { get; set; }
        public DateTimeOffset StartedAt { get; set; }
    }

    public class ConversationListDto
    {
        public List<ConversationDto> Conversations { get; set; }
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
    }

    public class MessageListDto
    {
        public List<MessageDto> Messages { get; set; }
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public bool HasMore { get; set; }
    }
}
