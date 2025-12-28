using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserPreferenceDTO
{
	public record UserPreferenceUpdateDto
	{
        public string CuisinePreferences { get; set; } = string.Empty; // JSON "{\"preferences\":[\"Vietnamese\",\"Asian\",\"International\"]}"

        [Range(1, 5)]
        public int? BudgetPreference { get; set; }

        public int DistanceRadius { get; set; } = 5000;
    }
}
