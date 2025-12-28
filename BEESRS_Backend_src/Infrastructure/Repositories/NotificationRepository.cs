using Azure.Core;
using Domain.Entities;
using Infrastructure.Helper;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
	public class NotificationRepository : INotificationRepository
	{
		private readonly BEESRSDBContext _context;

		public NotificationRepository(BEESRSDBContext context)
		{
			_context = context;
		}

		public async Task<Notification> CreateAsync(Notification notification)
		{
			_context.Notifications.Add(notification);
			await _context.SaveChangesAsync();
			return notification;
		}

		public async Task<bool> DeleteAsync(Guid notificationId)
		{
			

			var notification = await _context.Notifications.FindAsync(notificationId);
			if (notification == null)
				return false;

			_context.Notifications.Remove(notification);
			var result = await _context.SaveChangesAsync();
			return result > 0;
		}

		public async Task<Models.Common.PagedResult<Notification>> GetAllByUserIdAsync(Guid userId, PagedRequest request)
		{
			var query =  _context.Notifications
				.AsNoTracking()
				.Where(n => n.UserId == userId)
				.OrderByDescending(n => n.CreatedAt);
				

			// Pagination
			var pagedResult = await PageConverter<Notification>.ToPagedResultAsync(
			request.Page, request.PageSize, await query.CountAsync(), query);

			return pagedResult;

		}

		public async Task<Notification?> GetByIdAsync(Guid notificationId)
		{
			return await _context.Notifications
				.AsNoTracking()
				.FirstOrDefaultAsync(n => n.NotificationId == notificationId);
		}

		public async Task<bool> UpdateAsync(Notification notification)
		{
			
			_context.Notifications.Update(notification);
			var result = await _context.SaveChangesAsync();
			return result > 0;
		}

		public async Task<int> GetUnreadCountAsync(Guid userId)
		{
			return await _context.Notifications
				.AsNoTracking()
				.CountAsync(n => n.UserId == userId && !n.IsRead && !n.IsDismissed);
		}
	}
}
