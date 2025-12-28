using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceDTO
{
	public record PlaceListItemDto
	{
		public Guid PlaceId { get; set; }
		public string Name { get; set; } = string.Empty;
		public int? CategoryId { get; set; }
		public string? CategoryName { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public int? PriceLevel { get; set; }
		public string VerificationStatus { get; set; }
		public decimal AverageRating { get; set; } = 0.00m;
	}

	public record PlaceList
	{
		public Guid PlaceId { get; set; }
        public string Name { get; set; }
        public string CategoryName { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}
