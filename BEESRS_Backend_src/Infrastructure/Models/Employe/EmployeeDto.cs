using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Enums;

namespace Infrastructure.Models.Employe
{
    public class EmployeeDto
    {
        public string EmployeeId { get; set; } = default!;
        public string EmployeeCode { get; set; } = default!;
        public Guid BranchId { get; set; }
        public string? BranchName { get; set; }
        public string Email { get; set; } = default!;
        public string? JobTitle { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? ExpiresAt { get; set; }
        public EmployeeStatus Status { get; set; }
    }

    public class CreateEmployeeDto
    {
        // EmployeeId is optional - will be auto-generated if not provided
        [StringLength(20, ErrorMessage = "EmployeeId cannot exceed 20 characters")]
        public string? EmployeeId { get; set; }
        
        [Required]
        [StringLength(64, ErrorMessage = "EmployeeCode cannot exceed 64 characters")]
        public string EmployeeCode { get; set; } = default!;
        
        [Required]
        public Guid BranchId { get; set; }
        
        [Required]
        [EmailAddress]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string Email { get; set; } = default!;
        
        [StringLength(100, ErrorMessage = "JobTitle cannot exceed 100 characters")]
        public string? JobTitle { get; set; }
        
        public DateTimeOffset? ExpiresAt { get; set; }
        public EmployeeStatus? Status { get; set; }
    }

    public class UpsertEmployeeDto
    {
        // EmployeeId is optional - will be auto-generated if not provided
        [StringLength(20, ErrorMessage = "EmployeeId cannot exceed 20 characters")]
        public string? EmployeeId { get; set; }
        
        [Required]
        [StringLength(64, ErrorMessage = "EmployeeCode cannot exceed 64 characters")]
        public string EmployeeCode { get; set; } = default!;
        
        [Required]
        public Guid BranchId { get; set; }
        
        [Required]
        [EmailAddress]
        [StringLength(100, ErrorMessage = "Email cannot exceed 100 characters")]
        public string Email { get; set; } = default!;
        
        [StringLength(100, ErrorMessage = "JobTitle cannot exceed 100 characters")]
        public string? JobTitle { get; set; }
        
        public DateTimeOffset? ExpiresAt { get; set; }
        public EmployeeStatus? Status { get; set; }
    }

    public class BulkCreateEmployeeDto
    {
        public List<CreateEmployeeDto> Items { get; set; } = new();
    }

    public class EmployeeQuery
    {
        public string? Search { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public EmployeeStatus? Status { get; set; }
    }

    public class PagedResult<T>
    {
        public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
        public int Total { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
