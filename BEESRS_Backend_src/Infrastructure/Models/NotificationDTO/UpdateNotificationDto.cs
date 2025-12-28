using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.NotificationDTO
{
	public record UpdateNotificationDto
	{
		public Guid UserId { get; set; }

		public string? NotificationType { get; set; }

		public string? Title { get; set; }

		public string? Message { get; set; }

		public string? ActionType { get; set; }

		public string? ActionData { get; set; } // JSON

		public string? DeepLinkUrl { get; set; }

		public bool IsRead { get; set; } = false;

		public bool IsDismissed { get; set; } = false;

		public string? DeliveryChannels { get; set; } // JSON
	}
}
