using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class PlaceHour
    {
        [Key]
        public Guid HoursId { get; set; } = Guid.NewGuid();

        [ForeignKey("Place")]
        public Guid PlaceId { get; set; }

        [Range(0, 6)]
        public int DayOfWeek { get; set; } // 0=Sunday

        public TimeSpan? OpenTime { get; set; }

        public TimeSpan? CloseTime { get; set; }

        public bool IsClosed { get; set; } = false;

        public bool Is24Hours { get; set; } = false;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.Now;

        // Navigation Properties
        public virtual Place Place { get; set; }
    }
}
