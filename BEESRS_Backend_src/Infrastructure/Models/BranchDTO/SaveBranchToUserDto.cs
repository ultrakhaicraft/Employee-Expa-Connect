using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.BranchDTO
{
	public record SaveBranchToUserDto
	{
		public Guid SaveToUserId { get; set; } = Guid.Empty;
		public Guid CurrentBanchId { get; set; } = Guid.Empty;
	}
}
