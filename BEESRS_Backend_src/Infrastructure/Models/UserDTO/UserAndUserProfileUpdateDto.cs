using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserDTO
{
	public record UserAndUserProfileUpdateDto
	{
		[Required(ErrorMessage = "Email is required.")]
		[StringLength(100, ErrorMessage = "Email cannot exceed 100 characters.")]
		[EmailAddress(ErrorMessage ="Invalid Email Format")]
		public string Email { get; set; } = string.Empty;

		[Required(ErrorMessage = "First name is required.")]
		[StringLength(50, ErrorMessage = "First name cannot exceed 50 characters.")]
		public string FirstName { get; set; } = string.Empty;

		[Required(ErrorMessage = "Last name is required.")]
		[StringLength(50, ErrorMessage = "Last name cannot exceed 50 characters.")]
		public string LastName { get; set; } = string.Empty;

		[Required(ErrorMessage = "Job title is required.")]
		[StringLength(100, ErrorMessage = "Job title cannot exceed 100 characters.")]
		public string? JobTitle { get; set; }

		[Required(ErrorMessage = "Phone number is required.")]
		[StringLength(20, ErrorMessage = "Phone number cannot exceed 20 characters.")]
		public string? PhoneNumber { get; set; }

		[Required(ErrorMessage = "Home country is required.")]
		[StringLength(50, ErrorMessage = "Home country cannot exceed 50 characters")]
		public string? HomeCountry { get; set; }

		[Required(ErrorMessage = "Current location city is required.")]
		[StringLength(100, ErrorMessage = "Current location city cannot exceed 100 characters.")]
		public string? CurrentLocationCity { get; set; }

		[Required(ErrorMessage = "Current location country is required.")]
		[StringLength(50, ErrorMessage = "Current location country cannot exceed 50 characters")]
		public string? CurrentLocationCountry { get; set; }

		[Required(ErrorMessage = "Timezone is required.")]
		[StringLength(50, ErrorMessage = "Timezone cannot exceed 50 characters.")]
		public string? Timezone { get; set; }

		[Required(ErrorMessage = "Bio is required.")]
		public string? Bio { get; set; }
	}
}
