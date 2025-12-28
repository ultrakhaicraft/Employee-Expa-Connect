using Domain.Enums;
using Infrastructure.Models.Common;
using Infrastructure.Models.NotificationDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
	public interface INotificationService
	{
		Task<ApiResponse<Guid>> NotifyAndSaveNotification
			(GeneralNotificationMessage messageDto, CreateNotificationDto createDto, BoardcastMode notifyMode);
		Task BroadcastAllAsync(GeneralNotificationMessage dto);
		Task BoardcastRoleGroupAsync(GeneralNotificationMessage dto);
		Task BoardcastToSpecificUserByIdAsync(GeneralNotificationMessage dto);

		Task<ApiResponse<Guid>> CreateNotificationAsync(CreateNotificationDto request);
		Task<ApiResponse<bool>> DeleteNotificationAsync(Guid notificationId, Guid userId);
		Task<ApiResponse<bool>> MarkNotificationAsReadAsync(Guid notificationId);
		Task<ApiResponse<bool>> MarkNotificationAsDismissedAsync(Guid notificationId);

		Task<ApiResponse<PagedResult<NotificationViewDto>>> GetAllNotificationViewAsync(Guid userId, PagedRequest request);
		Task<ApiResponse<NotificationDetailDto>> GetNotificationDetailByIdAsync(Guid notificationId);
		Task<ApiResponse<int>> GetUnreadCountAsync(Guid userId);
	}
}
