using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Notification
    {
        [Key]
        public Guid NotificationId { get; set; } = Guid.NewGuid();

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string NotificationType { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [Required]
        public string Message { get; set; }

        [StringLength(50)]
        public string ActionType { get; set; }

        public string ActionData { get; set; } // JSON

        public string DeepLinkUrl { get; set; }

        public bool IsRead { get; set; } = false;

        public bool IsDismissed { get; set; } = false;

        public DateTimeOffset? ReadAt { get; set; }

        public string DeliveryChannels { get; set; } // JSON

        public DateTimeOffset? EmailSentAt { get; set; }

        public DateTimeOffset? PushSentAt { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset? ExpiresAt { get; set; }

        // Navigation Properties
        public virtual User User { get; set; }
    }
}
