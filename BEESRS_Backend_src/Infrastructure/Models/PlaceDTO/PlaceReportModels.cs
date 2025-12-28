using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceDTO
{
    public record PlaceReportDTO
    {
        public Guid ReportId { get; set; }
        public Guid PlaceId { get; set; }
        public Guid ReportedByUserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
        public string Reason { get; set; } = string.Empty;
        public DateTimeOffset ReportedAt { get; set; }
    }

    public record ReportRequest
    {
        [Required]
        public Guid PlaceId { get; set; }

        [Required]
        public string Reason {  get; set; }
    }

    public record ResolveReport
    {
        [Required]
        public Guid ReportId { get; set; }
        
        [Required]
        public string ResolvedNote { get; set; } =string.Empty;

        [Required]
        public bool IsValid { get; set; }
    }

    public record ResolveAllReportOfPlace
    {
        [Required]
        public Guid PlaceId { get; set; }
        
        [Required]
        public string ResolvedNote { get; set; } = string.Empty;
    }
}
