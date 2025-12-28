using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryShareDTO
{
	public record ItineraryShareDetailDto
	{
		
		public Guid ShareId { get; set; } 
		public Guid ItineraryId { get; set; }
		public Guid? SharedWithUserId { get; set; }
		public string? ShareToken { get; set; }
		public string? PermissionLevel { get; set; } 
		public DateTimeOffset? ExpiresAt { get; set; }
		public DateTimeOffset SharedAt { get; set; } 
		public Guid SharedByUserId { get; set; }
		public SharedWithUser? SharedWithUser { get; set; }

	}

	public record SharedWithUser
	{
		public string UserName { get; set; } = string.Empty;
		public string Email { get; set; } = string.Empty;
		public string Avatar { get; set; } = string.Empty;
	}
}
