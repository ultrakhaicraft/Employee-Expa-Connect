using Application.Hubs;
using Application.Interfaces;
using AutoMapper;
using Domain.Entities;
using Infrastructure.Interfaces.ConversationsInterface;
using Infrastructure.Models.Converstation;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Application.Services
{
    public class ConverstationService : IConverstationService
    {
        private readonly IConversationRepository _conversationRepo;
        private readonly IConversationParticipantRepository _participantRepo;
        private readonly IMessageRepository _messageRepo;
        private readonly IMessageReadReceiptRepository _readReceiptRepo;
        private readonly ITypingStatusRepository _typingStatusRepo;
        private readonly IHubContext<ConverstationHub> _hubContext;
        private readonly IMapper _mapper;

        public ConverstationService(
            IConversationRepository conversationRepo,
            IConversationParticipantRepository participantRepo,
            IMessageRepository messageRepo,
            IMessageReadReceiptRepository readReceiptRepo,
            ITypingStatusRepository typingStatusRepo,
            IHubContext<ConverstationHub> hubContext,
            IMapper mapper)
        {
            _conversationRepo = conversationRepo;
            _participantRepo = participantRepo;
            _messageRepo = messageRepo;
            _readReceiptRepo = readReceiptRepo;
            _typingStatusRepo = typingStatusRepo;
            _hubContext = hubContext;
            _mapper = mapper;
        }

        #region Conversation Management

        public async Task<ConversationDto> CreateConversationAsync(Guid currentUserId, CreateConversationDto dto)
        {
            // Validate conversation type
            if (dto.ConversationType != "direct" && dto.ConversationType != "group" && dto.ConversationType != "event")
            {
                throw new ArgumentException("Invalid conversation type. Must be 'direct', 'group', or 'event'.");
            }

            // For direct conversation, check if it already exists
            if (dto.ConversationType == "direct")
            {
                if (dto.ParticipantIds == null || dto.ParticipantIds.Count != 1)
                {
                    throw new ArgumentException("Direct conversation must have exactly 1 other participant.");
                }

                var otherUserId = dto.ParticipantIds[0];
                var existing = await _conversationRepo.GetDirectConversationAsync(currentUserId, otherUserId);

                if (existing != null)
                {
                    return await MapToConversationDtoAsync(existing, currentUserId);
                }
            }

            // Create new conversation using AutoMapper
            var conversation = _mapper.Map<Conversation>(dto);
            conversation.CreatedBy = currentUserId;

            await _conversationRepo.CreateAsync(conversation);

            // Add current user as admin
            var creatorParticipant = new ConversationParticipant
            {
                ConversationId = conversation.ConversationId,
                UserId = currentUserId,
                Role = "admin"
            };
            await _participantRepo.AddAsync(creatorParticipant);

            // Add other participants
            if (dto.ParticipantIds != null && dto.ParticipantIds.Any())
            {
                foreach (var userId in dto.ParticipantIds.Where(id => id != currentUserId))
                {
                    var participant = new ConversationParticipant
                    {
                        ConversationId = conversation.ConversationId,
                        UserId = userId,
                        Role = "member"
                    };
                    await _participantRepo.AddAsync(participant);

                    // Notify user via SignalR
                    await _hubContext.Clients.User(userId.ToString())
                        .SendAsync("ConversationCreated", await MapToConversationDtoAsync(conversation, userId));
                }
            }

            return await MapToConversationDtoAsync(conversation, currentUserId);
        }

        public async Task<ConversationDto> GetConversationByIdAsync(Guid conversationId, Guid currentUserId)
        {
            var conversation = await _conversationRepo.GetByIdWithDetailsAsync(conversationId);

            if (conversation == null)
            {
                throw new KeyNotFoundException("Conversation not found.");
            }

            if (!await _conversationRepo.IsParticipantAsync(conversationId, currentUserId))
            {
                throw new UnauthorizedAccessException("You are not a participant of this conversation.");
            }

            return await MapToConversationDtoAsync(conversation, currentUserId);
        }

        public async Task<ConversationListDto> GetUserConversationsAsync(Guid userId, int pageNumber = 1, int pageSize = 20)
        {
            var conversations = await _conversationRepo.GetUserConversationsAsync(userId, pageNumber, pageSize);

            // Sync avatar for event conversations
            foreach (var conv in conversations)
            {
                if (conv.ConversationType == "event" && conv.EventId.HasValue && conv.Event != null)
                {
                    // Update conversation avatar if it doesn't match event image
                    if (conv.ConversationAvatar != conv.Event.EventImageUrl)
                    {
                        conv.ConversationAvatar = conv.Event.EventImageUrl;
                        await _conversationRepo.UpdateAsync(conv);
                    }
                }
            }

            var conversationDtos = new List<ConversationDto>();
            foreach (var conv in conversations)
            {
                conversationDtos.Add(await MapToConversationDtoAsync(conv, userId));
            }

            return new ConversationListDto
            {
                Conversations = conversationDtos,
                TotalCount = conversationDtos.Count,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
        }

        public async Task<ConversationDto> GetOrCreateDirectConversationAsync(Guid currentUserId, Guid otherUserId)
        {
            if (currentUserId == otherUserId)
            {
                throw new ArgumentException("Cannot create conversation with yourself.");
            }

            var existing = await _conversationRepo.GetDirectConversationAsync(currentUserId, otherUserId);

            if (existing != null)
            {
                return await MapToConversationDtoAsync(existing, currentUserId);
            }

            // Create new direct conversation
            var dto = new CreateConversationDto
            {
                ConversationType = "direct",
                ParticipantIds = new List<Guid> { otherUserId }
            };

            return await CreateConversationAsync(currentUserId, dto);
        }

        public async Task<bool> DeleteConversationAsync(Guid conversationId, Guid currentUserId)
        {
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);

            if (conversation == null)
            {
                return false;
            }

            // Only creator or admin can delete
            var isAdmin = await _participantRepo.IsAdminAsync(conversationId, currentUserId);

            if (conversation.CreatedBy != currentUserId && !isAdmin)
            {
                throw new UnauthorizedAccessException("Only conversation creator or admin can delete.");
            }

            await _conversationRepo.DeleteAsync(conversationId);

            // Notify all participants
            var participants = await _participantRepo.GetConversationParticipantsAsync(conversationId);
            foreach (var participant in participants)
            {
                await _hubContext.Clients.User(participant.UserId.ToString())
                    .SendAsync("ConversationDeleted", conversationId);
            }

            return true;
        }

        public async Task<ConversationDto> UpdateConversationAsync(Guid conversationId, Guid currentUserId, string name, string avatar)
        {
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);

            if (conversation == null)
            {
                throw new KeyNotFoundException("Conversation not found.");
            }

            var isAdmin = await _participantRepo.IsAdminAsync(conversationId, currentUserId);

            if (!isAdmin)
            {
                throw new UnauthorizedAccessException("Only admin can update conversation details.");
            }

            // Update name if provided
            if (!string.IsNullOrEmpty(name))
            {
                conversation.ConversationName = name;
            }

            // Update avatar: set to null if empty string, otherwise use provided value
            if (avatar != null)
            {
                conversation.ConversationAvatar = string.IsNullOrWhiteSpace(avatar) ? null : avatar;
            }

            await _conversationRepo.UpdateAsync(conversation);

            var conversationDto = await MapToConversationDtoAsync(conversation, currentUserId);

            // Notify all participants
            var participants = await _participantRepo.GetConversationParticipantsAsync(conversationId);
            foreach (var participant in participants)
            {
                await _hubContext.Clients.User(participant.UserId.ToString())
                    .SendAsync("ConversationUpdated", conversationDto);
            }

            return conversationDto;
        }

        public async Task<List<ParticipantDto>> AddParticipantsAsync(Guid conversationId, Guid currentUserId, List<Guid> userIds)
        {
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);

            if (conversation == null)
            {
                throw new KeyNotFoundException("Conversation not found.");
            }

            if (conversation.ConversationType != "group")
            {
                throw new InvalidOperationException("Can only add participants to group conversations.");
            }

            var isAdmin = await _participantRepo.IsAdminAsync(conversationId, currentUserId);

            if (!isAdmin)
            {
                throw new UnauthorizedAccessException("Only admins can add participants.");
            }

            var addedParticipants = new List<ParticipantDto>();

            foreach (var userId in userIds)
            {
                var existing = await _participantRepo.GetParticipantAsync(conversationId, userId);

                if (existing == null)
                {
                    var participant = new ConversationParticipant
                    {
                        ConversationId = conversationId,
                        UserId = userId,
                        Role = "member"
                    };

                    await _participantRepo.AddAsync(participant);

                    // Re-fetch with User included
                    participant = await _participantRepo.GetParticipantAsync(conversationId, userId);
                    var participantDto = _mapper.Map<ParticipantDto>(participant);
                    addedParticipants.Add(participantDto);

                    // Notify the added user
                    await _hubContext.Clients.User(userId.ToString())
                        .SendAsync("AddedToConversation", await MapToConversationDtoAsync(conversation, userId));

                    // Notify all participants
                    var allParticipants = await _participantRepo.GetConversationParticipantsAsync(conversationId);
                    foreach (var p in allParticipants.Where(x => x.UserId != userId))
                    {
                        await _hubContext.Clients.User(p.UserId.ToString())
                            .SendAsync("ParticipantAdded", conversationId, participantDto);
                    }
                }
            }

            return addedParticipants;
        }

        public async Task<bool> RemoveParticipantAsync(Guid conversationId, Guid currentUserId, Guid userId)
        {
            var conversation = await _conversationRepo.GetByIdAsync(conversationId);

            if (conversation == null)
            {
                return false;
            }

            var isAdmin = await _participantRepo.IsAdminAsync(conversationId, currentUserId);

            if (!isAdmin && currentUserId != userId)
            {
                throw new UnauthorizedAccessException("Only admins can remove participants.");
            }

            var participant = await _participantRepo.GetParticipantAsync(conversationId, userId);

            if (participant == null)
            {
                return false;
            }

            await _participantRepo.RemoveAsync(participant.ParticipantId);

            // Notify removed user
            await _hubContext.Clients.User(userId.ToString())
                .SendAsync("RemovedFromConversation", conversationId);

            // Notify remaining participants
            var remainingParticipants = await _participantRepo.GetConversationParticipantsAsync(conversationId);
            foreach (var p in remainingParticipants)
            {
                await _hubContext.Clients.User(p.UserId.ToString())
                    .SendAsync("ParticipantRemoved", conversationId, userId);
            }

            return true;
        }

        public async Task<bool> LeaveConversationAsync(Guid conversationId, Guid currentUserId)
        {
            return await RemoveParticipantAsync(conversationId, currentUserId, currentUserId);
        }

        public async Task<bool> UpdateParticipantRoleAsync(Guid conversationId, Guid currentUserId, Guid userId, string role)
        {
            var isAdmin = await _participantRepo.IsAdminAsync(conversationId, currentUserId);

            if (!isAdmin)
            {
                throw new UnauthorizedAccessException("Only admins can update participant roles.");
            }

            if (role != "admin" && role != "member")
            {
                throw new ArgumentException("Role must be 'admin' or 'member'.");
            }

            var participant = await _participantRepo.GetParticipantAsync(conversationId, userId);

            if (participant == null)
            {
                return false;
            }

            participant.Role = role;
            await _participantRepo.UpdateAsync(participant);

            // Notify all participants
            var allParticipants = await _participantRepo.GetConversationParticipantsAsync(conversationId);
            foreach (var p in allParticipants)
            {
                await _hubContext.Clients.User(p.UserId.ToString())
                    .SendAsync("ParticipantRoleUpdated", conversationId, userId, role);
            }

            return true;
        }

        public async Task<List<ParticipantDto>> GetConversationParticipantsAsync(Guid conversationId, Guid currentUserId)
        {
            if (!await _conversationRepo.IsParticipantAsync(conversationId, currentUserId))
            {
                throw new UnauthorizedAccessException("You are not a participant of this conversation.");
            }

            var participants = await _participantRepo.GetConversationParticipantsAsync(conversationId);

            return _mapper.Map<List<ParticipantDto>>(participants);
        }

        #endregion

        #region Message Management

        public async Task<MessageDto> SendMessageAsync(Guid currentUserId, SendMessageDto dto)
        {
            if (!await _conversationRepo.IsParticipantAsync(dto.ConversationId, currentUserId))
            {
                throw new UnauthorizedAccessException("You are not a participant of this conversation.");
            }

            var message = _mapper.Map<Message>(dto);
            message.SenderId = currentUserId;

            await _messageRepo.CreateAsync(message);

            var messageDto = await MapToMessageDtoAsync(message, currentUserId);

            // Notify all participants via SignalR
            var participants = await _participantRepo.GetConversationParticipantsAsync(dto.ConversationId);
            foreach (var participant in participants.Where(p => p.UserId != currentUserId))
            {
                await _hubContext.Clients.User(participant.UserId.ToString())
                    .SendAsync("ReceiveMessage", messageDto);
            }

            return messageDto;
        }

        public async Task<MessageDto> EditMessageAsync(Guid currentUserId, EditMessageDto dto)
        {
            var message = await _messageRepo.GetByIdAsync(dto.MessageId);

            if (message == null)
            {
                throw new KeyNotFoundException("Message not found.");
            }

            if (message.SenderId != currentUserId)
            {
                throw new UnauthorizedAccessException("You can only edit your own messages.");
            }

            if (message.IsDeleted)
            {
                throw new InvalidOperationException("Cannot edit deleted message.");
            }

            message.MessageContent = dto.MessageContent;
            message.IsEdited = true;
            message.EditedAt = DateTimeOffset.UtcNow;

            await _messageRepo.UpdateAsync(message);

            var messageDto = await MapToMessageDtoAsync(message, currentUserId);

            // Notify all participants
            var participants = await _participantRepo.GetConversationParticipantsAsync(message.ConversationId);
            foreach (var participant in participants)
            {
                await _hubContext.Clients.User(participant.UserId.ToString())
                    .SendAsync("MessageEdited", messageDto);
            }

            return messageDto;
        }

        public async Task<bool> DeleteMessageAsync(Guid messageId, Guid currentUserId)
        {
            var message = await _messageRepo.GetByIdAsync(messageId);

            if (message == null)
            {
                return false;
            }

            if (message.SenderId != currentUserId)
            {
                var isAdmin = await _participantRepo.IsAdminAsync(message.ConversationId, currentUserId);
                if (!isAdmin)
                {
                    throw new UnauthorizedAccessException("You can only delete your own messages or be an admin.");
                }
            }

            await _messageRepo.DeleteAsync(messageId);

            // Notify all participants
            var participants = await _participantRepo.GetConversationParticipantsAsync(message.ConversationId);
            foreach (var participant in participants)
            {
                await _hubContext.Clients.User(participant.UserId.ToString())
                    .SendAsync("MessageDeleted", message.ConversationId, messageId);
            }

            return true;
        }

        public async Task<MessageListDto> GetConversationMessagesAsync(Guid conversationId, Guid currentUserId, int pageNumber = 1, int pageSize = 50)
        {
            if (!await _conversationRepo.IsParticipantAsync(conversationId, currentUserId))
            {
                throw new UnauthorizedAccessException("You are not a participant of this conversation.");
            }

            var messages = await _messageRepo.GetConversationMessagesAsync(conversationId, pageNumber, pageSize);

            var messageDtos = new List<MessageDto>();
            foreach (var message in messages)
            {
                messageDtos.Add(await MapToMessageDtoAsync(message, currentUserId));
            }

            return new MessageListDto
            {
                Messages = messageDtos,
                TotalCount = messageDtos.Count,
                PageNumber = pageNumber,
                PageSize = pageSize,
                HasMore = messageDtos.Count == pageSize
            };
        }

        public async Task<List<MessageDto>> GetNewMessagesAsync(Guid conversationId, Guid currentUserId, DateTimeOffset after)
        {
            if (!await _conversationRepo.IsParticipantAsync(conversationId, currentUserId))
            {
                throw new UnauthorizedAccessException("You are not a participant of this conversation.");
            }

            var messages = await _messageRepo.GetMessagesAfterAsync(conversationId, after, 100);

            var messageDtos = new List<MessageDto>();
            foreach (var message in messages)
            {
                messageDtos.Add(await MapToMessageDtoAsync(message, currentUserId));
            }

            return messageDtos;
        }

        public async Task<bool> MarkMessageAsReadAsync(Guid messageId, Guid currentUserId)
        {
            var message = await _messageRepo.GetByIdAsync(messageId);

            if (message == null)
            {
                return false;
            }

            if (!await _conversationRepo.IsParticipantAsync(message.ConversationId, currentUserId))
            {
                throw new UnauthorizedAccessException("You are not a participant of this conversation.");
            }

            if (message.SenderId == currentUserId)
            {
                return true; // Don't mark own messages as read
            }

            await _readReceiptRepo.MarkAsReadAsync(messageId, currentUserId);

            // Update participant's last read time
            var participant = await _participantRepo.GetParticipantAsync(message.ConversationId, currentUserId);
            if (participant != null)
            {
                participant.LastReadAt = DateTimeOffset.UtcNow;
                await _participantRepo.UpdateAsync(participant);
            }

            // Notify sender
            await _hubContext.Clients.User(message.SenderId.ToString())
                .SendAsync("MessageRead", message.ConversationId, messageId, currentUserId);

            return true;
        }

        public async Task<bool> MarkConversationAsReadAsync(Guid conversationId, Guid currentUserId)
        {
            if (!await _conversationRepo.IsParticipantAsync(conversationId, currentUserId))
            {
                throw new UnauthorizedAccessException("You are not a participant of this conversation.");
            }

            var readAt = DateTimeOffset.UtcNow;
            await _readReceiptRepo.MarkConversationAsReadAsync(conversationId, currentUserId, readAt);

            // Notify all participants
            var participants = await _participantRepo.GetConversationParticipantsAsync(conversationId);
            foreach (var participant in participants.Where(p => p.UserId != currentUserId))
            {
                await _hubContext.Clients.User(participant.UserId.ToString())
                    .SendAsync("ConversationRead", conversationId, currentUserId, readAt);
            }

            return true;
        }

        #endregion

        #region Typing Status

        public async Task UpdateTypingStatusAsync(Guid conversationId, Guid currentUserId, bool isTyping)
        {
            if (!await _conversationRepo.IsParticipantAsync(conversationId, currentUserId))
            {
                throw new UnauthorizedAccessException("You are not a participant of this conversation.");
            }

            if (isTyping)
            {
                var status = new TypingStatus
                {
                    ConversationId = conversationId,
                    UserId = currentUserId,
                    IsTyping = true
                };

                await _typingStatusRepo.UpsertAsync(status);

                // Notify other participants
                var participants = await _participantRepo.GetConversationParticipantsAsync(conversationId);
                foreach (var participant in participants.Where(p => p.UserId != currentUserId))
                {
                    await _hubContext.Clients.User(participant.UserId.ToString())
                        .SendAsync("UserTyping", conversationId, currentUserId, true);
                }
            }
            else
            {
                var status = await _typingStatusRepo.GetStatusAsync(conversationId, currentUserId);
                if (status != null)
                {
                    await _typingStatusRepo.RemoveAsync(status.TypingId);

                    // Notify other participants
                    var participants = await _participantRepo.GetConversationParticipantsAsync(conversationId);
                    foreach (var participant in participants.Where(p => p.UserId != currentUserId))
                    {
                        await _hubContext.Clients.User(participant.UserId.ToString())
                            .SendAsync("UserTyping", conversationId, currentUserId, false);
                    }
                }
            }
        }

        public async Task<List<TypingStatusDto>> GetTypingStatusAsync(Guid conversationId)
        {
            var statuses = await _typingStatusRepo.GetConversationTypingStatusAsync(conversationId);

            return _mapper.Map<List<TypingStatusDto>>(statuses);
        }

        #endregion

        #region Mapping Methods

        private async Task<ConversationDto> MapToConversationDtoAsync(Conversation conversation, Guid currentUserId)
        {
            // Use AutoMapper for base mapping
            var dto = _mapper.Map<ConversationDto>(conversation);

            // Handle complex properties that need additional logic
            var participants = await _participantRepo.GetConversationParticipantsAsync(conversation.ConversationId);
            dto.Participants = _mapper.Map<List<ParticipantDto>>(participants);

            var lastMessage = await _messageRepo.GetLastMessageAsync(conversation.ConversationId);
            dto.LastMessage = lastMessage != null ? await MapToMessageDtoAsync(lastMessage, currentUserId) : null;

            dto.UnreadCount = await _conversationRepo.GetUnreadCountAsync(conversation.ConversationId, currentUserId);

            // For direct conversations, use other user's name and avatar if no custom name set
            if (conversation.ConversationType == "direct" && string.IsNullOrEmpty(conversation.ConversationName))
            {
                var otherParticipant = participants.FirstOrDefault(p => p.UserId != currentUserId);
                if (otherParticipant?.User != null)
                {
                    dto.ConversationName = otherParticipant.User.FullName;
                    dto.ConversationAvatar = otherParticipant.User.UserProfile?.ProfilePictureUrl;
                }
            }

            return dto;
        }

        private async Task<MessageDto> MapToMessageDtoAsync(Message message, Guid currentUserId)
        {
            // Use AutoMapper for base mapping
            var dto = _mapper.Map<MessageDto>(message);

            // Handle properties that need additional queries
            var readReceipts = await _readReceiptRepo.GetMessageReceiptsAsync(message.MessageId);
            dto.ReadReceipts = _mapper.Map<List<ReadReceiptDto>>(readReceipts);

            dto.IsRead = await _readReceiptRepo.IsReadByUserAsync(message.MessageId, currentUserId);

            // Load reply message if exists (avoid circular reference)
            if (message.ReplyToMessageId.HasValue)
            {
                var replyMessage = await _messageRepo.GetByIdWithDetailsAsync(message.ReplyToMessageId.Value);
                if (replyMessage != null)
                {
                    // Map reply message without nested replies to avoid infinite recursion
                    dto.ReplyToMessage = _mapper.Map<MessageDto>(replyMessage);
                    dto.ReplyToMessage.ReplyToMessage = null; // Break recursion
                }
            }

            return dto;
        }

        #endregion
    }
}