using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserLocationDTO
{
	public record UserLocationViewDto
	{
		public Guid LocationId { get; set; }
		public Guid UserId { get; set; }
		public string LocationName { get; set; }
		public string LocationType { get; set; }
		public decimal? AccuracyMeters { get; set; }
		public DateTimeOffset RecordedAt { get; set; } 
	}
}
