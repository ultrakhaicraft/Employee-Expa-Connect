using Application.Hubs;
using Application.Interfaces;
using Application.Interfaces.ItineraryService;
using Application.Interfaces.ThirdParty;
using AutoMapper;
using Domain.Entities;
using Domain.Enums;
using Domain.Enums.NotificationActionType;
using Infrastructure.Configurations;
using Infrastructure.Helper;
using Infrastructure.Helper.Enum;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Models.ItineraryItemDTO;
using Infrastructure.Models.ItineraryShareDTO;
using Infrastructure.Models.NotificationDTO;
using Infrastructure.Models.UserProfileDTO;
using Infrastructure.Repositories;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Application.Services.ItineraryService
{
	public class ItineraryService : IItineraryService
	{
		private readonly IItineraryRepository _itineraryRepository;
		private readonly IItineraryItemRepository _itineraryItemRepository;
		private readonly INotificationService _notificationService;
		private readonly ICloudinaryHelper _cloudinaryHelper;
		private readonly IUnitOfWork _unitOfWork;
		private readonly IMapper _mapper;
		private readonly ILogger<ItineraryService> _logger;

		public ItineraryService(
			IItineraryRepository itineraryRepository, IItineraryItemRepository itineraryItemRepository,
			IItineraryShareRepository itineraryShareRepository,
			INotificationService notificationService,
			ICloudinaryHelper cloudinaryHelper,
			IUnitOfWork unitOfWork, IMapper mapper, ILogger<ItineraryService> logger)
		{
			_itineraryRepository = itineraryRepository;
			_itineraryItemRepository = itineraryItemRepository;
			_notificationService = notificationService;
			_cloudinaryHelper = cloudinaryHelper;
			_unitOfWork = unitOfWork;
			_mapper = mapper;
			_logger = logger;
		}


		public async Task<ApiResponse<Guid>> CreateNewAsync(ItineraryCreateNewDto request, Guid userId)
		{

			await _unitOfWork.BeginTransactionAsync();
			try
			{
				
				var itinerary = _mapper.Map<Domain.Entities.Itinerary>(request);


				itinerary.UserId = userId;
				itinerary.IsTemplate = false;  //Default into false
				itinerary.TemplateCategory = ""; //Default into empty string
				itinerary.ItineraryImageUrl = string.IsNullOrEmpty(request.ItineraryImageUrl)  //Ensure not null
					? string.Empty 
					: request.ItineraryImageUrl;

				//Convert updatedAt and createdAt to Utc +0 timezone when saving to database
				itinerary.CreatedAt = DateTimeOffset.UtcNow;
				itinerary.UpdatedAt = DateTimeOffset.UtcNow;


				var resultItinerary = await _itineraryRepository.CreateAsync(itinerary);

				if (resultItinerary == null)
				{
					await _unitOfWork.RollbackAsync();
					return ApiResponse<Guid>.ErrorResultWithCode("Failed to create Itinerary in database",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							 "Unable to save Itinerary"
						}
					);
				}

				await _unitOfWork.CommitAsync();

				return ApiResponse<Guid>.SuccessResult(resultItinerary.ItineraryId,
					message: "Create Itinerary  successfully");

			}
			catch (Exception)
			{
				await _unitOfWork.RollbackAsync();
				throw;
			}
		}


		/// <summary>
		/// Create Itinerary as Template
		/// </summary>
		/// <param name="request"></param>
		/// <param name="userId"></param>
		/// <returns></returns>
		public async Task<ApiResponse<Guid>> CreateAsTemplateAsync(ItineraryCreateAsTemplateDto request, Guid userId)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				var itinerary = _mapper.Map<Domain.Entities.Itinerary>(request);
				itinerary.UserId = userId;
				itinerary.ItineraryImageUrl = string.IsNullOrEmpty(request.ItineraryImageUrl) 
					? string.Empty 
					: request.ItineraryImageUrl; // Ensure ItineraryImageUrl is not null (database constraint)

				itinerary.IsTemplate = true;  // Set this itinerary into template
				itinerary.TemplateCategory = request.TemplateCategory;

				//Convert updatedAt and createdAt to Utc +0 timezone when saving to database
				itinerary.CreatedAt = DateTimeOffset.UtcNow;
				itinerary.UpdatedAt = DateTimeOffset.UtcNow;

				var resultItinerary = await _itineraryRepository.CreateAsync(itinerary);

				if (resultItinerary == null)
				{
					await _unitOfWork.RollbackAsync();
					return ApiResponse<Guid>.ErrorResultWithCode("Failed to create Itinerary as template in database",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							 "Unable error to save Itinerary as template"
						}
					);
				}

				await _unitOfWork.CommitAsync();

				return ApiResponse<Guid>.SuccessResult(resultItinerary.ItineraryId,
						message: "Create Itinerary as template successfully");
				
			}
			catch (Exception)
			{
				await _unitOfWork.RollbackAsync();
				throw;
			}
		}
		public async Task<ApiResponse<bool>> DeleteItineraryByIdAsync(Guid itineraryId, Guid senderId)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				
				var exisitingItinerary = await _itineraryRepository.GetByIdAsync(itineraryId);
				if (exisitingItinerary == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to delete Itinerary",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							"Can't found itinerary to delete"
						}
					);
				}


				var result = await _itineraryRepository.DeleteAsync(itineraryId);

				if (!result)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to delete Itinerary",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							"Unable to do delete operation in database"
						}
					);
				}

				await _unitOfWork.CommitAsync();

				return ApiResponse<bool>.SuccessResult(true, message: "Delete Itinerary successfully");
			}
			catch (Exception)
			{
				await _unitOfWork.RollbackAsync();
				throw;
			}
		}

		public async Task<ApiResponse<Infrastructure.Models.Common.PagedResult<ItineraryViewDto>>>
			GetAllPagedByUserAsync(ItineraryPagedRequest request, Guid userId)
		{
			try
			{
				var pagedData = await _itineraryRepository.GetPagedByUserIdAsync(request, userId);

				if (pagedData == null || pagedData.Items == null || pagedData.Items.Count == 0)
				{
					return ApiResponse<Infrastructure.Models.Common.PagedResult<ItineraryViewDto>>.ErrorResultWithCode("No Itinerary found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"No Itinerary found in database"
						}
					);
				}

				var mapped = pagedData.Items.Select(u => _mapper.Map<ItineraryViewDto>(u)).ToList();
				var DtoData = new Infrastructure.Models.Common.PagedResult<ItineraryViewDto>(pagedData.Page, pagedData.PageSize, pagedData.TotalItems, mapped);

			
				return ApiResponse<Infrastructure.Models.Common.PagedResult<ItineraryViewDto>>.SuccessResult(DtoData, message: "Get all Itinerary successfully");

			}
			catch (Exception)
			{
				
				throw;

			}
		}

		/// <summary>
		/// Search all Itinerary by UserId
		/// </summary>
		/// <param name="request"></param>
		/// <param name="targetUserId"></param>
		/// <returns></returns>
		public async Task<ApiResponse<Infrastructure.Models.Common.PagedResult<ItineraryViewDto>>> SearchAllPagedByUserId(ItineraryPagedRequest request, Guid userId)
		{
			try
			{
				var pagedData = await _itineraryRepository.SearchAllItineraryByUserId(request, userId);

				if (pagedData == null || pagedData.Items == null || !pagedData.Items.Any())
				{
					return ApiResponse<Infrastructure.Models.Common.PagedResult<ItineraryViewDto>>.ErrorResultWithCode(
						"No itineraries found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string> { "No itineraries found matching search or filters" });
				}

				var mapped = pagedData.Items.Select(u => _mapper.Map<ItineraryViewDto>(u)).ToList();
				var dtoData = new Infrastructure.Models.Common.PagedResult<ItineraryViewDto>(pagedData.Page, pagedData.PageSize, pagedData.TotalItems, mapped);

				return ApiResponse<Infrastructure.Models.Common.PagedResult<ItineraryViewDto>>.SuccessResult(dtoData, "Fetched itineraries successfully");
			}
			catch (Exception)
			{
				throw;
			}
		}
		public async Task<ApiResponse<ItineraryDetailDto>> GetItineraryDetailByIdAsync(Guid itineraryId)
		{
			try
			{
				var result = await _itineraryRepository.GetByIdAsync(itineraryId);

				if (result == null)
				{
					return ApiResponse<ItineraryDetailDto>.ErrorResultWithCode("Itinerary detail not found",
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

					//Calculate Total Estimate Cost and Total Actual Cost
					ItineraryHelper.CalculateItineraryCosts(dto);


					return ApiResponse<ItineraryDetailDto>.SuccessResult(dto, message: "Get Itinerary and ItineraryItems successfully");
				}
				else
				{
					Console.WriteLine("No ItineraryItems found for ItineraryId: " + itineraryId);
					return ApiResponse<ItineraryDetailDto>.SuccessResult(dto, message: "Get Itinerary successfully");
				}

			}
			catch (Exception)
			{

				throw;
			}
		}

		/// <summary>
		/// Update basic Itinerary info, not including ItineraryItems info
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <param name="request"></param>
		/// <param name="senderId"></param>
		/// <returns></returns>
		public async Task<ApiResponse<bool>> UpdateItineraryAsync(Guid itineraryId, ItineraryUpdateDto request, Guid senderId)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				var existing = await _itineraryRepository.GetByIdAsync(itineraryId);

				if (existing == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to update Itinerary due to Itinerary not exist",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary not found in database"
						}
				);
				}

				//Validate affected itinerary items when updating StartDate and EndDate
				var itineraryItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(itineraryId);
				bool result = ItineraryHelper.IsAnyItineraryItemAffectedByDayChange(itineraryItems,request.StartDate,request.EndDate);
				if (result)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to update itinerary date due to conflict with items",
						errorStatusCode: (int)ResponseCode.BadRequest,
						new List<string>()
						{
							$"There exist itinerary items before {request.EndDate.ToString()}, please delete or move the itinerary items before" +
							$" updating day"
						}
						);
				}

				//Applying request changes to existing entity
				var userProfile = _mapper.Map(request, existing);

				// Ensure ItineraryImageUrl is not null (only update if provided), If not provided, keep existing value (don't set to null)
				if (request.ItineraryImageUrl != null)
				{
					userProfile.ItineraryImageUrl = string.IsNullOrEmpty(request.ItineraryImageUrl) 
						? string.Empty 
						: request.ItineraryImageUrl;
				}

				//Convert updatedAt to Utc +0 timezone when saving to database
				existing.UpdatedAt = DateTimeOffset.UtcNow;


				//Update the entity to database
				await _itineraryRepository.UpdateAsync(userProfile);

				await _unitOfWork.CommitAsync();

				return ApiResponse<bool>.SuccessResult(true, message: "Update Itinerary successfully");
			}
			catch (Exception)
			{
				await _unitOfWork.RollbackAsync();
				throw;
			}
		}

		public async Task<ApiResponse<bool>> SaveAsTemplate(Guid exisitingItineraryId)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				var existing = await _itineraryRepository.GetByIdAsync(exisitingItineraryId);

				if (existing == null)
				{
					return ApiResponse<bool>.ErrorResultWithCode("Failed to save Itinerary as template due to itinerary not found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary not found in database"
						}
				);
				}

				existing.IsTemplate = true; //Set as template

				//Convert updatedAt to Utc +0 timezone when saving to database
				existing.UpdatedAt = DateTimeOffset.UtcNow;

				await _itineraryRepository.UpdateAsync(existing);

				await _unitOfWork.CommitAsync();

				return ApiResponse<bool>.SuccessResult(true, message: "Save Itinerary as template successfully");
			}
			catch (Exception)
			{
				await _unitOfWork.RollbackAsync();
				throw;
			}
		}

		public async Task<ApiResponse<Guid>> DuplicateItineraryAsync(Guid userId, Guid ExistingItineraryId)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				var existing = await _itineraryRepository.GetByIdAsync(ExistingItineraryId);

				if (existing == null)
				{
					return ApiResponse<Guid>.ErrorResultWithCode("Failed to get Itinerary detail due to not found",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						 new List<string>()
						{
							"Itinerary not found in database"
						}
					);
				}

				//Copy the Itinerary entity and create new one with different Id
				Itinerary newDuplicatedItinerary = await CopyItinerary(existing, userId);


				await _unitOfWork.CommitAsync();
				return ApiResponse<Guid>.SuccessResult(newDuplicatedItinerary.ItineraryId, "Itinerary duplicated successfully");

			}
			catch (Exception e)
			{

				await _unitOfWork.RollbackAsync();
				throw;
			}
		}

		public async Task<ApiResponse<UploadResultDto>> AddImageAsync(Guid itineraryId, IFormFile imageFile, Guid senderId)
		{
			await _unitOfWork.BeginTransactionAsync();
			try
			{
				//Only allow 10 MB pdf file size
				if (imageFile.Length > 10 * 1024 * 1024)
				{
					return ApiResponse<UploadResultDto>.ErrorResultWithCode("Failed to upload file due to size exceed 10MB",
						errorStatusCode: (int)ResponseCode.BadRequest, new List<string>()
						{
							"Image file must not exceed 10MB"
						}
					);
				}

				var exisitingItinerary = await _itineraryRepository.GetByIdAsync(itineraryId);
				if (exisitingItinerary == null)
				{
					return ApiResponse<UploadResultDto>.ErrorResultWithCode("Failed to delete Itinerary",
					errorStatusCode: (int)ResponseCode.InternalServerError,
					new List<string>()
						{
							"Can't found itinerary to Add image"
						}
					);
				}

				//Check if there exisiting Itinerary image Url, if yes delete the old one and upload the new
				var existingAvatarUrl = exisitingItinerary.ItineraryImageUrl;

				if (!string.IsNullOrEmpty(existingAvatarUrl))
				{


					var deletionResult = await _cloudinaryHelper.DeleteImageAsync(existingAvatarUrl, FolderTag.UserAvatar.ToString());
					if (deletionResult.Result != "ok" && deletionResult.Result != "not found")
					{
						return ApiResponse<UploadResultDto>.ErrorResultWithCode(
							"Failed to delete old itinerary images from Cloudinary",
							errorStatusCode: (int)ResponseCode.InternalServerError,
							new List<string> { deletionResult.Error?.Message ?? "Unknown delete error" }
						);
					}
				}

				//Upload the image to Cloudinary
				var resultDto = await _cloudinaryHelper.UploadSingleImageAsync(imageFile, FolderTag.UserAvatar.ToString());

				if (!resultDto.IsSuccess)
				{
					return ApiResponse<UploadResultDto>.ErrorResultWithCode("Failed to upload file due to exception",
						errorStatusCode: (int)ResponseCode.InternalServerError,
						new List<string>()
						{
							resultDto.ErrorMessage ?? "Unknown error occurred during file upload"
						}
					);
				}

				//Add the avatar URL to the user's profile in the database
				await _itineraryRepository.AddItineraryImage(itineraryId, resultDto.FileUrl);

				await _unitOfWork.CommitAsync();

				return ApiResponse<UploadResultDto>.SuccessResult(resultDto, message: "Itinerary Image uploaded successfully");
			}
			catch (Exception )
			{

				await _unitOfWork.RollbackAsync();
				throw;
			}
		}


		/// <summary>
		/// Check if the user is the owner of the itinerary
		/// </summary>
		/// <param name="itineraryId"></param>
		/// <param name="userId"></param>
		/// <returns></returns>
		public async Task<ApiResponse<string>> CheckItineraryOwner(Guid itineraryId, Guid userId)
		{

			var itinerary = await _itineraryRepository.GetByIdAsync(itineraryId);


			if (itinerary == null)
			{
				return ApiResponse<string>.ErrorResultWithCode("Itinerary not found", errorStatusCode: 404);
			}


			if (!(itinerary.UserId == userId))
			{
				return ApiResponse<string>.ErrorResultWithCode("You must be an Itinerary Owner to perform this action", errorStatusCode: 403);
			}


			return ApiResponse<string>.SuccessResult("Check completed, User is the Itinerary Owner");


		}

		/// <summary>
		/// Check if the user is the owner of the itinerary by ItineraryItemId
		/// </summary>
		/// <param name="itineraryItemId"></param>
		/// <param name="userId"></param>
		/// <returns></returns>
		public async Task<ApiResponse<string>> CheckItineraryOwnerByItineraryItem(Guid itineraryItemId, Guid userId)
		{
			

				//Get ItineraryId from ItineraryItem
				var itineraryItem = await _itineraryItemRepository.GetByIdAsync(itineraryItemId);

				if (itineraryItem == null)
				{
					return ApiResponse<string>.ErrorResultWithCode("Itinerary Item not found",
						errorStatusCode: (int)ResponseCode.NotFound,
						new List<string>()
						{
							"Itinerary Item not found in database"
						}
					);
				}


				return await CheckItineraryOwner(itineraryItem.ItineraryId, userId);
			
		}

	
		private async Task<Itinerary> CopyItinerary(Itinerary existing, Guid userId)
		{
		

				var newItinerary = new Itinerary
				{
					ItineraryId = Guid.NewGuid(),
					UserId = userId,
					Title = $"{existing.Title} (Copy)",
					Description = existing.Description,
					StartDate = existing.StartDate,
					EndDate = existing.EndDate,
					TripType = existing.TripType,
					DestinationCity = existing.DestinationCity,
					DestinationCountry = existing.DestinationCountry,
					TotalBudget = existing.TotalBudget,
					Currency = existing.Currency,
					IsPublic = existing.IsPublic,
					IsTemplate = existing.IsTemplate,
					TemplateCategory = existing.TemplateCategory, 
					Status = "draft",
					ItineraryImageUrl = string.IsNullOrEmpty(existing.ItineraryImageUrl) ? string.Empty : existing.ItineraryImageUrl,
					CreatedAt = DateTimeOffset.UtcNow,
					UpdatedAt = DateTimeOffset.UtcNow,
					CompletedAt = null
				};

				await _itineraryRepository.CreateAsync(newItinerary);


				var existingItems = await _itineraryItemRepository.GetAllByItineraryIdAsync(existing.ItineraryId);
				if (existingItems != null && existingItems.Any())
				{
					var now = DateTimeOffset.UtcNow;
					var newItems = existingItems.Select(i => new ItineraryItem
					{
						ItemId = Guid.NewGuid(),
						ItineraryId = newItinerary.ItineraryId,
						TimeSlotType = i.TimeSlotType,
						PlaceId = i.PlaceId,
						DayNumber = i.DayNumber,
						StartTime = i.StartTime,
						EndTime = i.EndTime,
						ActualDuration = i.ActualDuration,
						EstimatedDuration = i.EstimatedDuration,
						ActivityTitle = i.ActivityTitle,
						ActivityDescription = i.ActivityDescription,
						ActivityType = i.ActivityType,
						EstimatedCost = i.EstimatedCost,
						ActualCost = i.ActualCost,
						BookingReference = i.BookingReference,
						BookingStatus = i.BookingStatus,
						TransportMethod = i.TransportMethod,
						TransportDuration = i.TransportDuration,
						TransportCost = i.TransportCost,
						IsCompleted = i.IsCompleted,        
						CompletionNotes = i.CompletionNotes != null ? i.CompletionNotes : string.Empty,      
						SortOrder = i.SortOrder,
						CreatedAt = now,
						UpdatedAt = now
					}).ToList();

					await _itineraryItemRepository.CreateBatchAsync(newItems);
				}

				return newItinerary;
			
		}


	}

}
