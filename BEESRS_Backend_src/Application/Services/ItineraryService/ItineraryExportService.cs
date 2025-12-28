using Application.Interfaces.ItineraryService;
using AutoMapper;
using Domain.Entities;
using Infrastructure.Helper;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services.ItineraryService
{
	public class ItineraryExportService : IItineraryExportService
	{
		private readonly IItineraryRepository _itineraryRepository;
		private readonly IItineraryItemRepository _itineraryItemRepository;
		private readonly IMapper _mapper;

		public ItineraryExportService(IItineraryRepository itineraryRepository, IItineraryItemRepository itineraryItemRepository, IMapper mapper)
		{
			_itineraryRepository = itineraryRepository;
			_itineraryItemRepository = itineraryItemRepository;
			_mapper = mapper;
		}

		

		public async Task<ApiResponse<ItineraryJsonExportResultDto>> ExportItineraryToJson(Guid itineraryId)
		{

			try
			{
				var itinerary = await _itineraryRepository.GetByIdAsync(itineraryId);

				if (itinerary == null)
				{
					return ApiResponse<ItineraryJsonExportResultDto>.ErrorResultWithCode("Failed to get Itinerary detail",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						 new List<string>()
						{
							"Itinerary not found in database"
						}
					);
				}

				var itineraryDetailDto = _mapper.Map<ItineraryDetailDto>(itinerary);

				var itineraryItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);

				ItineraryJsonExportResultDto exportDto = new ItineraryJsonExportResultDto();


				if (itineraryItems != null && itineraryItems.Count > 0)
				{
					itineraryDetailDto.ItineraryItems = ItineraryHelper.ConvertListOfItineraryItemsToItineraryDayScheduleDto(itineraryItems, _mapper);
					exportDto.JsonContent = System.Text.Json.JsonSerializer.Serialize(itineraryDetailDto);
					exportDto.FileName = $"{itineraryDetailDto.Title?.Replace(" ", "_")}_Itinerary.json";

					return ApiResponse<ItineraryJsonExportResultDto>.SuccessResult(exportDto, message: "Generate PDF File of Itinerary and ItineraryItems successfully");
				}
				else
				{
					Console.WriteLine("No ItineraryItems found for ItineraryId: " + itineraryId);
					exportDto.JsonContent = System.Text.Json.JsonSerializer.Serialize(itineraryDetailDto);
					exportDto.FileName = $"{itineraryDetailDto.Title?.Replace(" ", "_")}_Itinerary.json";
					return ApiResponse<ItineraryJsonExportResultDto>.SuccessResult(exportDto, message: "Generate PDF File of Itinerary successfully");
				}
			}
			catch (Exception)
			{

				throw;
			}


		}

		public async Task<ApiResponse<ItineraryPdfExportResultDto>> ExportItineraryToPdf(Guid itineraryId)
		{

			try
			{
				var result = await _itineraryRepository.GetByIdAsync(itineraryId);

				if (result == null)
				{
					return ApiResponse<ItineraryPdfExportResultDto>.ErrorResultWithCode("Failed to get Itinerary detail",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						 new List<string>()
						{
							"Itinerary not found in database"
						}
					);
				}


				var dto = _mapper.Map<ItineraryDetailDto>(result);

				var itineraryItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);



				if (itineraryItems != null && itineraryItems.Count > 0)
				{
					dto.ItineraryItems = ItineraryHelper.ConvertListOfItineraryItemsToItineraryDayScheduleDto(itineraryItems, _mapper);

					var pdfBytes = GeneratePDFFile.GenerateItineraryPdf(dto);

					var saveFileName = $"{dto.Title?.Replace(" ", "_")}_Itinerary.pdf";

					var responseData = new ItineraryPdfExportResultDto
					{
						FileName = saveFileName,
						PdfBytes = pdfBytes
					};

					return ApiResponse<ItineraryPdfExportResultDto>.SuccessResult(responseData, message: "Export to PDF Completed");
				}
				else
				{

					return ApiResponse<ItineraryPdfExportResultDto>.ErrorResultWithCode("Failed to export Itinerary detail to PDF",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						 new List<string>()
						{
							"Itinerary Items are not found in database"
						}
					);
				}
			}
			catch (Exception)
			{

				throw;
			}
		}

		public async Task<ApiResponse<ItineraryIcalExportResultDto>> ExportItineraryToIcal(Guid itineraryId)
		{
			try
			{
				var itinerary = await _itineraryRepository.GetByIdAsync(itineraryId);

				if (itinerary == null)
				{
					return ApiResponse<ItineraryIcalExportResultDto>.ErrorResultWithCode("Failed to get Itinerary detail",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						 new List<string>()
						{
							"Itinerary not found in database"
						}
					);
				}

				var sb = new StringBuilder();
				sb.AppendLine("BEGIN:VCALENDAR");
				sb.AppendLine("VERSION:2.0");
				sb.AppendLine("PRODID:-//YourApp//Itinerary Export//EN");
				sb.AppendLine("CALSCALE:GREGORIAN");

				foreach (var item in itinerary.ItineraryItems.OrderBy(i => i.DayNumber).ThenBy(i => i.SortOrder))
				{
					// Optional: set time based on your itinerary logic
					var start = item.StartTime;
					var end = item.EndTime;

					sb.AppendLine("BEGIN:VEVENT");
					sb.AppendLine($"UID:{item.ItemId}@yourapp.com");
					sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
					sb.AppendLine($"DTSTART:{start:yyyyMMddTHHmmssZ}");
					sb.AppendLine($"DTEND:{end:yyyyMMddTHHmmssZ}");
					sb.AppendLine($"SUMMARY:{EscapeText(item.Place?.Name ?? "Itinerary Event")}");
					sb.AppendLine($"DESCRIPTION:{EscapeText(item.Place?.Description ?? itinerary.Title)}");
					if (item.Place != null)
						sb.AppendLine($"LOCATION:{EscapeText(item.Place.AddressLine1)}");
					sb.AppendLine("END:VEVENT");
				}

				sb.AppendLine("END:VCALENDAR");

				var bytes = Encoding.UTF8.GetBytes(sb.ToString());

				ItineraryIcalExportResultDto exportDto = new ItineraryIcalExportResultDto
				{
					IcalBytes = bytes,
					FileName = $"{itinerary.Title?.Replace(" ", "_")}_Itinerary.ics"
				};

				return ApiResponse<ItineraryIcalExportResultDto>.SuccessResult(exportDto, message: "Export Itinerary and ItineraryItems" +
					"to ICal successfully");
			}
			catch (Exception)
			{
				throw;
			}
		}

		private static string EscapeText(string text)
		{
			if (string.IsNullOrEmpty(text))
				return string.Empty;
			return text
				.Replace(@"\", @"\\")
				.Replace(",", @"\,")
				.Replace(";", @"\;")
				.Replace("\n", "\\n");
		}

	}
}
