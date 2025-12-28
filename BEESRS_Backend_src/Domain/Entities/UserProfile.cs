using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class UserProfile
    {
        [Key]
        public Guid ProfileId { get; set; } = Guid.NewGuid();

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [StringLength(50)]
        public string? HomeCountry { get; set; }

        [StringLength(100)]
        public string? CurrentLocationCity { get; set; }

        [StringLength(50)]
        public string? CurrentLocationCountry { get; set; }

        [StringLength(50)]
        public string Timezone { get; set; } = "UTC+07:00";

        [StringLength(20)]
        public string DateFormat { get; set; } = "MM/dd/yyyy";

        public string? ProfilePictureUrl { get; set; }

        public string Bio { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual User User { get; set; }
    }
}
