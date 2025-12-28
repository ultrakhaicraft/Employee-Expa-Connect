using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceDTO
{
    public record SearchFilter
    {
        [Range(1, 5)]
        public int? PriceLevel { get; set; }

        [Range(0.00, 9.99)]
        public decimal MinAverageRating { get; set; } = 0.00m;

        public bool openNow { get; set; } = false;

        public int? CategoryId { get; set; }
    }

    public record PlaceBoundingBoxSearchFilter : SearchFilter
    {
        [Required]
        public double MinLatitude { get; set; }

        [Required]
        public double MaxLatitude { get; set; }

        [Required]
        public double MinLongitude { get; set; }

        [Required]
        public double MaxLongitude { get; set; }
    }

    public class SearchPlaceRequest
    {
        public string? Name { get; set; }
        public double UserLat { get; set; }
        public double UserLng { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

}
