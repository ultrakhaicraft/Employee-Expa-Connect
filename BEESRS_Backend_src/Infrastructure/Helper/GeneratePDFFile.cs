using Infrastructure.Models.ItineraryDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection.Metadata;
using System.Text;
using System.Threading.Tasks;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Infrastructure.Helper
{
	public static class GeneratePDFFile
	{
		public static byte[] GenerateItineraryPdf(ItineraryDetailDto itinerary)
		{
			var document = QuestPDF.Fluent.Document.Create(container =>
			{
				container.Page(page =>
				{
					page.Size(PageSizes.A4);
					page.Margin(2, Unit.Centimetre);
					page.PageColor(Colors.White);
					page.DefaultTextStyle(x => x.FontSize(12));

					// ===== HEADER =====
					page.Header().Column(column =>
					{
						column.Item().Text(itinerary.Title ?? "Untitled Itinerary")
							.Bold().FontSize(22).FontColor(Colors.Blue.Medium);
						column.Item().Text($"{itinerary.DestinationCity}, {itinerary.DestinationCountry}")
							.FontSize(14).FontColor(Colors.Grey.Darken2);
						column.Item().Text($"Duration: {itinerary.StartDate:dd MMM yyyy} - {itinerary.EndDate:dd MMM yyyy}")
							.FontSize(12).FontColor(Colors.Grey.Darken1);
					});

					// ===== CONTENT =====
					page.Content().Column(column =>
					{
						column.Spacing(10);

						if (!string.IsNullOrEmpty(itinerary.Description))
							column.Item().Text(itinerary.Description).Italic();

						column.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

						foreach (var day in itinerary.ItineraryItems.OrderBy(d => d.DayNumber))
						{
							column.Item().PaddingTop(10).Text($"Day {day.DayNumber}")
								.Bold().FontSize(16).FontColor(Colors.Blue.Darken1);

							foreach (var group in day.TimeGroups.OrderBy(g => g.TimeSlot))
							{
								column.Item().PaddingLeft(10).Text($"{group.TimeSlot} Activities").Bold();

								foreach (var activity in group.Activities)
								{
									column.Item().PaddingLeft(20).Column(col =>
									{
										col.Item().Text($"• {activity.ActivityTitle}")
											.Bold().FontColor(Colors.Black);

										if (activity.StartTime != null && activity.EndTime != null)
											col.Item().Text(
												$"  Time: {activity.StartTime:hh\\:mm} - {activity.EndTime:hh\\:mm}"
											);

										if (!string.IsNullOrEmpty(activity.TransportMethod))
											col.Item().Text($"  Transport: {activity.TransportMethod}");

										if (activity.EstimatedCost.HasValue)
											col.Item().Text($"  Cost: {activity.EstimatedCost:C}");

										if (!string.IsNullOrEmpty(activity.ActivityDescription))
											col.Item().Text($"  Note: {activity.ActivityDescription}")
											   .FontColor(Colors.Grey.Darken1);
									});
								}
							}
						}
					});

					// ===== FOOTER =====
					page.Footer().AlignCenter().Text(txt =>
					{
						txt.Span("Generated on ").FontColor(Colors.Grey.Medium);
						txt.Span($"{DateTime.UtcNow:dd MMM yyyy HH:mm} UTC").SemiBold();
					});
				});
			});

			return document.GeneratePdf();
		}
	}
}
