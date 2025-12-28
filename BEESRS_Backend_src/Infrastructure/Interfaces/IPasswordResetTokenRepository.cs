using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IPasswordResetTokenRepository
    {
        Task<PasswordResetToken> CreateAsync(PasswordResetToken token);
        Task<PasswordResetToken?> GetValidTokenAsync(string tokenHash, string email);
        Task MarkTokenAsUsedAsync(Guid tokenId);
        Task InvalidateAllUserTokensAsync(Guid userId);
        Task CleanupExpiredTokensAsync();
    }
}
