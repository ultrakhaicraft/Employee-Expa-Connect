using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserProfileDTO
{
	public record UserProfileDetailDto
	{
		public Guid ProfileId { get; set; } 
		public Guid UserId { get; set; }
		public string? HomeCountry { get; set; }
		public string? CurrentLocationCity { get; set; }
		public string? CurrentLocationCountry { get; set; }
        public string? CurrentBranch { get; set; } //Get Current Branch Name
		public string? Timezone { get; set; }  
		public string? DateFormat { get; set; } 
		public string? ProfilePictureUrl { get; set; }
		public string? Bio { get; set; }
		public DateTimeOffset CreatedAt { get; set; } 
		public DateTimeOffset UpdatedAt { get; set; } 
	}
}
