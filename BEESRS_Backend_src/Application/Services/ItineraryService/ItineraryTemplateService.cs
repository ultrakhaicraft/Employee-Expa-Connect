using Application.Interfaces.ItineraryService;
using AutoMapper;
using Domain.Entities;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services.ItineraryService
{
	public class ItineraryTemplateService : IItineraryTemplateService
	{
		private readonly IItineraryRepository _itineraryRepository;
		private readonly IMapper _mapper;
		private readonly ILogger<ItineraryTemplateService> _logger;

		public ItineraryTemplateService(IItineraryRepository itineraryRepository, IMapper mapper, ILogger<ItineraryTemplateService> logger)
		{
			_itineraryRepository = itineraryRepository;
			_mapper = mapper;
			_logger = logger;
		}



		/// <summary>
		/// Get all public itinerary templates
		/// </summary>
		public async Task<ApiResponse<PagedResult<ItineraryTemplateDto>>> GetPublicTemplatesAsync(ItineraryPagedRequest request)
		{
			try
			{
				var pagedResult = await _itineraryRepository.SearchAllItinerary(request);

				var filtered = pagedResult.Items
					.Where(i => i.IsTemplate && i.IsPublic)
					.ToList();

				var dtoList = _mapper.Map<List<ItineraryTemplateDto>>(filtered);

				var dtoPaged = new PagedResult<ItineraryTemplateDto>(
					request.Page,
					request.PageSize,
					dtoList.Count,
					dtoList
				);

				return ApiResponse<PagedResult<ItineraryTemplateDto>>.SuccessResult(dtoPaged, "Get public itinerary templates successfully.");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to fetch public itinerary templates");
				throw;
			}
		}

		/// <summary>
		/// Get templates created by the current user
		/// </summary>
		public async Task<ApiResponse<PagedResult<ItineraryTemplateDto>>> GetMyTemplatesAsync(ItineraryPagedRequest request, Guid userId)
		{
			try
			{
				var pagedResult = await _itineraryRepository.GetPagedByUserIdAsync(request, userId);

				var filtered = pagedResult.Items
					.Where(i => i.IsTemplate)
					.ToList();

				var dtoList = _mapper.Map<List<ItineraryTemplateDto>>(filtered);

				var dtoPaged = new PagedResult<ItineraryTemplateDto>(
					request.Page,
					request.PageSize,
					dtoList.Count,
					dtoList
				);

				return ApiResponse<PagedResult<ItineraryTemplateDto>>.SuccessResult(dtoPaged, "Get user's itinerary templates successfully.");
			}
			catch (Exception ex)
			{
				_logger.LogError(ex, "Failed to fetch user itinerary templates");
				throw;
			}
		}

		public async Task<ApiResponse<Guid>> ConvertToTemplateAsync(Guid itineraryId, string? category = null)
		{
			try
			{
				var source = await _itineraryRepository.GetByIdAsync(itineraryId);

				if (source == null)
					return ApiResponse<Guid>.ErrorResultWithCode("Failed to converting Itinerary to template", 
						errorStatusCode:(int) ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary not found with the provided ID."
						}
				);

				// Create new itinerary itinerary by copying from the source
				var template = new Itinerary
				{
					UserId = source.UserId,
					Title = $"{source.Title} (Template)",
					Description = source.Description,
					StartDate = source.StartDate,
					EndDate = source.EndDate,
					TripType = source.TripType,
					DestinationCity = source.DestinationCity,
					DestinationCountry = source.DestinationCountry,
					TotalBudget = source.TotalBudget,
					Currency = source.Currency,
					IsPublic = true,
					IsTemplate = true,
					TemplateCategory = category ?? source.TemplateCategory ?? "Other",
					Status = "template",
					CreatedAt = DateTimeOffset.Now,
					UpdatedAt = DateTimeOffset.Now
				};

				// Clone itinerary items from source to this itinerary template
				foreach (var item in source.ItineraryItems)
				{
					var newItem = new ItineraryItem
					{					
						ItineraryId = template.ItineraryId,
						PlaceId = item.PlaceId,
						DayNumber = item.DayNumber,
						StartTime= item.StartTime,
						EndTime= item.EndTime,
						ActualDuration = item.ActualDuration,
						EstimatedDuration = item.EstimatedDuration,
						ActivityTitle = item.ActivityTitle,
						ActivityDescription = item.ActivityDescription,
						ActivityType= item.ActivityType,
						EstimatedCost = item.EstimatedCost,
						ActualCost= item.ActualCost,
						BookingReference = item.BookingReference,
						BookingStatus= item.BookingStatus,
						TransportMethod= item.TransportMethod,
						TransportDuration= item.TransportDuration,
						TransportCost= item.TransportCost,
						IsCompleted = false,
						CompletionNotes = null,
						SortOrder = item.SortOrder,
						CreatedAt = DateTimeOffset.Now,
						UpdatedAt = DateTimeOffset.Now
					};
					template.ItineraryItems.Add(newItem);
				}

				await _itineraryRepository.CreateAsync(template);

	            return ApiResponse<Guid>.SuccessResult(template.ItineraryId, "Converted itinerary to template successfully.");
			}
			catch (Exception e)
			{

				throw;
			}
		}

	}
}
