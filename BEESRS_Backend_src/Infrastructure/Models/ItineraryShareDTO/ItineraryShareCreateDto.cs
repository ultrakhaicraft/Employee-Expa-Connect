using Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryShareDTO
{
	public record ItineraryShareCreateDto
	{
		
		public Guid? SharedWithUserId { get; set; } = Guid.Empty; //Other user Id
		public string SharedWithEmail { get; set; } = string.Empty; //Other user email

	}
}
