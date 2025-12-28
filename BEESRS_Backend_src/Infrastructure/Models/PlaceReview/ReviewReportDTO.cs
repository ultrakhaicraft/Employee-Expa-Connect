using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceReview
{
    public record ReviewWithReport : ReviewDetailDTO
    {
        public List<ReviewReportDTO> ReviewReports { get; set; } = new List<ReviewReportDTO>();
    }
    public record ReviewReportDTO
    {
        public Guid ReportId { get; set; }
        public Guid ReviewId { get; set; }
        public Guid ReportedByUserId { get; set; }
        public string ReportedByUserFullName { get; set; }
        public string? ReportedByUserProfilePictureUrl { get; set; }
        public string Reason { get; set; }
        public DateTimeOffset ReportedAt { get; set; }
    }
    public record SolveReport
    {
        public Guid ReviewId { get; set; }
        public bool IsValidReport { get; set; }
        public string? ModerationReason { get; set; }
    }
    public record ReportReviewDTO
    {
        [Required]
        public Guid ReviewId { get; set; }
        [Required]
        [StringLength(300)]
        public string Reason { get; set; }
    }
}
