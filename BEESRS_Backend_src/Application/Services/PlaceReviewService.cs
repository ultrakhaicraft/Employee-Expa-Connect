using Application.Interfaces;
using Application.Interfaces.ThirdParty;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Domain.Entities;
using Domain.Enums;
using Domain.Enums.NotificationActionType;
using Infrastructure.Configurations;
using Infrastructure.Helper;
using Infrastructure.Interfaces;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.Common;
using Infrastructure.Models.NotificationDTO;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Models.PlaceReview;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Application.Services
{
    public class PlaceReviewService : IPlaceReviewService
    {
        private readonly IPlaceReviewRepository _placeReviewRepository;
        private readonly IPlaceRepository _placeRepository;
        private readonly INotificationService _notificationService;
		private readonly IReviewImageRepository _reviewImageRepository;
        private readonly IUserRepository _userRepository;
        private readonly IContentSafetyService _contentSafetyService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        public PlaceReviewService(IPlaceReviewRepository placeReviewRepository,INotificationService notificationService,
            IPlaceRepository placeRepository, IReviewImageRepository reviewImageRepository,
            IUserRepository userRepository, IContentSafetyService contentSafetyService,IUnitOfWork unitOfWork, IMapper mapper)
        {
            _placeReviewRepository = placeReviewRepository;
            _placeRepository = placeRepository;
            _notificationService = notificationService;
			_reviewImageRepository = reviewImageRepository;
            _userRepository = userRepository;
            _contentSafetyService = contentSafetyService;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }
        public async Task<ReviewDetailDTO> CreatePlaceReviewAsync(CreatePlaceReviewDTO createPlaceReviewDTO, Guid userId)
        {
            var transaction = await _unitOfWork.BeginTransactionAsync();
            try
            {
                var newPlaceReview = _mapper.Map<PlaceReview>(createPlaceReviewDTO);
                newPlaceReview.UserId = userId;
                newPlaceReview.ModerationStatus = Domain.Enums.ReviewStatus.Approved;

                // Use third place api to check image and text content after creation
                // Check text review content
                var checkTextResult = await _contentSafetyService.CheckTextSafetyAsync(newPlaceReview.ReviewText);

                // Save review
                newPlaceReview = await _placeReviewRepository.AddReviewAsync(newPlaceReview);

                // Add Review Images
                foreach (var imageUrl in createPlaceReviewDTO.ReviewImagesList)
                {
                    var reviewImage = new ReviewImage
                    {
                        ReviewId = newPlaceReview.ReviewId,
                        ImageUrl = imageUrl,
                        UploadedAt = DateTimeOffset.UtcNow
                    };
                    await _reviewImageRepository.AddReviewImageAsync(reviewImage);
                }
                if (transaction != null)
                    await _unitOfWork.CommitAsync();


                // Update average rating of the place after adding new review
                await _placeRepository.UpdateAverage(createPlaceReviewDTO.PlaceId);

                var newReview = await _placeReviewRepository.GetReviewByIdAsync(newPlaceReview.ReviewId);
                var result = _mapper.Map<ReviewDetailDTO>(newReview);
                result.ReviewImageUrls = createPlaceReviewDTO.ReviewImagesList;
                return result;
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        public async Task DeletePlaceReviewAsync(Guid reviewId, Guid userId)
        {
            var review = await _placeReviewRepository.GetReviewByIdAsync(reviewId);
            if (review == null)
                throw new KeyNotFoundException($"Review with id {reviewId} not found.");
            if (review.UserId != userId)
                throw new UnauthorizedAccessException("You are not authorized to delete this review.");

            await _placeReviewRepository.DeleteReviewAsync(reviewId);

            await _placeRepository.UpdateAverage(review.PlaceId);
        }

        public async Task<PagedResult<ReviewDetailDTO>> GetAllReviewsByPlaceIdAsync(Guid placeId, OnlyPageRequest req)
        {
            var reviews = _placeReviewRepository.GetReviewsByPlaceId(placeId);
            var pagedResult = await PageConverter<ReviewDetailDTO>.ToPagedResultAsync(
                req.Page, req.PageSize, reviews.Count(), reviews.ProjectTo<ReviewDetailDTO>(_mapper.ConfigurationProvider));
            foreach (var review in pagedResult.Items)
            {
                review.ReviewImageUrls = (await _reviewImageRepository.GetReviewImagesByReviewIdAsync(review.ReviewId)).Select(img => img.ImageUrl).ToList();
            }
            return pagedResult;
        }

        public async Task<ReviewDetailDTO> GetPlaceReviewByIdAsync(Guid reviewId)
        {
            var review = await _placeReviewRepository.GetReviewByIdAsync(reviewId);
            return _mapper.Map<ReviewDetailDTO>(review);
        }

        public async Task<ReviewDetailDTO> UpdatePlaceReviewAsync(UpdatePlaceReviewDTO updatePlaceReviewDTO, Guid userId)
        {
            var transaction = await _unitOfWork.BeginTransactionAsync();
            try
            {
                var existingReview = await _placeReviewRepository.GetReviewByIdAsync(updatePlaceReviewDTO.ReviewId);

                if (existingReview == null)
                    throw new KeyNotFoundException($"Review with id {updatePlaceReviewDTO.ReviewId} not found.");

                if (existingReview.UserId != userId)
                    throw new UnauthorizedAccessException("You are not authorized to update this review.");

                // Check text review content
                var checkTextResult = await _contentSafetyService.CheckTextSafetyAsync(updatePlaceReviewDTO.ReviewText);

                // Update review details
                _mapper.Map(updatePlaceReviewDTO, existingReview);
                // Handle Review Images
                var existingImages = await _reviewImageRepository.GetReviewImagesByReviewIdAsync(updatePlaceReviewDTO.ReviewId);

                var existingImageUrls = existingImages.Select(img => img.ImageUrl).ToList();
                var updatedImageUrls = updatePlaceReviewDTO.ReviewImagesList;

                var newImageUrls = updatedImageUrls.Except(existingImageUrls).ToList();
                var removedImageUrls = existingImageUrls.Except(updatedImageUrls).ToList();

                // Remove images that are in the removed list
                var imagesToRemove = existingImages.Where(img => removedImageUrls.Contains(img.ImageUrl)).ToList();
                _reviewImageRepository.RemoveImageList(imagesToRemove);

                // Add new images that are in the new list
                var newReviewImages = newImageUrls.Select(url => new ReviewImage
                {
                    ReviewId = updatePlaceReviewDTO.ReviewId,
                    ImageUrl = url,
                    UploadedAt = DateTimeOffset.UtcNow
                }).ToList();

                if (newReviewImages.Any())
                    await _reviewImageRepository.AddImageList(newReviewImages);

                // Use third place api to check image and text content before update

                var updatedPlace = await _placeReviewRepository.UpdateReviewAsync(existingReview);

                if (transaction != null)
                    await _unitOfWork.CommitAsync();

                // Update average rating of the place after updating review
                await _placeRepository.UpdateAverage(existingReview.PlaceId);

                var result = _mapper.Map<ReviewDetailDTO>(updatedPlace);
                result.ReviewImageUrls = existingReview.ReviewImages.Select(ri => ri.ImageUrl).ToList();
                return result;
            }
            catch
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> IsReviewedPlace(Guid placeId, Guid userId)
        {
            return await _placeReviewRepository.IsReviewedPlace(placeId, userId);
        }

        public async Task<int> ReportReview(ReportReviewDTO report, Guid userId)
        {
            var placeReviewReport = new PlaceReviewReport
            {
                ReviewId = report.ReviewId,
                ReportedByUserId = userId,
                Reason = report.Reason,
                ReportedAt = DateTimeOffset.UtcNow,
                IsResolved = false
            };
            return await _placeReviewRepository.ReportReview(placeReviewReport);
        }
        public async Task<PagedResult<ReviewWithReport>> GetAllFlaggedReviewByModeratorId(Guid moderatorId, OnlyPageRequest req)
        {
            var moderator = await _userRepository.GetByIdAsync(moderatorId);
            if (moderator == null)
                throw new KeyNotFoundException($"Can not found your ID!");

            var reviews = _placeReviewRepository.GetAllFlaggedReviewByBranchId(moderator.CurrentBranchId);
            var pagedResult = await PageConverter<ReviewWithReport>.ToPagedResultAsync(
                req.Page, req.PageSize, reviews.Count(), reviews.ProjectTo<ReviewWithReport>(_mapper.ConfigurationProvider));

            return pagedResult;
        }

        public async Task<int> ResolveReportAsync(SolveReport solveReport, Guid moderatorId)
        {
            return await _placeReviewRepository.ResolveReportAsync(solveReport, moderatorId);
        }

        
		
	}
        
}
