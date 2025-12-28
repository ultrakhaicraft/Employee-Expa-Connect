using Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class ItineraryShare
    {
        [Key]
        public Guid ShareId { get; set; } = Guid.NewGuid();

        [ForeignKey("Itinerary")]
        public Guid ItineraryId { get; set; }

        [ForeignKey("SharedWithUser")]
        public Guid? SharedWithUserId { get; set; }

        [StringLength(100)]
        public string SharedWithEmail { get; set; }

        [StringLength(20)]
        public string PermissionLevel { get; set; } = SharePermissionLevel.View.ToString();

        public DateTimeOffset? ExpiresAt { get; set; }

        public DateTimeOffset SharedAt { get; set; } = DateTimeOffset.Now;

        [ForeignKey("SharedByUser")]
        public Guid SharedBy { get; set; }

        // Navigation Properties
        public virtual Itinerary Itinerary { get; set; }
        public virtual User SharedWithUser { get; set; }
        public virtual User SharedByUser { get; set; }
    }
}
