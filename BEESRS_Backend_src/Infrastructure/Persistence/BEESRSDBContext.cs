using Domain.Entities;
using Infrastructure.Persistence.Configurations;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Persistence
{
    public class BEESRSDBContext : DbContext
    {
        public BEESRSDBContext(DbContextOptions<BEESRSDBContext> options) : base(options)
        { }
        public DbSet<Role> Roles { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<UserPreference> UserPreferences { get; set; }
        public DbSet<UserSession> UserSessions { get; set; }
        public DbSet<PasswordResetToken> PasswordResetTokens { get; set; }
        public DbSet<PlaceCategory> PlaceCategories { get; set; }
        public DbSet<Place> Places { get; set; }
        //public DbSet<PlaceHour> PlaceHours { get; set; }
        public DbSet<PlaceImage> PlaceImages { get; set; }
        public DbSet<PlaceTag> PlaceTags { get; set; }
        public DbSet<PlaceTagAssignment> PlaceTagAssignments { get; set; }
        public DbSet<PlaceReview> PlaceReviews { get; set; }
        public DbSet<ReviewImage> ReviewImages { get; set; }
        public DbSet<ReviewVote> ReviewVotes { get; set; }
        public DbSet<SearchHistory> SearchHistories { get; set; }
        public DbSet<SavedPlace> SavedPlaces { get; set; }
        public DbSet<UserLocation> UserLocations { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<EventParticipant> EventParticipants { get; set; }
        public DbSet<EventPlaceOption> EventPlaceOptions { get; set; }
        public DbSet<EventVote> EventVotes { get; set; }
        public DbSet<EventAuditLog> EventAuditLogs { get; set; }
        public DbSet<EventShare> EventShares { get; set; }
        public DbSet<EventCheckIn> EventCheckIns { get; set; }
        public DbSet<EventFeedback> EventFeedbacks { get; set; }
        public DbSet<EventTemplate> EventTemplates { get; set; }
        public DbSet<RecurringEvent> RecurringEvents { get; set; }
        public DbSet<EventWaitlist> EventWaitlists { get; set; }
        public DbSet<Itinerary> Itineraries { get; set; }
        public DbSet<ItineraryItem> ItineraryItems { get; set; }
        public DbSet<ItineraryShare> ItineraryShares { get; set; }
        public DbSet<ChatConversation> ChatConversations { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<CulturalKnowledge> CulturalKnowledge { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<EmailQueue> EmailQueue { get; set; }
        public DbSet<Branch> Branches { get; set; }
        public DbSet<PlaceReviewReport> PlaceReviewReports { get; set; }
        public DbSet<Friendship> Friendships { get; set; }
        public DbSet<PlaceVote> PlaceVotes { get; set; }
        public DbSet<Conversation> Conversations { get; set; }
        public DbSet<ConversationParticipant> ConversationParticipants { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<MessageReadReceipt> MessageReadReceipts { get; set; }
        public DbSet<TypingStatus> TypingStatuses { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<City> Cities { get; set; }
        public DbSet<PlaceReport> PlaceReports { get; set; }

        public DbSet<Employee> Employees => Set<Employee>();
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // =============================================
            // I. TABLE NAMING CONFIGURATION
            // =============================================

            //Temporary adjust the data field to match with the database columns, until it fixed

            // User Management Tables
            modelBuilder.Entity<Role>().ToTable("role");
            modelBuilder.Entity<User>().ToTable("users");
            modelBuilder.Entity<UserProfile>().ToTable("user_profiles");
            modelBuilder.Entity<UserPreference>().ToTable("user_preferences");
            modelBuilder.Entity<UserSession>().ToTable("user_sessions");
            modelBuilder.Entity<PasswordResetToken>().ToTable("password_reset_tokens");

            // Place Management Tables
            modelBuilder.Entity<PlaceCategory>().ToTable("place_categories");
            modelBuilder.Entity<Place>().ToTable("places");
            //modelBuilder.Entity<PlaceHour>().ToTable("place_hours");
            modelBuilder.Entity<PlaceImage>().ToTable("place_images");
            modelBuilder.Entity<PlaceTag>().ToTable("place_tags");
            modelBuilder.Entity<PlaceTagAssignment>().ToTable("place_tag_assignments");

            // Review Tables
            modelBuilder.Entity<PlaceReview>().ToTable("place_reviews");
            modelBuilder.Entity<ReviewImage>().ToTable("review_images");
            modelBuilder.Entity<ReviewVote>().ToTable("review_votes");

            // Search & Location Tables
            modelBuilder.Entity<SearchHistory>().ToTable("search_history");
            modelBuilder.Entity<SavedPlace>().ToTable("saved_places");
            modelBuilder.Entity<UserLocation>().ToTable("user_locations");

            // Event Tables
            modelBuilder.Entity<Event>().ToTable("events");
            modelBuilder.Entity<EventParticipant>().ToTable("event_participants");
            modelBuilder.Entity<EventPlaceOption>().ToTable("event_place_options");
            modelBuilder.Entity<EventVote>().ToTable("event_votes");
            modelBuilder.Entity<EventShare>().ToTable("event_shares");
            modelBuilder.Entity<EventCheckIn>().ToTable("event_check_ins");
            modelBuilder.Entity<EventFeedback>().ToTable("event_feedbacks");
            modelBuilder.Entity<EventTemplate>().ToTable("event_templates");
            modelBuilder.Entity<RecurringEvent>().ToTable("recurring_events");
            modelBuilder.Entity<EventWaitlist>().ToTable("event_waitlists");

            // Itinerary Tables
            modelBuilder.Entity<Itinerary>().ToTable("itineraries");
            modelBuilder.Entity<ItineraryItem>().ToTable("itinerary_items");
            modelBuilder.Entity<ItineraryShare>().ToTable("itinerary_shares");

            // Chat & Knowledge Tables
            modelBuilder.Entity<CulturalKnowledge>().ToTable("cultural_knowledge");

            // Notification Tables
            modelBuilder.Entity<Notification>().ToTable("notifications");
            modelBuilder.Entity<EmailQueue>().ToTable("email_queue");

            // =============================================
            // II. PRIMARY KEYS & IDENTITY CONFIGURATION
            // =============================================
            modelBuilder.Entity<Employee>()
    .HasKey(e => new { e.EmployeeId, e.EmployeeCode }); // PK tổng hợp

            // Nếu muốn chuẩn hóa dữ liệu (khuyến nghị):
            modelBuilder.Entity<Employee>()
                .Property(e => e.EmployeeId).HasMaxLength(20).IsRequired();

            modelBuilder.Entity<Employee>()
                .Property(e => e.EmployeeCode).HasMaxLength(64).IsRequired();

            modelBuilder.Entity<Employee>()
                .Property(e => e.Status)
                .HasConversion<int>()
                .IsRequired();
            // Configure Role with manually assigned IDs
            modelBuilder.Entity<Role>()
                .Property(r => r.RoleId)
                .ValueGeneratedNever();

            // Configure auto-incrementing IDs
            modelBuilder.Entity<PlaceCategory>()
                .Property(pc => pc.CategoryId)
                .ValueGeneratedOnAdd();

            modelBuilder.Entity<PlaceTag>()
                .Property(pt => pt.TagId)
                .ValueGeneratedOnAdd();

            // =============================================
            // III. COMPOSITE KEYS CONFIGURATION
            // =============================================

            modelBuilder.Entity<PlaceTagAssignment>()
                .HasKey(pta => new { pta.PlaceId, pta.TagId });

            // =============================================
            // IV. UNIQUE CONSTRAINTS & INDEXES
            // =============================================

            // User unique constraints
            modelBuilder.Entity<User>()
                .HasIndex(u => u.EmployeeId)
                .IsUnique()
                .HasDatabaseName("IX_users_employee_id_unique");

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique()
                .HasDatabaseName("IX_users_email_unique");

            // Place Review unique constraint (one review per user per place)
            modelBuilder.Entity<PlaceReview>()
                .HasIndex(pr => new { pr.PlaceId, pr.UserId })
                .IsUnique()
                .HasDatabaseName("IX_place_reviews_place_user_unique");

            // Review Vote unique constraint (one vote per user per review)
            modelBuilder.Entity<ReviewVote>()
                .HasIndex(rv => new { rv.ReviewId, rv.UserId })
                .IsUnique()
                .HasDatabaseName("IX_review_votes_review_user_unique");

            // Event Participant unique constraint (one participation per user per event)
            modelBuilder.Entity<EventParticipant>()
                .HasIndex(ep => new { ep.EventId, ep.UserId })
                .IsUnique()
                .HasDatabaseName("IX_event_participants_event_user_unique");

            // Event Vote unique constraint (one vote per user per option per event)
            modelBuilder.Entity<EventVote>()
                .HasIndex(ev => new { ev.EventId, ev.OptionId, ev.VoterId })
                .IsUnique()
                .HasDatabaseName("IX_event_votes_event_option_voter_unique");

            // User Session token unique constraint
            modelBuilder.Entity<UserSession>()
                .HasIndex(us => us.TokenHash)
                .IsUnique()
                .HasDatabaseName("IX_user_sessions_token_hash_unique");

            // Password reset token unique constraint
            modelBuilder.Entity<PasswordResetToken>()
                .HasIndex(prt => prt.TokenHash)
                .IsUnique()
                .HasDatabaseName("IX_password_reset_tokens_token_hash_unique");

            // =============================================
            // V. PERFORMANCE INDEXES
            // =============================================

            // Location-based queries
            modelBuilder.Entity<Place>()
                .HasIndex(p => new { p.Latitude, p.Longitude })
                .HasDatabaseName("IX_places_location");

            // Rating queries
            modelBuilder.Entity<Place>()
                .HasIndex(p => p.AverageRating)
                .HasDatabaseName("IX_places_average_rating");

            // Category filtering
            modelBuilder.Entity<Place>()
                .HasIndex(p => p.CategoryId)
                .HasDatabaseName("IX_places_category_id");

            // Search history by user
            modelBuilder.Entity<SearchHistory>()
                .HasIndex(sh => sh.UserId)
                .HasDatabaseName("IX_search_history_user_id");

            // Recent searches
            modelBuilder.Entity<SearchHistory>()
                .HasIndex(sh => sh.SearchTimestamp)
                .HasDatabaseName("IX_search_history_timestamp");

            // Event status and date queries
            modelBuilder.Entity<Event>()
                .HasIndex(e => new { e.Status, e.ScheduledDate })
                .HasDatabaseName("IX_events_status_scheduled_date");

            // Notification queries
            modelBuilder.Entity<Notification>()
                .HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt })
                .HasDatabaseName("IX_notifications_user_read_created");

            // =============================================
            // VI. CHECK CONSTRAINTS
            // =============================================

            // Email domain constraint for FPT users
            //modelBuilder.Entity<User>()
            //    .HasCheckConstraint("CK_users_email_domain", "[email] LIKE '%@fpt.edu.vn'");

            // Location coordinates
            //modelBuilder.Entity<Place>()
            //    .Property(p => p.Latitude)
            //    .HasPrecision(10, 8);

            //modelBuilder.Entity<Place>()
            //    .Property(p => p.Longitude)
            //    .HasPrecision(11, 8);

            modelBuilder.Entity<UserLocation>()
                .Property(ul => ul.Latitude)
                .HasPrecision(10, 8);

            modelBuilder.Entity<UserLocation>()
                .Property(ul => ul.Longitude)
                .HasPrecision(11, 8);

            modelBuilder.Entity<UserLocation>()
                .Property(ul => ul.AccuracyMeters)
                .HasPrecision(8, 2);

            // Rating decimals
            modelBuilder.Entity<Place>()
                .Property(p => p.AverageRating)
                .HasPrecision(3, 2);

            modelBuilder.Entity<Place>()
                .Property(p => p.AiCategoryConfidence)
                .HasPrecision(3, 2);

            modelBuilder.Entity<PlaceTagAssignment>()
                .Property(pta => pta.ConfidenceScore)
                .HasPrecision(3, 2);

            modelBuilder.Entity<EventPlaceOption>()
                .Property(epo => epo.AiScore)
                .HasPrecision(4, 2);

            modelBuilder.Entity<ChatMessage>()
                .Property(cm => cm.AiConfidenceScore)
                .HasPrecision(3, 2);

            modelBuilder.Entity<CulturalKnowledge>()
                .Property(ck => ck.ConfidenceLevel)
                .HasPrecision(3, 2);

            // Money/cost decimals
            modelBuilder.Entity<Event>()
                .Property(e => e.BudgetTotal)
                .HasPrecision(10, 2);

            modelBuilder.Entity<Event>()
                .Property(e => e.BudgetPerPerson)
                .HasPrecision(10, 2);

            modelBuilder.Entity<EventPlaceOption>()
                .Property(epo => epo.EstimatedCostPerPerson)
                .HasPrecision(8, 2);

            modelBuilder.Entity<Itinerary>()
                .Property(i => i.TotalBudget)
                .HasPrecision(10, 2);

            modelBuilder.Entity<ItineraryItem>()
                .Property(ii => ii.EstimatedCost)
                .HasPrecision(8, 2);

            modelBuilder.Entity<ItineraryItem>()
                .Property(ii => ii.ActualCost)
                .HasPrecision(8, 2);

            modelBuilder.Entity<ItineraryItem>()
                .Property(ii => ii.TransportCost)
                .HasPrecision(8, 2);

            // =============================================
            // VIII. DEFAULT VALUES CONFIGURATION
            // =============================================

            // Default timestamps
            modelBuilder.Entity<User>()
                .Property(u => u.CreatedAt)
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            modelBuilder.Entity<User>()
                .Property(u => u.UpdatedAt)
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            modelBuilder.Entity<UserProfile>()
                .Property(up => up.CreatedAt)
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            modelBuilder.Entity<UserProfile>()
                .Property(up => up.UpdatedAt)
                .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            // Default boolean values
            modelBuilder.Entity<User>()
                .Property(u => u.IsActive)
                .HasDefaultValue(true);

            modelBuilder.Entity<User>()
                .Property(u => u.EmailVerified)
                .HasDefaultValue(false);

            modelBuilder.Entity<User>()
                .Property(u => u.FailedLoginAttempts)
                .HasDefaultValue(0);

            modelBuilder.Entity<Place>()
                .Property(p => p.AverageRating)
                .HasDefaultValue(0.00m);

            modelBuilder.Entity<Place>()
                .Property(p => p.TotalReviews)
                .HasDefaultValue(0);

            modelBuilder.Entity<PlaceReview>()
                .Property(pr => pr.IsFlagged)
                .HasDefaultValue(false);

            // Default string values
            modelBuilder.Entity<UserProfile>()
                .Property(up => up.Timezone)
                .HasDefaultValue("UTC");

            modelBuilder.Entity<UserProfile>()
                .Property(up => up.DateFormat)
                .HasDefaultValue("MM/dd/yyyy");

            modelBuilder.Entity<Event>()
                .Property(e => e.Status)
                .HasDefaultValue("planning");

            modelBuilder.Entity<EventParticipant>()
                .Property(ep => ep.InvitationStatus)
                .HasDefaultValue("pending");

            modelBuilder.Entity<Itinerary>()
                .Property(i => i.Currency)
                .HasDefaultValue("USD");

            modelBuilder.Entity<Itinerary>()
                .Property(i => i.Status)
                .HasDefaultValue("draft");

            // =============================================
            // IX. RELATIONSHIPS & FOREIGN KEY CONFIGURATION
            // =============================================

            // User -> Role relationship
            modelBuilder.Entity<User>()
                .HasOne(u => u.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            // User -> UserProfile (One-to-One)
            modelBuilder.Entity<User>()
                .HasOne(u => u.UserProfile)
                .WithOne(up => up.User)
                .HasForeignKey<UserProfile>(up => up.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // User -> UserPreference (One-to-One)
            modelBuilder.Entity<User>()
                .HasOne(u => u.UserPreferences)
                .WithOne(up => up.User)
                .HasForeignKey<UserPreference>(up => up.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Place -> PlaceCategory relationship
            modelBuilder.Entity<Place>()
                .HasOne(p => p.PlaceCategory)
                .WithMany(pc => pc.Places)
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            // Place -> User (CreatedBy) relationship
            modelBuilder.Entity<Place>()
                .HasOne(p => p.CreatedByUser)
                .WithMany(u => u.CreatedPlaces)
                .HasForeignKey(p => p.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // PlaceReview relationships with cascade restrictions to avoid cycles
            // PlaceReview -> Place: GIỮ Cascade
            modelBuilder.Entity<PlaceReview>()
                .HasOne(pr => pr.Place)
                .WithMany(p => p.PlaceReviews)
                .HasForeignKey(pr => pr.PlaceId)
                .OnDelete(DeleteBehavior.Cascade);

            // PlaceReview -> User (tác giả): KHÔNG cascade (chọn 1 trong 2)
            modelBuilder.Entity<PlaceReview>()
                .HasOne(pr => pr.User)
                .WithMany(u => u.PlaceReviews)
                .HasForeignKey(pr => pr.UserId)
                .OnDelete(DeleteBehavior.Restrict);   // => UserId phải nullable
            // PlaceReview -> ModeratedBy: SetNull (nullable)
            modelBuilder.Entity<PlaceReview>()
                .HasOne(pr => pr.ModeratedByUser)
                .WithMany(u => u.ModeratedReviews)
                .HasForeignKey(pr => pr.ModeratedBy)
                .OnDelete(DeleteBehavior.SetNull);


            // ReviewVote relationships with NoAction to prevent cycles
            modelBuilder.Entity<ReviewVote>()
                .HasOne(rv => rv.PlaceReview)
                .WithMany(pr => pr.ReviewVotes)
                .HasForeignKey(rv => rv.ReviewId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ReviewVote>()
                .HasOne(rv => rv.User)
                .WithMany(u => u.ReviewVotes)
                .HasForeignKey(rv => rv.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // Event relationships
            modelBuilder.Entity<Event>()
                .HasOne(e => e.Organizer)
                .WithMany(u => u.OrganizedEvents)
                .HasForeignKey(e => e.OrganizerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Event>()
                .HasOne(e => e.FinalPlace)
                .WithMany()
                .HasForeignKey(e => e.FinalPlaceId)
                .OnDelete(DeleteBehavior.SetNull);

            // EventParticipant relationships
            modelBuilder.Entity<EventParticipant>()
                .HasOne(ep => ep.Event)
                .WithMany(e => e.EventParticipants)
                .HasForeignKey(ep => ep.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EventParticipant>()
                .HasOne(ep => ep.User)
                .WithMany(u => u.EventParticipations)
                .HasForeignKey(ep => ep.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<EventParticipant>()
                .HasOne(ep => ep.InvitedByUser)
                .WithMany()
                .HasForeignKey(ep => ep.InvitedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // EventShare relationships
            modelBuilder.Entity<EventShare>()
                .HasOne(esh => esh.Event)
                .WithMany()
                .HasForeignKey(esh => esh.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EventShare>()
                .HasOne(esh => esh.SharedWithUser)
                .WithMany()
                .HasForeignKey(esh => esh.SharedWithUserId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<EventShare>()
                .HasOne(esh => esh.SharedByUser)
                .WithMany()
                .HasForeignKey(esh => esh.SharedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // EventVote relationships
            modelBuilder.Entity<EventVote>()
                .HasOne(ev => ev.Event)
                .WithMany(e => e.EventVotes)
                .HasForeignKey(ev => ev.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EventVote>()
                .HasOne(ev => ev.EventPlaceOption)
                .WithMany(epo => epo.EventVotes)
                .HasForeignKey(ev => ev.OptionId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<EventVote>()
                .HasOne(ev => ev.Voter)
                .WithMany(u => u.EventVotes)
                .HasForeignKey(ev => ev.VoterId)
                .OnDelete(DeleteBehavior.NoAction);

            // EventCheckIn relationships
            modelBuilder.Entity<EventCheckIn>()
                .HasOne(ci => ci.Event)
                .WithMany(e => e.EventCheckIns)
                .HasForeignKey(ci => ci.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EventCheckIn>()
                .HasOne(ci => ci.User)
                .WithMany()
                .HasForeignKey(ci => ci.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // EventFeedback relationships
            modelBuilder.Entity<EventFeedback>()
                .HasOne(f => f.Event)
                .WithMany(e => e.EventFeedbacks)
                .HasForeignKey(f => f.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EventFeedback>()
                .HasOne(f => f.User)
                .WithMany()
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // EventTemplate relationships
            modelBuilder.Entity<EventTemplate>()
                .HasOne(t => t.CreatedByUser)
                .WithMany()
                .HasForeignKey(t => t.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            // RecurringEvent relationships
            modelBuilder.Entity<RecurringEvent>()
                .HasOne(re => re.Organizer)
                .WithMany()
                .HasForeignKey(re => re.OrganizerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<RecurringEvent>()
                .HasMany(re => re.GeneratedEvents)
                .WithOne(e => e.RecurringEvent)
                .HasForeignKey(e => e.RecurringEventId)
                .OnDelete(DeleteBehavior.SetNull);

            // EventWaitlist relationships
            modelBuilder.Entity<EventWaitlist>()
                .HasOne(w => w.Event)
                .WithMany(e => e.EventWaitlists)
                .HasForeignKey(w => w.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EventWaitlist>()
                .HasOne(w => w.User)
                .WithMany()
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            // EventTemplate link
            modelBuilder.Entity<Event>()
                .HasOne(e => e.EventTemplate)
                .WithMany()
                .HasForeignKey(e => e.TemplateId)
                .OnDelete(DeleteBehavior.SetNull);

            // PlaceTagAssignment relationships
            modelBuilder.Entity<PlaceTagAssignment>()
                .HasOne(pta => pta.Place)
                .WithMany(p => p.PlaceTagAssignments)
                .HasForeignKey(pta => pta.PlaceId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PlaceTagAssignment>()
                .HasOne(pta => pta.PlaceTag)
                .WithMany(pt => pt.PlaceTagAssignments)
                .HasForeignKey(pta => pta.TagId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PlaceTagAssignment>()
                .HasOne(pta => pta.AssignedByUser)
                .WithMany()
                .HasForeignKey(pta => pta.AssignedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // ItineraryShare relationships
            modelBuilder.Entity<ItineraryShare>()
                .HasOne(ish => ish.Itinerary)
                .WithMany(i => i.ItineraryShares)
                .HasForeignKey(ish => ish.ItineraryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ItineraryShare>()
                .HasOne(ish => ish.SharedWithUser)
                .WithMany()
                .HasForeignKey(ish => ish.SharedWithUserId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ItineraryShare>()
                .HasOne(ish => ish.SharedByUser)
                .WithMany()
                .HasForeignKey(ish => ish.SharedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Friendship>(entity =>
            {
                entity.HasOne(f => f.Requested)
                    .WithMany(u => u.FriendRequestsSent)
                    .HasForeignKey(f => f.RequestedId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(f => f.Addressee)
                    .WithMany(u => u.FriendRequestsReceived)
                    .HasForeignKey(f => f.AddresseeId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Unique constraint to prevent duplicate friend requests
                entity.HasIndex(f => new { f.RequestedId, f.AddresseeId }).IsUnique();
            });

            modelBuilder.Entity<User>()
                .HasOne(u => u.CurrentBranch)
                .WithMany(d => d.Users)
                .HasForeignKey(u => u.CurrentBranchId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Place>()
                .HasOne(u => u.Branch)
                .WithMany()
                .HasForeignKey(u => u.BranchId)
                .OnDelete(DeleteBehavior.Restrict);

            // Country - City - Branch relationships
            modelBuilder.Entity<City>()
                .HasOne(c => c.Country)
                .WithMany(cn => cn.Cities)
                .HasForeignKey(c => c.CountryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Branch>()
                .HasOne(b => b.City)
                .WithMany(c => c.Branches)
                .HasForeignKey(b => b.CityId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Branch>()
                .HasOne(b => b.Country)
                .WithMany(cn => cn.Branches)
                .HasForeignKey(b => b.CountryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Employee>()
                .HasOne(b => b.Branch)
                .WithMany(cn => cn.Employees)
                .HasForeignKey(b => b.BranchId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PlaceVote>()
                .HasOne(b => b.Place)
                .WithMany(cn => cn.PlaceVotes)
                .HasForeignKey(b => b.PlaceId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PlaceVote>()
                .HasOne(v => v.User)
                .WithMany(u => u.PlaceVotes)
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PlaceReviewReport>()
                .HasOne(r => r.PlaceReview)
                .WithMany(r => r.ReviewReports)
                .HasForeignKey(r => r.ReviewId);

            modelBuilder.Entity<PlaceReport>()
                .HasOne(r => r.Place)
                .WithMany(p => p.PlaceReports)
                .HasForeignKey(r => r.PlaceId);
            // =============================================
            // X. JSON COLUMN CONFIGURATION
            // =============================================

            // Configure JSON properties for SQL Server 2016+
            // Note: For older versions, you might need custom value converters

            modelBuilder.Entity<UserPreference>()
                .Property(up => up.CuisinePreferences)
                .HasConversion(
                    v => v == null ? null : v,
                    v => v == null ? null : v
                );

            modelBuilder.Entity<UserSession>()
                .Property(us => us.DeviceInfo)
                .HasConversion(
                    v => v == null ? null : v,
                    v => v == null ? null : v
                );

            modelBuilder.Entity<Place>()
                .Property(p => p.AiSuggestedTags)
                .HasConversion(
                    v => v == null ? null : v,
                    v => v == null ? null : v
                );

            modelBuilder.Entity<Place>()
                .Property(p => p.AiPriceEstimate)
                .HasConversion(
                    v => v == null ? null : v,
                    v => v == null ? null : v
                );

            modelBuilder.Entity<EventPlaceOption>()
                .Property(epo => epo.AiReasoning)
                .HasConversion(
                    v => v == null ? null : v,
                    v => v == null ? null : v
                );

            modelBuilder.Entity<EventPlaceOption>()
                .Property(epo => epo.Pros)
                .HasConversion(
                    v => v == null ? null : v,
                    v => v == null ? null : v
                );

            modelBuilder.Entity<EventPlaceOption>()
                .Property(epo => epo.Cons)
                .HasConversion(
                    v => v == null ? null : v,
                    v => v == null ? null : v
                );


            // Configure string lengths explicitly for better performance
            modelBuilder.Entity<User>()
                .Property(u => u.EmployeeId)
                .HasMaxLength(20)
                .IsUnicode(false); // Use VARCHAR instead of NVARCHAR for employee IDs

            modelBuilder.Entity<Place>()
                .Property(p => p.GooglePlaceId)
                .HasMaxLength(255)
                .IsUnicode(false);

            // Configure text fields with appropriate types
            modelBuilder.Entity<Place>()
                .Property(p => p.Description)
                .HasColumnType("ntext");

            modelBuilder.Entity<PlaceReview>()
                .Property(pr => pr.ReviewText)
                .HasColumnType("ntext");

            // Configure timestamp columns for better performance
            modelBuilder.Entity<SearchHistory>()
                .Property(sh => sh.SearchTimestamp)
                .HasColumnType("datetimeoffset(2)"); // Less precision for better performance

            // Configure computed columns (if supported by database)
            modelBuilder.Entity<User>().Ignore(u => u.FullName);
            SeedData(modelBuilder);
            modelBuilder.ApplyConfiguration(new ConversationConfiguration());
            modelBuilder.ApplyConfiguration(new ConversationParticipantConfiguration());
            modelBuilder.ApplyConfiguration(new MessageConfiguration());
            modelBuilder.ApplyConfiguration(new MessageReadReceiptConfiguration());
            modelBuilder.ApplyConfiguration(new TypingStatusConfiguration());
            modelBuilder.ApplyConfiguration(new ChatConversationConfiguration());
        }
        private void SeedData(ModelBuilder modelBuilder)
        {
            // =============================================
            // I. SEED ROLES DATA
            // =============================================

            modelBuilder.Entity<Role>().HasData(
                new Role
                {
                    RoleId = 1,
                    RoleName = "Admin"
                },
                new Role
                {
                    RoleId = 2,
                    RoleName = "Moderator"
                },
                new Role
                {
                    RoleId = 3,
                    RoleName = "User"
                }
            );

            // =============================================
            // II. SEED ADMIN USER DATA
            // =============================================

            //var adminUserId = new Guid("11111111-1111-1111-1111-111111111111");

            //modelBuilder.Entity<User>().HasData(
            //    new User
            //    {
            //        UserId = adminUserId,
            //        EmployeeId = "ADMIN001",
            //        RoleId = 1, // Admin role
            //        Email = "admin@fpt.edu.vn",
            //        PasswordHash = "AQAAAAIAAYagAAAAEFa+9SPJx6ioxaB1lRR5xoR099KWrfSfqtvBdVhtwR8qULGyOwwUdEquzhP8CRWMsA==", // Beesrs2511@
            //        FirstName = "System",
            //        LastName = "Administrator",
            //        CurrentBranchId = new Guid("C2F29E9E-FB89-46B2-A71B-04C55C67B0C6"),
            //        JobTitle = "System Administrator",
            //        PhoneNumber = "0000000000",
            //        IsActive = true,
            //        EmailVerified = true,
            //        CreatedAt = new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero),
            //        UpdatedAt = new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero),
            //        FailedLoginAttempts = 0
            //    }
            //);

            //// =============================================
            //// III. SEED ADMIN USER PROFILE
            //// =============================================

            //modelBuilder.Entity<UserProfile>().HasData(
            //    new UserProfile
            //    {
            //        ProfileId = new Guid("22222222-2222-2222-2222-222222222222"),
            //        UserId = adminUserId,
            //        HomeCountry = "VN",
            //        CurrentLocationCity = "Ho Chi Minh City",
            //        CurrentLocationCountry = "VN",
            //        Timezone = "Asia/Ho_Chi_Minh",
            //        DateFormat = "dd/MM/yyyy",
            //        Bio = "System Administrator - BEESRS Platform",
            //        CreatedAt = new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero),
            //        UpdatedAt = new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero)
            //    }
            //);

            //// =============================================
            //// IV. SEED ADMIN USER PREFERENCES
            //// =============================================

            //modelBuilder.Entity<UserPreference>().HasData(
            //    new UserPreference
            //    {
            //        PreferenceId = new Guid("33333333-3333-3333-3333-333333333333"),
            //        UserId = adminUserId,
            //        CuisinePreferences = "{\"preferences\":[\"Vietnamese\",\"Asian\",\"International\"]}",
            //        BudgetPreference = 3, // Medium budget
            //        DistanceRadius = 10000, // 10km
            //        CreatedAt = new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero),
            //        UpdatedAt = new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero)
            //    }
            //);

            // =============================================
            // V. SEED PLACE CATEGORIES
            // =============================================

            modelBuilder.Entity<PlaceCategory>().HasData(
                new PlaceCategory
                {
                    CategoryId = 1,
                    Name = "Restaurant",
                    Description = "Restaurants and dining establishments",
                    IsActive = true,
                    SortOrder = 1
                },
                new PlaceCategory
                {
                    CategoryId = 2,
                    Name = "Cafe",
                    Description = "Coffee shops and cafes",
                    IsActive = true,
                    SortOrder = 2
                },
                new PlaceCategory
                {
                    CategoryId = 3,
                    Name = "Bar",
                    Description = "Bars and pubs",
                    IsActive = true,
                    SortOrder = 3
                },
                new PlaceCategory
                {
                    CategoryId = 4,
                    Name = "Fast Food",
                    Description = "Quick service restaurants",
                    IsActive = true,
                    SortOrder = 4
                },
                new PlaceCategory
                {
                    CategoryId = 5,
                    Name = "Food Court",
                    Description = "Food courts and food halls",
                    IsActive = true,
                    SortOrder = 5
                },
                new PlaceCategory
                {
                    CategoryId = 6,
                    Name = "Street Food",
                    Description = "Street food vendors and stalls",
                    IsActive = true,
                    SortOrder = 6
                },
                new PlaceCategory
                {
                    CategoryId = 7,
                    Name = "Bakery",
                    Description = "Bakeries and pastry shops",
                    IsActive = true,
                    SortOrder = 7
                },
                new PlaceCategory
                {
                    CategoryId = 8,
                    Name = "Dessert",
                    Description = "Ice cream shops and dessert places",
                    IsActive = true,
                    SortOrder = 8
                }
            );

            // =============================================
            // VI. SEED PLACE TAGS
            // =============================================

            modelBuilder.Entity<PlaceTag>().HasData(
                // Cuisine Tags
                new PlaceTag { TagId = 1, Name = "Vietnamese", Description = "Vietnamese cuisine", IsActive = true },
                new PlaceTag { TagId = 2, Name = "Chinese", Description = "Chinese cuisine", IsActive = true },
                new PlaceTag { TagId = 3, Name = "Japanese", Description = "Japanese cuisine", IsActive = true },
                new PlaceTag { TagId = 4, Name = "Korean", Description = "Korean cuisine", IsActive = true },
                new PlaceTag { TagId = 5, Name = "Thai", Description = "Thai cuisine", IsActive = true },
                new PlaceTag { TagId = 6, Name = "Western", Description = "Western cuisine", IsActive = true },
                new PlaceTag { TagId = 7, Name = "Italian", Description = "Italian cuisine", IsActive = true },
                new PlaceTag { TagId = 8, Name = "Indian", Description = "Indian cuisine", IsActive = true },

                // Atmosphere Tags
                new PlaceTag { TagId = 9, Name = "Casual", Description = "Casual dining atmosphere", IsActive = true },
                new PlaceTag { TagId = 10, Name = "Fine Dining", Description = "Upscale dining experience", IsActive = true },
                new PlaceTag { TagId = 11, Name = "Family Friendly", Description = "Good for families with children", IsActive = true },
                new PlaceTag { TagId = 12, Name = "Romantic", Description = "Perfect for romantic dates", IsActive = true },
                new PlaceTag { TagId = 13, Name = "Business", Description = "Good for business meetings", IsActive = true },
                new PlaceTag { TagId = 14, Name = "Student Friendly", Description = "Budget-friendly for students", IsActive = true },

                // Features Tags
                new PlaceTag { TagId = 15, Name = "WiFi", Description = "Free WiFi available", IsActive = true },
                new PlaceTag { TagId = 16, Name = "Air Conditioning", Description = "Air conditioned space", IsActive = true },
                new PlaceTag { TagId = 17, Name = "Outdoor Seating", Description = "Outdoor dining area", IsActive = true },
                new PlaceTag { TagId = 18, Name = "Parking", Description = "Parking available", IsActive = true },
                new PlaceTag { TagId = 19, Name = "Delivery", Description = "Delivery service available", IsActive = true },
                new PlaceTag { TagId = 20, Name = "Takeaway", Description = "Takeaway service available", IsActive = true },

                // Dietary Tags
                new PlaceTag { TagId = 21, Name = "Vegetarian", Description = "Vegetarian options available", IsActive = true },
                new PlaceTag { TagId = 22, Name = "Vegan", Description = "Vegan options available", IsActive = true },
                new PlaceTag { TagId = 23, Name = "Halal", Description = "Halal certified", IsActive = true },
                new PlaceTag { TagId = 24, Name = "Gluten Free", Description = "Gluten-free options", IsActive = true }
            );

            // Seed Countries, Cities, Branches data
            modelBuilder.Entity<Country>().HasData(
                new Country { CountryId = new Guid("44444444-4444-4444-4444-444444444444"), Name = "Vietnam", IsoCode = "VN", Currency = "VND", TimeZone = "UTC+07:00" },
                new Country { CountryId = new Guid("55555555-5555-5555-5555-555555555555"), Name = "Thailand", IsoCode = "TH", Currency = "THB", TimeZone = "UTC+07:00" },
                new Country { CountryId = new Guid("66666666-6666-6666-6666-666666666666"), Name = "Singapore", IsoCode = "SG", Currency = "SGD", TimeZone = "UTC+08:00" },
                new Country { CountryId = new Guid("77777777-7777-7777-7777-777777777777"), Name = "Philippines", IsoCode = "PH", Currency = "PHP", TimeZone = "UTC+08:00" },
                new Country { CountryId = new Guid("88888888-8888-8888-8888-888888888888"), Name = "Indonesia", IsoCode = "ID", Currency = "IDR", TimeZone = "UTC+07:00" }
            );

            modelBuilder.Entity<City>().HasData(
                new City { CityId = new Guid("99999999-9999-9999-9999-999999999999"), CountryId = Guid.Parse("44444444-4444-4444-4444-444444444444"), Name = "Ho Chi Minh City", StateProvince = "Ho Chi Minh City" }
            );
        }
    }
}
