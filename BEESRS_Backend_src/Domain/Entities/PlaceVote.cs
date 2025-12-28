using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class PlaceVote
    {
        [Key]
        public Guid PlaceVoteId { get; set; } = Guid.NewGuid();

        [ForeignKey("Place")]
        public Guid PlaceId { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        public bool IsHelpful { get; set; }

        public DateTimeOffset VotedAt { get; set; } = DateTimeOffset.UtcNow;

        // Navigation Properties
        public virtual Place Place { get; set; }
        public virtual User User { get; set; }
    }
}
