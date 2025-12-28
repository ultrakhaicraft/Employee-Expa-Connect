using Infrastructure.Helper;
using Infrastructure.Models.ItineraryItemDTO;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryDTO
{
	[ValidItineraryDayDuration(30)]
	public record ItineraryCreateAsTemplateDto
	{

		[Required(ErrorMessage = "Title is required")]
		[StringLength(200)]
		public string Title { get; set; } = string.Empty;

		public string Description { get; set; } = string.Empty;

		[Required(ErrorMessage = "Start Date is required")]
		public DateTime StartDate { get; set; }

		[Required(ErrorMessage = "End Date is required")]
		public DateTime EndDate { get; set; }

		[Required(ErrorMessage = "Trip Type is required")]
		[StringLength(50)]
		public string TripType { get; set; } = string.Empty;

		[Required(ErrorMessage = "Destination City is required")]
		[StringLength(100)]
		public string DestinationCity { get; set; } = string.Empty;

		[Required(ErrorMessage = "Destination Country is required")]
		[StringLength(50)]
		public string DestinationCountry { get; set; } = string.Empty;

		[Range(0, 99999999999.99, ErrorMessage = "TotalBudget cannot be negative or over 99999999999.99")]
		[Column(TypeName = "decimal(10,2)")]
		public decimal? TotalBudget { get; set; }

		[StringLength(3)]
		public string Currency { get; set; } = "USD";

		public bool IsPublic { get; set; } = false;

		[Required(ErrorMessage = "Template Category is required")]
		[StringLength(50)]
		public string TemplateCategory { get; set; } = string.Empty;

		[StringLength(20)]
		public string Status { get; set; } = "draft";

		[StringLength(500)]
		public string? ItineraryImageUrl { get; set; }


	}

	[ValidItineraryDayDuration(30)]
	public record ItineraryCreateNewDto
	{

		[Required(ErrorMessage ="Title is required")]
		[StringLength(200)]
		public string Title { get; set; } = string.Empty;

		public string Description { get; set; } = string.Empty;

		[Required(ErrorMessage = "Start Date is required")]
		public DateTime StartDate { get; set; }

		[Required(ErrorMessage = "End Date is required")]
		public DateTime EndDate { get; set; }

		[Required(ErrorMessage = "Trip type is required")]
		[StringLength(50)]
		public string TripType { get; set; } = string.Empty;

		[Required(ErrorMessage = "Destination City is required")]
		[StringLength(100)]
		public string DestinationCity { get; set; } = string.Empty;

		[Required(ErrorMessage = "Destination Country is required")]
		[StringLength(50)]
		public string DestinationCountry { get; set; } = string.Empty;

		[Range(0, 99999999999.99, ErrorMessage = "TotalBudget cannot be negative or over 99999999999.99")]
		[Column(TypeName = "decimal(10,2)")]
		public decimal? TotalBudget { get; set; }

		[StringLength(3)]
		public string Currency { get; set; } = "USD";

		public bool IsPublic { get; set; } = false;

		[StringLength(20)]
		public string Status { get; set; } = "draft";

		[StringLength(500)]
		public string? ItineraryImageUrl { get; set; }

	}
}
