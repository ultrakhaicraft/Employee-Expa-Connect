using Infrastructure.Models.Common;
using Infrastructure.Models.EventShareDTO;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IEventShareService
    {
        Task<ApiResponse<EventShareDetailDto>> ShareEventAsync(
            EventShareCreateDto request,
            Guid eventId,
            Guid currentUserId);

        Task<ApiResponse<bool>> RevokeShareEventAsync(Guid shareId, Guid userId);

        Task<ApiResponse<List<EventShareDetailDto>>> GetSharesByEventIdAsync(Guid eventId);

        Task<ApiResponse<List<EventShareViewDto>>> GetSharedWithMeAsync(Guid userId);
    }
}


















































































