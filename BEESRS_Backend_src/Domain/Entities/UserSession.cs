using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class UserSession
    {
        [Key]
        public Guid SessionId { get; set; } = Guid.NewGuid();

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Required]
        [StringLength(255)]
        public string TokenHash { get; set; }

        [StringLength(255)]
        public string RefreshTokenHash { get; set; }

        public string? DeviceInfo { get; set; } // JSON

        [StringLength(45)]
        public string IpAddress { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset ExpiresAt { get; set; }

        public DateTimeOffset LastActivityAt { get; set; } = DateTimeOffset.Now;

        // Navigation Properties
        public virtual User User { get; set; }
    }
}
