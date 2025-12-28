using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces.IPlaceRepos
{
    public interface IPlaceReportRepository
    {
        Task<int> CreateReport(PlaceReport placeReport);
        IQueryable<Place> GetAllPlaceHaveReport(Guid branchId);
        Task<PlaceReport> GetPlaceReportById(Guid reportId);
        Task<List<PlaceReport>> GetAllReportOfPlace(Guid placeId);
        void UpdateReport(PlaceReport placeReport);
        Task<int> SaveChange();
    }
}
