using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserProfileDTO
{
	public record UserProfileViewDto
	{
		public Guid ProfileId { get; set; } 
		public Guid UserId { get; set; }
		public string FirstName { get; set; } = string.Empty;
		public string LastName { get; set; } = string.Empty;
		public string FullName => $"{FirstName} {LastName}";
		public string? HomeCountry { get; set; }
		public string? CurrentBranch { get; set; } //Get Current Branch Name
		public string? FriendshipStatus { get; set; }
		public string? ProfilePictureUrl { get; set; }
		public DateTimeOffset CreatedAt { get; set; } 
		public DateTimeOffset UpdatedAt { get; set; } 
	}
}
