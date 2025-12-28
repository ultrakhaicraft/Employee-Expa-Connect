using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IUserSessionRepository
    {
        Task<UserSession> CreateAsync(UserSession session);
        Task<UserSession?> GetByTokenHashAsync(string tokenHash);
        Task<UserSession?> GetByRefreshTokenHashAsync(string refreshTokenHash);
        Task UpdateAsync(UserSession session);
        Task DeactivateAllUserSessionsAsync(Guid userId);
        Task DeactivateSessionAsync(Guid sessionId);
    }
}
