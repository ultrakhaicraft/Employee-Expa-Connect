using Domain.Enums;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceReview
{
    public record CreatePlaceReviewDTO
    {
        [Required]
        public Guid PlaceId { get; set; }

        [Required]
        [Range(1, 5)]
        public int OverallRating { get; set; }

        [Range(1, 5)]
        public int? FoodQualityRating { get; set; }

        [Range(1, 5)]
        public int? ServiceRating { get; set; }

        [Range(1, 5)]
        public int? AtmosphereRating { get; set; }

        [Required]
        [Range(1, 5)]
        public int PriceLevelRating { get; set; }

        [Required]
        [MinLength(20)]
        public string ReviewText { get; set; }

        public DateTime? VisitDate { get; set; }

        [StringLength(50)]
        public string? VisitType { get; set; }

        public List<string> ReviewImagesList { get; set; } = new List<string>();
    }

    public record UpdatePlaceReviewDTO : CreatePlaceReviewDTO
    {
        [Required]
        public Guid ReviewId { get; set; }
    }
}
