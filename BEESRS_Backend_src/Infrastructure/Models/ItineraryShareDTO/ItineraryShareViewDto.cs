using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryShareDTO
{
	public class ItineraryShareViewDto
	{
		public Guid ShareId { get; set; }
		public Guid ItineraryId { get; set; }
		public string ItineraryName { get; set; } = string.Empty;
		public string SharedByUserName { get; set; } = string.Empty;
		public DateTimeOffset SharedAt { get; set; }
		public string PermissionLevel { get; set; } = string.Empty;

	}
}
