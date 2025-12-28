using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class UserLocation
    {
        [Key]
        public Guid LocationId { get; set; } = Guid.NewGuid();

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,8)")]
        public decimal Latitude { get; set; }

        [Required]
        [Column(TypeName = "decimal(11,8)")]
        public decimal Longitude { get; set; }

        [StringLength(200)]
        public string LocationName { get; set; }

        [StringLength(50)]
        public string LocationType { get; set; }

        [Column(TypeName = "decimal(8,2)")]
        public decimal? AccuracyMeters { get; set; }

        public DateTimeOffset RecordedAt { get; set; } = DateTimeOffset.Now;

        public bool IsPrimary { get; set; } = false;

        // Navigation Properties
        public virtual User User { get; set; }
    }
}
