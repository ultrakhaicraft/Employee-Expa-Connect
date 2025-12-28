using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserProfileDTO
{
	public class UserProfileUpdateDto
	{
		public Guid UserId { get; set; }

		[StringLength(50)]
		public string? HomeCountry { get; set; }
		[StringLength(100)]
		public string? CurrentLocationCity { get; set; }
		[StringLength(50)]
		public string? CurrentLocationCountry { get; set; }
		[StringLength(50)]
		public string Timezone { get; set; } = "UTC"; //Default to UTC
		[StringLength(20)]
		public string? DateFormat { get; set; } = "MM/dd/yyyy"; //Default to MM/dd/yyyy

		// public string? ProfilePictureUrl { get; set; }  Reason: There already a method that add avatar
		public string? Bio { get; set; }
	}
}
