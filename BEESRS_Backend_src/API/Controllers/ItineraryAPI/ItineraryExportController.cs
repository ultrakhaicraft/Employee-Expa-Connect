using Application.Interfaces.ItineraryService;
using Infrastructure.Helper.Enum;
using Infrastructure.Models.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace API.Controllers.Itinerary
{
	[Route("api")]
	public class ItineraryExportController : Controller
	{

		private readonly IItineraryExportService _itineraryExportService;

		public ItineraryExportController(IItineraryExportService itineraryExportService)
		{
			_itineraryExportService = itineraryExportService;
		}




		/// <summary>
		/// Export the PDF given the itinerary from the ID input (User role only) 
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <remarks>Need to editing the pdf file content lmao</remarks>
		/// <returns></returns>
		[HttpGet("export-to-pdf/{itineraryId}")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> ExportItineraryToPDF([FromRoute] Guid itineraryId)
		{
			try
			{
				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("itineraryId is required", errorStatusCode: 400));
				}

				var result = await _itineraryExportService.ExportItineraryToPdf(itineraryId);

				if (!result.Success)
				{
					return StatusCode(result.StatusCode, result);
				}

				var pdf = result.Data!;
				return File(pdf.PdfBytes, "application/pdf", pdf.FileName);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to export Itinerary into PDF file due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when export Itinerary into PDF file from Itinerary"
					}
				));
			}
		}


		/// <summary>
		/// Export to Json File (User role)
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <returns></returns>
		[HttpGet("itinerary/{itineraryId}/export/json")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> ExportToJsonFile([FromRoute] Guid itineraryId)
		{
			try
			{
				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("itineraryId is required", errorStatusCode: 400));
				}

				var result = await _itineraryExportService.ExportItineraryToJson(itineraryId);

				if (!result.Success)
				{
					return StatusCode(result.StatusCode, result);
				}

				var json = result.Data!;
				var jsonBytes = Encoding.UTF8.GetBytes(json.JsonContent);
				return File(jsonBytes, "application/json", json.FileName);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to export Itinerary into Json due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when export Itinerary into Json from Itinerary"
					}
				));
			}
		}


		/// <summary>
		/// Export to Ical File (User role)
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <returns></returns>
		[HttpGet("itinerary/{itineraryId}/export/ical")]
		[Authorize(Roles = "User")]
		public async Task<ActionResult> ExportToIcal(Guid itineraryId)
		{
			try
			{
				if (itineraryId == Guid.Empty)
				{
					return BadRequest(ApiResponse<string>.ErrorResultWithCode("itineraryId is required", errorStatusCode: 400));
				}

				var result = await _itineraryExportService.ExportItineraryToIcal(itineraryId);

				if (!result.Success)
				{
					return StatusCode(result.StatusCode, result);
				}

				var ical = result.Data!;
				return File(ical.IcalBytes, "text/calendar", ical.FileName);
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return StatusCode(500, ApiResponse<string>.ErrorResultWithCode("Failed to export Itinerary into ICal due to exception",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
					{
						e.Message ?? "Exception error caught when export Itinerary into ICal"
					}
				));
			}
		}
	}
}
