using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Enums;

namespace Domain.Entities
{
    [Table("Employees")]
    public class Employee
    {
        [Required, StringLength(20)]
        public string EmployeeId { get; set; } = default!;

        [Required, StringLength(64)]
        public string EmployeeCode { get; set; } = default!;

        [ForeignKey("Branch")]
        public Guid BranchId { get; set; }

        [StringLength(100)]
        [EmailAddress]
        public string Email { get; set; } = default!;

        [StringLength(100)]
        public string? JobTitle { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? ExpiresAt { get; set; }
        
        public EmployeeStatus Status { get; set; } = EmployeeStatus.Inactive;

        public virtual Branch Branch { get; set; }
    }
}
