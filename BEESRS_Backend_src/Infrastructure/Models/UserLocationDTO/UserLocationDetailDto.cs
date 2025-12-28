using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserLocationDTO
{
	public record UserLocationDetailDto
	{
		public Guid LocationId { get; set; } 
		public Guid UserId { get; set; }
		public decimal Latitude { get; set; }
		public decimal Longitude { get; set; }
		public string LocationName { get; set; }
		public string LocationType { get; set; }
		public decimal? AccuracyMeters { get; set; }
		public DateTimeOffset RecordedAt { get; set; } 
		public bool IsPrimary { get; set; } = false;
	}
}
