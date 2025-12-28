using NetTopologySuite.Geometries;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class SearchHistory
    {
        [Key]
        public Guid SearchId { get; set; } = Guid.NewGuid();

        [ForeignKey("User")]
        public Guid? UserId { get; set; }

        [Required]
        public string SearchQuery { get; set; }

        [Column(TypeName = "geography")]
        public Point SearchLocation { get; set; }

        [ForeignKey("ClickedPlace")]
        public Guid? ClickedPlaceId { get; set; }

        public DateTimeOffset SearchTimestamp { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual User User { get; set; }
        public virtual Place ClickedPlace { get; set; }
    }
}
