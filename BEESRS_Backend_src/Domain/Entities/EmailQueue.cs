using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class EmailQueue
    {
        [Key]
        public Guid EmailId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(100)]
        public string RecipientEmail { get; set; }

        [StringLength(100)]
        public string RecipientName { get; set; }

        [Required]
        [StringLength(200)]
        public string Subject { get; set; }

        [Required]
        [StringLength(100)]
        public string TemplateName { get; set; }

        public string TemplateData { get; set; } // JSON

        public int Priority { get; set; } = 5;

        [StringLength(20)]
        public string Status { get; set; } = "pending";

        public string ErrorMessage { get; set; }

        public int Attempts { get; set; } = 0;

        public int MaxAttempts { get; set; } = 3;

        public DateTimeOffset ScheduledFor { get; set; } = DateTimeOffset.Now;

        public DateTimeOffset? SentAt { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;
    }
}
