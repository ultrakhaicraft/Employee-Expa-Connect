using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class UserPreference
    {
        [Key]
        public Guid PreferenceId { get; set; } = Guid.NewGuid();

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        public string CuisinePreferences { get; set; } // JSON "{\"preferences\":[\"Vietnamese\",\"Asian\",\"International\"]}"

        [Range(1, 5)]
        public int? BudgetPreference { get; set; }

        public int DistanceRadius { get; set; } = 5000;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual User User { get; set; }
    }
}
