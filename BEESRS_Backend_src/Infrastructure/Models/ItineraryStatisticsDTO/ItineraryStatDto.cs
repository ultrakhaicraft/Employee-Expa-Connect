using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.ItineraryStatisticsDTO
{
	public class ItineraryStatDto
	{
		public int ShareCount { get; set; }
		public int TotalDaysPlanned { get; set; }
		public int TotalItineraryItems { get; set; }
		public decimal TotalEstimatedCost { get; set; }
		public double CompletionRate { get; set; }
		public decimal? TotalBudget { get; set; }
		public decimal? ActualTotalCost { get; set; }
		public decimal? TotalTransportCost { get; set; }
		public DateTimeOffset LastUpdated { get; set; }

	}
}
