using Domain.Entities;
using Domain.Enums;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Models.PlaceReview;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NetTopologySuite.Mathematics;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.PlaceRepos
{
    public class PlaceReviewRepository : IPlaceReviewRepository
    {
        private readonly BEESRSDBContext _context;
        public PlaceReviewRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task<PlaceReview> AddReviewAsync(PlaceReview review)
        {
            var existingReview = await _context.PlaceReviews.Include(r => r.ReviewImages)
                .FirstOrDefaultAsync(r => r.PlaceId == review.PlaceId && r.UserId == review.UserId);

            if (existingReview != null)
                throw new InvalidOperationException("You have already reviewed this place.");

            var result = await _context.PlaceReviews.AddAsync(review);
            return result.Entity;
        }

        public async Task<int> DeleteReviewAsync(Guid reviewId)
        {
            var review = await _context.PlaceReviews.FindAsync(reviewId);
            if (review == null)
                throw new KeyNotFoundException($"Review with ID {reviewId} not found.");

            _context.PlaceReviews.Remove(review);
            return await _context.SaveChangesAsync();
        }

        public async Task<PlaceReview?> GetReviewByIdAsync(Guid reviewId)
        {
            var review = await _context.PlaceReviews
                .Include(r => r.User)
                    .ThenInclude(u => u.UserProfile)
                .Include(r => r.Place)
                .Include(r => r.ReviewImages)
                .FirstOrDefaultAsync(r => r.ReviewId == reviewId);
            if (review == null)
                throw new KeyNotFoundException($"Review with ID {reviewId} not found.");

            return review;
        }

        public IQueryable<PlaceReview> GetReviewsByPlaceId(Guid placeId)
        {
            var reviews = _context.PlaceReviews
                .Where(r => r.PlaceId == placeId)
                .Include(r => r.User)
                .ThenInclude(u => u.UserProfile)
                .Include(r => r.Place)
                .OrderBy(r => r.CreatedAt)
                .AsQueryable();
            return reviews;
        }

        public async Task<PlaceReview> UpdateReviewAsync(PlaceReview review)
        {
            _context.PlaceReviews.Update(review);
            return review;
        }

        // Reporting and Moderation Methods
        public async Task<int> ReportReview(PlaceReviewReport placeReviewReport)
        {
            var review = await _context.PlaceReviews.FindAsync(placeReviewReport.ReviewId);
            if (review == null)
                throw new KeyNotFoundException($"Review with ID {placeReviewReport.ReviewId} not found.");

            var existingReport = await _context.PlaceReviewReports
                .FirstOrDefaultAsync(r => r.ReviewId == placeReviewReport.ReviewId && r.ReportedByUserId == placeReviewReport.ReportedByUserId && r.IsResolved == false);
            if (existingReport != null)
                throw new InvalidOperationException("You have already reported this review and it is pending resolution.");

            await _context.PlaceReviewReports.AddAsync(placeReviewReport);
            if (!review.IsFlagged)
            {
                review.IsFlagged = true;
                _context.PlaceReviews.Update(review);
            }
            return await _context.SaveChangesAsync();
        }

        public IQueryable<PlaceReview> GetAllFlaggedReviewByBranchId(Guid branchId)
        {
            return _context.PlaceReviews
                .Include(r => r.User)
                .ThenInclude(u => u.UserProfile)
                .Include(r => r.Place)
                .Include(r => r.ReviewImages)
                .Include(r => r.ReviewReports)
                .Where(r => r.Place.BranchId == branchId && r.ModerationStatus == ReviewStatus.Approved && r.IsFlagged == true);
        }

        public async Task<List<PlaceReviewReport>> GetAllReportsByReviewId(Guid reviewId)
        {
            return await _context.PlaceReviewReports
                .Include(r => r.PlaceReview)
                .ThenInclude(r => r.User)
                    .ThenInclude(u => u.UserProfile)
                .Include(r => r.PlaceReview.Place)
                .Where(r => r.IsResolved == false && r.PlaceReview.ReviewId == reviewId)
                .ToListAsync();
        }

        public async Task<int> ResolveReportAsync(SolveReport solveReport, Guid moderatorId)
        {
            var review = await _context.PlaceReviews
                .Include(r => r.ReviewReports)
                .FirstOrDefaultAsync(r => r.ReviewId == solveReport.ReviewId);

            if (review == null)
                throw new KeyNotFoundException($"Review with ID {solveReport.ReviewId} not found.");

            foreach (var report in review.ReviewReports)
            {
                report.IsResolved = true;
                report.ResolvedAt = DateTime.UtcNow;
                _context.PlaceReviewReports.Update(report);
            }

            // Update review status based on the decision
            if (solveReport.IsValidReport)
                review.ModerationStatus = ReviewStatus.Rejected;

            review.ModeratedBy = moderatorId;
            review.ModeratedAt = DateTime.UtcNow;
            review.ModerationReason = solveReport.ModerationReason;
            review.IsFlagged = false; // Clear the flagged status after moderation
            _context.PlaceReviews.Update(review);
            return await _context.SaveChangesAsync();
        }

        public async Task<bool> IsReviewedPlace(Guid placeId, Guid userId)
        {
            return await _context.PlaceReviews.AnyAsync(r => r.PlaceId == placeId && r.UserId == userId);
        }
    }
}
