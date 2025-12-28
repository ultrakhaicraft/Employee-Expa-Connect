using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Common
{
	public class UploadResultDto
	{
		public string FileUrl { get; set; } = string.Empty;
		public string FileName { get; set; } = string.Empty;
		public long FileSize { get; set; }
		public DateTime UploadDate { get; set; } = DateTime.UtcNow;
		public bool IsSuccess { get; set; } = false;

		//Specific for cloudinary error handling
		public string ErrorMessage { get; set; } = string.Empty;
	}
}
