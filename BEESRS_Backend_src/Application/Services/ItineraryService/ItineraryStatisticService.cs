using Application.Interfaces.ItineraryService;
using AutoMapper;
using Domain.Entities;
using Infrastructure.Configurations;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryStatisticsDTO;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services.ItineraryService
{
	public class ItineraryStatisticService : IItineraryStatisticService
	{
		private readonly IItineraryRepository _itineraryRepository;
		private readonly IItineraryItemRepository _itineraryItemRepository;
		private readonly IItineraryShareRepository _itineraryShareRepository;
		private readonly IUserRepository _userRepository;
		private readonly IUnitOfWork _unitOfWork;
		private readonly IMapper _mapper;
		private readonly ILogger<ItineraryService> _logger;

		public ItineraryStatisticService(IItineraryRepository itineraryRepository, IItineraryItemRepository itineraryItemRepository, IItineraryShareRepository itineraryShareRepository, IUserRepository userRepository, IUnitOfWork unitOfWork, IMapper mapper, ILogger<ItineraryService> logger)
		{
			_itineraryRepository = itineraryRepository;
			_itineraryItemRepository = itineraryItemRepository;
			_itineraryShareRepository = itineraryShareRepository;
			_userRepository = userRepository;
			_unitOfWork = unitOfWork;
			_mapper = mapper;
			_logger = logger;
		}

		//Get statistics related to the user in the context of itineraries
		public async Task<ApiResponse<UserItineraryStatDto>> GetUserItineraryStatisticsAsync(Guid userId)
		{
			try
			{
				var user = await _userRepository.GetByIdAsync(userId);
				if (user == null)
				{
					_logger.LogWarning("User with ID {UserId} not found when trying to get itinerary statistics.", userId);
					throw new KeyNotFoundException($"User with ID {userId} not found.");
				}

			
				var stats = new Infrastructure.Models.ItineraryStatisticsDTO.UserItineraryStatDto
				{
					ItnerariesCreated = await GetItineraryCreatedCountByUser(userId),
					TemplatesCreated = await GetTemplateCreatedCountByUser(userId),
					ItinerariesCompleted = await GetItineraryCompletedCountByUser(userId),
					ItinerariesShared = await GetItinerarySharesCreatedCountByUser(userId)
				};

				return ApiResponse<UserItineraryStatDto>.SuccessResult(stats, message: "sucessfully Calculate user itinerary statistics ");
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				throw;
			}
		}

		public async Task<ApiResponse<ItineraryStatDto>> GetItineraryStatisticsAsync(Guid itineraryId)
		{
			try
			{
				var result = await _itineraryRepository.GetByIdAsync(itineraryId);

				if (result == null)
				{
					return ApiResponse<ItineraryStatDto>.ErrorResultWithCode("Failed to calculate Itinerary statistics detail",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						 new List<string>()
						{
							"Itinerary not found in database"
						}
					);
				}
				var itineraryItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);
			

				var statDto = new ItineraryStatDto()
				{

					TotalItineraryItems = itineraryItems.Count,
					ShareCount = await GetItineraryShareCountByItineraryId(itineraryId),
					TotalDaysPlanned = await GetItineraryDayPlanned(itineraryItems),
					TotalEstimatedCost = await GetItineraryEstimatedCost(itineraryItems),
					CompletionRate = await GetItineraryCompletionRate(itineraryItems),
					TotalBudget = result.TotalBudget,
					ActualTotalCost = await GetItineraryActualTotalCost(itineraryItems),
					TotalTransportCost = await GetItineraryTotalTransportCost(itineraryItems),
					LastUpdated = result.UpdatedAt
				};

				return ApiResponse<ItineraryStatDto>.SuccessResult(statDto, message: "sucessfully Calculate Itinerary statistics detail ");
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				throw;
			}
		}

		#region private methods to get statistics

		private async Task<int> GetItineraryCreatedCountByUser(Guid userId)
		{
			//Create ItineraryPagedRequest
			var pagedRequest = new ItineraryPagedRequest
			{			
				Page = 1,
				PageSize = int.MaxValue 
			};

			var itineraries = await _itineraryRepository.GetPagedByUserIdAsync(pagedRequest, userId);

			return itineraries.TotalItems;
		}

		private async Task<int> GetTemplateCreatedCountByUser (Guid userId)
		{
			var pagedRequest = new ItineraryPagedRequest
			{
				Page = 1,
				PageSize = int.MaxValue 
			};

			var itineraries = await _itineraryRepository.GetPagedByUserIdAsync(pagedRequest, userId);
			var templateItineraries = itineraries.Items.Where(i => i.IsTemplate).ToList();
			return templateItineraries.Count;
		}

		private async Task<int> GetItineraryCompletedCountByUser(Guid userId)
		{
			//Create ItineraryPagedRequest
			var pagedRequest = new ItineraryPagedRequest
			{
				Page = 1,
				PageSize = int.MaxValue 
			};

			var itineraries = await _itineraryRepository.GetPagedByUserIdAsync(pagedRequest, userId);
			var completedItineraries = itineraries.Items.Where(i => i.CompletedAt != null).ToList();
			return completedItineraries.Count;
		}

		private async Task<int> GetItinerarySharesCreatedCountByUser(Guid userId)
		{
			//Create ItineraryPagedRequest
			var pagedRequest = new PagedRequest
			{
				Page = 1,
				PageSize = int.MaxValue
			};

			var itinerariesShare = await _itineraryShareRepository.GetPagedCreatedByUser(pagedRequest, userId);
		
			return itinerariesShare.TotalItems;
		}

		private async Task<int> GetItineraryShareCountByItineraryId(Guid itineraryId)
		{
			var shares = await _itineraryShareRepository.GetSharesByItineraryIdAsync(itineraryId);
			return shares.Count();
		}

		private async Task<int> GetItineraryDayPlanned(List<ItineraryItem> items)
		{
			await Task.Delay(100);
			if (items == null || items.Count == 0)
				return 0;
			int maxDay = items.Max(i => i.DayNumber);
			return maxDay;

		}

		private async Task<decimal> GetItineraryEstimatedCost(List<ItineraryItem> items)
		{
			await Task.Delay(100);
			var totalEstimatedCost = items.Sum(i => i.EstimatedCost);
			if(totalEstimatedCost == null)
			{
				return 0;
			}

			return (decimal)totalEstimatedCost;
		}

		private async Task<double> GetItineraryCompletionRate(List<ItineraryItem> items)
		{
			await Task.Delay(100);
			if(items.Count == 0)
			{
				return 0;
			}
			var completedItems = items.Where(i => i.IsCompleted).ToList();
			var completionRate = (double)completedItems.Count / items.Count * 100;
			return Math.Round(completionRate,2);
		}

		private async Task<decimal> GetItineraryActualTotalCost(List<ItineraryItem> items)
		{
			await Task.Delay(100);
			var SumOfActualCost = items.Sum(i => i.ActualCost);
			var SumOfTransportCost = items.Sum(i => i.TransportCost);
			var totalActualCost = SumOfActualCost + SumOfTransportCost;
			if (totalActualCost == null)
			{
				return 0;
			}
			return (decimal)totalActualCost;
		}

		private async Task<decimal> GetItineraryTotalTransportCost(List<ItineraryItem> items)
		{
			await Task.Delay(100);
			var totalTransportCost = items.Sum(i => i.TransportCost);
			if (totalTransportCost == null)
			{
				return 0;
			}
			return (decimal)totalTransportCost;	
		}
		#endregion

	}
}
