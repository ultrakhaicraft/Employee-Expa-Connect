using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class ReviewVote
    {
        [Key]
        public Guid VoteId { get; set; } = Guid.NewGuid();

        [ForeignKey("PlaceReview")]
        public Guid ReviewId { get; set; }

        [ForeignKey("User")]
        public Guid UserId { get; set; }

        public bool IsHelpful { get; set; }

        public DateTimeOffset VotedAt { get; set; } = DateTimeOffset.Now;

        // Navigation Properties
        public virtual PlaceReview PlaceReview { get; set; }
        public virtual User User { get; set; }
    }
}
