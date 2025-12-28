using Domain.Entities;
using Infrastructure.Models.PlaceReview;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.IPlaceRepos
{
    public interface IPlaceReviewRepository
    {
        Task<PlaceReview> AddReviewAsync(PlaceReview review);
        Task<PlaceReview> UpdateReviewAsync(PlaceReview review);
        Task<int> DeleteReviewAsync(Guid reviewId);
        Task<PlaceReview?> GetReviewByIdAsync(Guid reviewId);
        IQueryable<PlaceReview> GetReviewsByPlaceId(Guid placeId);

        Task<int> ReportReview(PlaceReviewReport placeReviewReport);
        IQueryable<PlaceReview> GetAllFlaggedReviewByBranchId(Guid branchId);
        Task<List<PlaceReviewReport>> GetAllReportsByReviewId(Guid reviewId);
        Task<int> ResolveReportAsync(SolveReport solveReport, Guid moderatorId);
        Task<bool> IsReviewedPlace(Guid placeId, Guid userId);
    }
}
