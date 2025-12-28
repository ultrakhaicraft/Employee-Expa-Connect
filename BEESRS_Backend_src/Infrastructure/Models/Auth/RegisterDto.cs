using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.DTOs
{
    public class RegisterDto
    {
                //[RegularExpression(@"^[a-zA-Z0-9._%+-]+@fpt\.edu\.vn$",
        [Required]
        [EmailAddress]
        //[RegularExpression(@"^[a-zA-Z0-9._%+-]+@gmail\.com$",
        //ErrorMessage = "Email must be from fpt.edu.vn domain")]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$",
            ErrorMessage = "Password must contain at least 8 characters including uppercase, lowercase, number and special character")]
        public string Password { get; set; } = string.Empty;

        [Required]
        [Compare("Password")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string LastName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = default!;

        //[MaxLength(100)]
        //public string? BranchId { get; set; } //Department Id

        [MaxLength(100)]
        public string? JobTitle { get; set; }

        [Phone]
        public string? PhoneNumber { get; set; }
    }
}
