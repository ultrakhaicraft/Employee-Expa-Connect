using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserPreferenceDTO
{
	public class UserPreferenceCreateDto
	{
		[Required]
		public string? CuisinePreferences { get; set; }
		[Range(1, 5)]
		public int? BudgetPreference { get; set; }
		public int DistanceRadius { get; set; } = 5000;

	}
}
