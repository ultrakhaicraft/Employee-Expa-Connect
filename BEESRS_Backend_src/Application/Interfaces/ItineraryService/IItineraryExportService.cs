using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.ItineraryService
{
	public interface IItineraryExportService
	{
		Task<ApiResponse<ItineraryPdfExportResultDto>> ExportItineraryToPdf(Guid itineraryId);
		Task<ApiResponse<ItineraryJsonExportResultDto>> ExportItineraryToJson(Guid itineraryId);
		Task<ApiResponse<ItineraryIcalExportResultDto>> ExportItineraryToIcal(Guid itineraryId);

	}
}
