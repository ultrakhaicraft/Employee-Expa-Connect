using Domain.Entities;
using Infrastructure.Models.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
	public interface INotificationRepository
	{
		Task<Notification> CreateAsync(Notification notification);
		Task<PagedResult<Notification>> GetAllByUserIdAsync(Guid userId, PagedRequest request);
		Task<Notification?> GetByIdAsync(Guid notificationId);
		Task<bool> UpdateAsync(Notification notification);
		Task<bool> DeleteAsync(Guid notificationId);
		Task<int> GetUnreadCountAsync(Guid userId);
	}
}
