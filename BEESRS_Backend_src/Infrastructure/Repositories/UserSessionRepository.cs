
using Domain.Entities;
using Infrastructure.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class UserSessionRepository : IUserSessionRepository
    {
        private readonly BEESRSDBContext _context;

        public UserSessionRepository(BEESRSDBContext context)
        {
            _context = context;
        }

        public async Task<UserSession> CreateAsync(UserSession session)
        {
            _context.UserSessions.Add(session);
            await _context.SaveChangesAsync();
            return session;
        }

        public async Task<UserSession?> GetByTokenHashAsync(string tokenHash)
        {
            return await _context.UserSessions
                .Include(s => s.User)
                .ThenInclude(u => u.Role)
                .FirstOrDefaultAsync(s => s.TokenHash == tokenHash && s.IsActive);
        }

        public async Task<UserSession?> GetByRefreshTokenHashAsync(string refreshTokenHash)
        {
            return await _context.UserSessions
                .Include(s => s.User)
                .ThenInclude(u => u.UserProfile)
                .FirstOrDefaultAsync(s => s.RefreshTokenHash == refreshTokenHash && s.IsActive);
        }

        public async Task UpdateAsync(UserSession session)
        {
            _context.UserSessions.Update(session);
            await _context.SaveChangesAsync();
        }

        public async Task DeactivateAllUserSessionsAsync(Guid userId)
        {
            var sessions = await _context.UserSessions
                .Where(s => s.UserId == userId && s.IsActive)
                .ToListAsync();

            foreach (var session in sessions)
            {
                session.IsActive = false;
            }

            await _context.SaveChangesAsync();
        }

        public async Task DeactivateSessionAsync(Guid sessionId)
        {
            var session = await _context.UserSessions.FindAsync(sessionId);
            if (session != null)
            {
                session.IsActive = false;
                await _context.SaveChangesAsync();
            }
        }
    }
}
