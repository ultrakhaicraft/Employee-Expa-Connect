using Domain.Entities;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IPlaceReportService
    {
        Task<int> CreateReport(string reason, Guid placeId, Guid userId);
        Task<PagedResult<PlaceDetailForHome>> GetAllPlaceHaveReport(Guid moderatorId, OnlyPageRequest req);
        Task<List<PlaceReportDTO>> GetAllReportOfPlace(Guid placeId);
        Task ResolveAllReportOfPlace(Guid placeId, string resolvedNote, Guid moderatorId);
        Task ResolveReport(ResolveReport resolveReport, Guid moderatorId);
    }
}
