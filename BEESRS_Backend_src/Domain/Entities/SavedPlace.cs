using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class SavedPlace
    {
        [Key]
        public Guid SavedId { get; set; } = Guid.NewGuid();

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        [ForeignKey("Place")]
        public Guid PlaceId { get; set; }

        public DateTimeOffset SavedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual User User { get; set; }
        public virtual Place Place { get; set; }
    }
}
