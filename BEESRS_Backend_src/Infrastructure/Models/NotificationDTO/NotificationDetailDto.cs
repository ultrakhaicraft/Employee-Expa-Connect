using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.NotificationDTO
{
	public record NotificationDetailDto
	{
		public Guid NotificationId { get; set; }

		public Guid UserId { get; set; }

		public string? NotificationType { get; set; }

		public string? Title { get; set; }

		public string? Message { get; set; }

		public string? ActionType { get; set; }

		public string? ActionData { get; set; } // JSON

		public string? DeepLinkUrl { get; set; }

		public bool IsRead { get; set; } = false;

		public bool IsDismissed { get; set; } = false;

		public DateTimeOffset? ReadAt { get; set; }

		public string? DeliveryChannels { get; set; } // JSON

		public DateTimeOffset? EmailSentAt { get; set; }

		public DateTimeOffset? PushSentAt { get; set; }

		public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

		public DateTimeOffset? ExpiresAt { get; set; }
	}
}
