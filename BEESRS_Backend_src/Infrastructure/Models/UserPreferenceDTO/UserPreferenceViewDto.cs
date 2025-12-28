using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserPreferenceDTO
{
	public record UserPreferenceViewDto
	{
		public Guid PreferenceId { get; set; }
		public Guid UserId { get; set; }
		public DateTimeOffset CreatedAt { get; set; }
		public DateTimeOffset UpdatedAt { get; set; }
	}
}
