using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceDTO
{
	/// <summary>
	/// Data Transfer Object for a singular Image of Place
	/// </summary>
	public record PlaceImageDto
	{
		public Guid ImageId { get; init; }
		public string ImageUrl { get; set; } = string.Empty;
		public string AltText { get; set; } = string.Empty;
		public bool IsPrimary { get; set; } 
		public int SortOrder { get; set; }
		public DateTimeOffset UploadDate { get; set; }
		public Guid UploadedBy { get; set; }
	}
}
