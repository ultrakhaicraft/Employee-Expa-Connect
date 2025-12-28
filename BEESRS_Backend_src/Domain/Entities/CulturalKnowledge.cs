using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class CulturalKnowledge
    {
        [Key]
        public Guid KnowledgeId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(3)]
        public string CountryCode { get; set; }

        [Required]
        [StringLength(50)]
        public string Category { get; set; }

        [Required]
        [StringLength(100)]
        public string Topic { get; set; }

        [Required]
        public string Content { get; set; }

        public string Tags { get; set; } // JSON

        [Column(TypeName = "decimal(3,2)")]
        public decimal ConfidenceLevel { get; set; } = 1.00m;

        public string SourceUrl { get; set; }

        public bool IsVerified { get; set; } = false;

        [ForeignKey("VerifiedByUser")]
        public Guid? VerifiedBy { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.Now;

        // Navigation Properties
        public virtual User VerifiedByUser { get; set; }
    }

}
