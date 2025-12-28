using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryDTO
{
	public record ItineraryPdfExportResultDto
	{
		public string FileName { get; set; } = string.Empty;
		public byte[] PdfBytes { get; set; } = Array.Empty<byte>();
	}

	public record class ItineraryJsonExportResultDto
	{
		public string FileName { get; set; } = string.Empty;
		public string JsonContent { get; set; } = string.Empty;
	}

	public record class ItineraryIcalExportResultDto
	{
		public string FileName { get; set; } = string.Empty;
		public byte[] IcalBytes { get; set; } = Array.Empty<byte>();
	}
}
