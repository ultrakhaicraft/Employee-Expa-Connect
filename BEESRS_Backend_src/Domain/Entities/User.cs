using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class User
    {
        [Key]
        public Guid UserId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(20)]
        public string EmployeeId { get; set; }

        [ForeignKey("Role")]
        public int RoleId { get; set; }

        [Required]
        [StringLength(100)]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [StringLength(255)]
        public string PasswordHash { get; set; }

        [Required]
        [StringLength(50)]
        public string FirstName { get; set; }

        [Required]
        [StringLength(50)]
        public string LastName { get; set; }

        [ForeignKey("CurrentBranch")]
        public Guid CurrentBranchId { get; set; }

        [StringLength(100)]
        public string JobTitle { get; set; }

        [StringLength(20)]
        public string PhoneNumber { get; set; }

        public bool IsActive { get; set; } = true;

        public bool EmailVerified { get; set; } = false;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset? LastLoginAt { get; set; }

        public int FailedLoginAttempts { get; set; } = 0;

        // Navigation Properties
        public virtual Branch CurrentBranch { get; set; }
        public virtual Role Role { get; set; }
        public virtual UserProfile UserProfile { get; set; }
        public virtual UserPreference UserPreferences { get; set; }
        public virtual ICollection<UserSession> UserSessions { get; set; } = new List<UserSession>();
        public virtual ICollection<PasswordResetToken> PasswordResetTokens { get; set; } = new List<PasswordResetToken>();
        public virtual ICollection<Place> CreatedPlaces { get; set; } = new List<Place>();
        public virtual ICollection<PlaceImage> PlaceImages { get; set; } = new List<PlaceImage>();
        public virtual ICollection<PlaceReview> PlaceReviews { get; set; } = new List<PlaceReview>();
        public virtual ICollection<PlaceReview> ModeratedReviews { get; set; } = new List<PlaceReview>();
        public virtual ICollection<ReviewVote> ReviewVotes { get; set; } = new List<ReviewVote>();
        public virtual ICollection<Event> OrganizedEvents { get; set; } = new List<Event>();
        public virtual ICollection<EventParticipant> EventParticipations { get; set; } = new List<EventParticipant>();
        public virtual ICollection<EventVote> EventVotes { get; set; } = new List<EventVote>();
        public virtual ICollection<Itinerary> Itineraries { get; set; } = new List<Itinerary>();
        public virtual ICollection<ChatConversation> ChatConversations { get; set; } = new List<ChatConversation>();
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
        public virtual ICollection<Friendship> FriendRequestsSent { get; set; } = new List<Friendship>();
        public virtual ICollection<Friendship> FriendRequestsReceived { get; set; } = new List<Friendship>();
        public virtual ICollection<PlaceVote> PlaceVotes { get; set; } = new List<PlaceVote>();
        [NotMapped]
        public string FullName => $"{FirstName} {LastName}";
    }
}
