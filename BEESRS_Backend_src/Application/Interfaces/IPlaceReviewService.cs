using Domain.Entities;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceReview;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IPlaceReviewService
    {
        Task<ReviewDetailDTO> CreatePlaceReviewAsync(CreatePlaceReviewDTO createPlaceReviewDTO, Guid userId);
        Task<ReviewDetailDTO> GetPlaceReviewByIdAsync(Guid reviewId);
        Task<PagedResult<ReviewDetailDTO>> GetAllReviewsByPlaceIdAsync(Guid placeId, OnlyPageRequest req);
        Task DeletePlaceReviewAsync(Guid reviewId, Guid userId);
        Task<ReviewDetailDTO> UpdatePlaceReviewAsync(UpdatePlaceReviewDTO updatePlaceReviewDTO, Guid userId);
        Task<bool> IsReviewedPlace(Guid placeId, Guid userId);

        Task<int> ReportReview(ReportReviewDTO report, Guid userId);
        Task<PagedResult<ReviewWithReport>> GetAllFlaggedReviewByModeratorId(Guid moderatorId, OnlyPageRequest req);
        Task<int> ResolveReportAsync(SolveReport solveReport, Guid moderatorId);
    }
}
