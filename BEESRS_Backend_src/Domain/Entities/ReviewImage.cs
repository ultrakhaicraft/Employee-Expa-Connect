using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class ReviewImage
    {
        [Key]
        public Guid ImageId { get; set; } = Guid.NewGuid();

        [ForeignKey("PlaceReview")]
        public Guid ReviewId { get; set; }

        [Required]
        public string ImageUrl { get; set; }

        public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual PlaceReview PlaceReview { get; set; }
    }
}
