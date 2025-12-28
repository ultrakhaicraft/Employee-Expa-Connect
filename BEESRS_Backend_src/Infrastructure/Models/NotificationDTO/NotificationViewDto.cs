using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.NotificationDTO
{
	public record NotificationViewDto
	{
		public Guid NotificationId { get; set; }

		public Guid UserId { get; set; }

		public string? NotificationType { get; set; }

		public string? Title { get; set; }

		public bool IsRead { get; set; } = false;

		public bool IsDismissed { get; set; } = false;

		public DateTimeOffset? ReadAt { get; set; }

		public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

		public DateTimeOffset? ExpiresAt { get; set; }

	}
}
