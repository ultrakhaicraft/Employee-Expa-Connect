using Domain.Entities;
using Infrastructure.Interfaces.IPlaceRepos;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.PlaceRepos
{
    public class PlaceReportRepository : IPlaceReportRepository
    {
        private readonly BEESRSDBContext _context;
        public PlaceReportRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<int> CreateReport(PlaceReport placeReport)
        {
            var report = await _context.PlaceReports
                .AsNoTracking()
                .FirstOrDefaultAsync(pr => pr.PlaceId == placeReport.PlaceId && pr.ReportedByUserId == placeReport.ReportedByUserId && !pr.IsResolved);
            if (report != null)
                throw new InvalidOperationException("Your report is being processed.");

            await _context.PlaceReports.AddAsync(placeReport);
            return await _context.SaveChangesAsync();
        }

        public IQueryable<Place> GetAllPlaceHaveReport(Guid branchId)
        {
            return _context.Places
                .AsNoTracking()
                .Include(p => p.PlaceCategory)
                .Include(p => p.CreatedByUser)
                .Include(p => p.PlaceImages)
                .Where(p => p.BranchId == branchId && p.PlaceReports.Any(pr => !pr.IsResolved));
        }

        public async Task<List<PlaceReport>> GetAllReportOfPlace(Guid placeId)
        {
            return await _context.PlaceReports
                .Include(pr => pr.Place)
                .Include(pr => pr.ReportedByUser)
                    .ThenInclude(rbu => rbu.UserProfile)
                .Include(pr => pr.ResolvedByUser)
                .Where(pr => pr.PlaceId == placeId && !pr.IsResolved)
                .ToListAsync();
        }

        public void UpdateReport(PlaceReport placeReport)
        {
            _context.PlaceReports.Update(placeReport);
        }

        public async Task<int> SaveChange()
        {
            return await _context.SaveChangesAsync();
        }

        public async Task<PlaceReport> GetPlaceReportById(Guid reportId)
        {
            return await _context.PlaceReports.FindAsync(reportId);
        }
    }
}
