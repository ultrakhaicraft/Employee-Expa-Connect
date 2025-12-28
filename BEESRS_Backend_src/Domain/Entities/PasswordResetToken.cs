using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class PasswordResetToken
    {
        [Key]
        public Guid TokenId { get; set; } = Guid.NewGuid();

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Required]
        [StringLength(255)]
        public string TokenHash { get; set; }

        public DateTimeOffset ExpiresAt { get; set; }

        public bool IsUsed { get; set; } = false;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

        // Navigation Properties
        public virtual User User { get; set; }
    }
}
