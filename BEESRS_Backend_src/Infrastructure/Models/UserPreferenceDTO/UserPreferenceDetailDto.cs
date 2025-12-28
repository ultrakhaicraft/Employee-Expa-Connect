using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserPreferenceDTO
{
	public record UserPreferenceDetailDto
	{
		
		public Guid PreferenceId { get; set; }
		public Guid UserId { get; set; }
		public string? CuisinePreferences { get; set; }
		public int? BudgetPreference { get; set; }
		public int DistanceRadius { get; set; }
		public DateTimeOffset CreatedAt { get; set; } 
		public DateTimeOffset UpdatedAt { get; set; } 
	}
}
