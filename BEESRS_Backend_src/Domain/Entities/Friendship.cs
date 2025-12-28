using Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Friendship
    {
        [Key]
        public Guid FriendshipId { get; set; } = Guid.NewGuid();

        [Required]
        [ForeignKey("Requested")]
        public Guid RequestedId { get; set; }

        [Required]
        [ForeignKey("Addressee")]
        public Guid AddresseeId { get; set; }

        public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        public virtual User Requested { get; set; }
        public virtual User Addressee { get; set; }
    }
}
