using NetTopologySuite.Geometries;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceDTO
{
    public record CreateSearchHistory
    {
        [StringLength(255)]
        [Required]
        public string SearchQuery { get; set; }

        [Required]
        public double? Latitude { get; set; }

        [Required]
        public double? Longitude { get; set; }

        public Guid? ClickedPlaceId { get; set; } = null;
    }

    public record SearchHistoryDTO
    {
        public Guid SearchId { get; set; }
        public string SearchQuery { get; set; }
        public Guid? ClickedPlaceId { get; set; }
        public DateTimeOffset SearchTimestamp { get; set; }
    }
}
