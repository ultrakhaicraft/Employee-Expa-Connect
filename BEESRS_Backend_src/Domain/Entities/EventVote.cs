using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class EventVote
    {
        [Key]
        public Guid VoteId { get; set; } = Guid.NewGuid();

        [ForeignKey("Event")]
        public Guid EventId { get; set; }

        [ForeignKey("EventPlaceOption")]
        public Guid OptionId { get; set; }

        [ForeignKey("Voter")]
        public Guid VoterId { get; set; }

        public int? VoteValue { get; set; } // -1 (downvote), 0 (neutral), 1-5 (upvote with rating)

        public string VoteComment { get; set; }

        public DateTimeOffset VotedAt { get; set; } = DateTimeOffset.Now;

        // Navigation Properties
        public virtual Event Event { get; set; }
        public virtual EventPlaceOption EventPlaceOption { get; set; }
        public virtual User Voter { get; set; }
    }
}
