using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class PlaceTagAssignment
    {
        [Key, Column(Order = 0)]
        [ForeignKey("Place")]
        public Guid PlaceId { get; set; }

        [Key, Column(Order = 1)]
        [ForeignKey("PlaceTag")]
        public int TagId { get; set; }

        [ForeignKey("AssignedByUser")]
        public Guid? AssignedBy { get; set; }

        [Column(TypeName = "decimal(3,2)")]
        public decimal ConfidenceScore { get; set; } = 1.00m;

        public DateTimeOffset AssignedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual Place Place { get; set; }
        public virtual PlaceTag PlaceTag { get; set; }
        public virtual User AssignedByUser { get; set; }
    }
}
