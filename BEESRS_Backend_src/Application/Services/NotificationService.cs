using Application.Hubs;
using Application.Interfaces;
using AutoMapper;
using Azure.Core;
using CloudinaryDotNet.Actions;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.NotificationDTO;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services
{
	public class NotificationService : INotificationService
	{
		private readonly IHubContext<GeneralHub> _hubContext;
		private readonly INotificationRepository _notificationRepository;
		private readonly IMapper _mapper;

		public NotificationService(IHubContext<GeneralHub> hubContext, INotificationRepository notificationRepository, IMapper mapper)
		{
			_hubContext = hubContext;
			_notificationRepository = notificationRepository;
			_mapper = mapper;
		}


		public async Task<ApiResponse<Guid>> NotifyAndSaveNotification(GeneralNotificationMessage messageDto, CreateNotificationDto createDto, BoardcastMode notifyMode)
		{
			switch (notifyMode)
			{
				case BoardcastMode.User:
					await BoardcastToSpecificUserByIdAsync(messageDto);
					break;

				case BoardcastMode.RoleGroup:
					await BoardcastRoleGroupAsync(messageDto); 
					break;

				case BoardcastMode.All:
					await BroadcastAllAsync(messageDto);
					break;

				default:
					return ApiResponse<Guid>.ErrorResultWithCode("Failed to boardcast notification",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							 "Mode is invalid, please try again and set the right Notify Mode"
						}
					);

			}

			return await CreateNotificationAsync(createDto);
		}


		#region General Notification HUB

		public async Task BoardcastRoleGroupAsync(GeneralNotificationMessage messageDto)
		{
			await _hubContext.Clients.Group(messageDto.TargetRole).SendAsync("ReceiveNotification", messageDto);
		}

		public async Task BroadcastAllAsync(GeneralNotificationMessage messageDto)
		{
			await _hubContext.Clients.All.SendAsync("ReceiveNotification", messageDto);
		}

		public async Task BoardcastToSpecificUserByIdAsync(GeneralNotificationMessage messageDto)
		{
			await _hubContext.Clients.User(messageDto.TargetUserId.ToString()).SendAsync("ReceiveNotification", messageDto);
		}

		#endregion


		#region Notification Data CRUD

		public async Task<ApiResponse<Guid>> CreateNotificationAsync(CreateNotificationDto request)
		{
			try
			{
				var notification = _mapper.Map<Domain.Entities.Notification>(request);

				var resultNotification = await _notificationRepository.CreateAsync(notification);

				if (resultNotification == null)
				{
					
					return ApiResponse<Guid>.ErrorResultWithCode("Failed to create notification",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							 "Unable to save notification"
						}
					);
				}

				return ApiResponse<Guid>.SuccessResult(resultNotification.NotificationId,
					message: "Create Itinerary successfully");
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<Guid>.ErrorResult("Failed to create notification due to exception", new List<string>()
						{
							e.Message ?? "Exception error caught creating notification"
						}
				);
			}
		}

		public async Task<ApiResponse<bool>> DeleteNotificationAsync(Guid notificationId, Guid userId)
		{
			try
			{
				var result = await _notificationRepository.DeleteAsync(notificationId);

				if (!result)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to delete notification",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							"Unable to do delete operation in database"
						}
					);
				}

				return ApiResponse<bool>.SuccessResult(true, message: "Notification Itinerary successfully");
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResult("Failed to delete notification due to exception", new List<string>()
						{
							e.Message ?? "Exception error caught deleting notification"
						}
				);
			}
		}

		public async Task<ApiResponse<bool>> MarkNotificationAsReadAsync(Guid notificationId)
		{
			try
			{
				var existingNotification = await _notificationRepository.GetByIdAsync(notificationId);

				if (existingNotification == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to marking notification as read",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"notification not found in database"
						}
				);
				}

				//Applying request changes to existing entity
				existingNotification.IsRead = true;
				existingNotification.ReadAt = DateTimeOffset.UtcNow;

				//Update the entity to database
				await _notificationRepository.UpdateAsync(existingNotification);

				

				return ApiResponse<bool>.SuccessResult(true, message: "Mark Itinerary as Read successfully");
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResult("Failed to marking notification as read due to exception", new List<string>()
						{
							e.Message ?? "Exception error caught marking notification as read"
						}
				);
			}
		}

		public async Task<ApiResponse<bool>> MarkNotificationAsDismissedAsync(Guid notificationId)
		{
			try
			{
				var existingNotification = await _notificationRepository.GetByIdAsync(notificationId);

				if (existingNotification == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to mark notification as dismissed",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"notification not found in database"
						}
				);
				}

				//Applying request changes to existing entity
				existingNotification.IsDismissed = true;
				

				//Update the entity to database
				await _notificationRepository.UpdateAsync(existingNotification);



				return ApiResponse<bool>.SuccessResult(true, message: "Mark Itinerary as Dismissed successfully");
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<bool>.ErrorResult("Failed to mark notification as dismissed due to exception", new List<string>()
						{
							e.Message ?? "Exception error caught marking notification as dimissed"
						}
				);
			}
		}

		public async Task<ApiResponse<Infrastructure.Models.Common.PagedResult<NotificationViewDto>>> 
			GetAllNotificationViewAsync(Guid userId, PagedRequest request)
		{
			
			try
			{
				var pagedData = await _notificationRepository.GetAllByUserIdAsync(userId, request);

				if (pagedData == null)
				{
					return ApiResponse< Infrastructure.Models.Common.PagedResult<NotificationViewDto>>.ErrorResultWithCode("Failed to get Notification detail",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						 new List<string>()
						{
							"Notifications paged not found in database"
						}
					);
				}

				var mapped = pagedData.Items.Select(u => _mapper.Map<NotificationViewDto>(u)).ToList();
				var dtoData = new Infrastructure.Models.Common.PagedResult<NotificationViewDto>(pagedData.Page, pagedData.PageSize, pagedData.TotalItems, mapped);

				return ApiResponse<Infrastructure.Models.Common.PagedResult<NotificationViewDto>>.SuccessResult(dtoData, "Fetched itineraries successfully");

			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<Infrastructure.Models.Common.PagedResult<NotificationViewDto>>
					.ErrorResult("Failed to get notification due to exception", new List<string>()
						{
							e.Message ?? "Exception error caught getting notification"
						}
				);
			}
		}

		public async Task<ApiResponse<NotificationDetailDto>> GetNotificationDetailByIdAsync(Guid notificationId)
		{
			try
			{
				var result = await _notificationRepository.GetByIdAsync(notificationId);

				if (result == null)
				{
					return ApiResponse<NotificationDetailDto>.ErrorResultWithCode("Failed to get Notification detail",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						 new List<string>()
						{
							"Notification not found in database"
						}
					);
				}


				var dto = _mapper.Map<NotificationDetailDto>(result);

				return ApiResponse<NotificationDetailDto>.SuccessResult(dto, message: "Get Notification successfully");
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<NotificationDetailDto>.ErrorResult("Failed to get notification detail due to exception", new List<string>()
						{
							e.Message ?? "Exception error caught getting notification detail"
						}
				);
			}
		}

		public async Task<ApiResponse<int>> GetUnreadCountAsync(Guid userId)
		{
			try
			{
				var count = await _notificationRepository.GetUnreadCountAsync(userId);
				return ApiResponse<int>.SuccessResult(count, message: "Get unread count successfully");
			}
			catch (Exception e)
			{
				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return ApiResponse<int>.ErrorResult("Failed to get unread count due to exception", new List<string>()
					{
						e.Message ?? "Exception error caught getting unread count"
					}
				);
			}
		}

		#endregion

	}
}
