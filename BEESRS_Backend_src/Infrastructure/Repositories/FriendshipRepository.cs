using Domain.Entities;
using Domain.Enums;
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
    public class FriendshipRepository : IFriendshipRepository
    {
        private readonly BEESRSDBContext _context;
        public FriendshipRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task<int> AcceptFriendRequestAsync(Guid FriendshipId)
        {
            var friendship = await _context.Friendships.FindAsync(FriendshipId);
            if (friendship == null)
                throw new KeyNotFoundException($"Friend request {FriendshipId} not found.");

            friendship.Status = FriendshipStatus.Accepted;
            friendship.UpdatedAt = DateTimeOffset.UtcNow;

            return await _context.SaveChangesAsync();
        }

        public async Task<int> DeclineFriendRequestAsync(Guid FriendshipId)
        {
            var friendship = await _context.Friendships.FindAsync(FriendshipId);
            if (friendship == null)
                throw new KeyNotFoundException($"Friend request {FriendshipId} not found.");

            friendship.Status = FriendshipStatus.Rejected;
            friendship.UpdatedAt = DateTimeOffset.UtcNow;

            return await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Friendship>> GetPendingRequestsAsync(Guid userId)
        {
            return await _context.Friendships
                .Include(f => f.Requested)
                .ThenInclude(r => r.UserProfile)
                .Where(f => f.AddresseeId == userId && f.Status == FriendshipStatus.Pending)
                .ToListAsync();
        }

        public async Task<int> RemoveFriendAsync(Guid userId1, Guid userId2)
        {
            var friendship = await _context.Friendships
                .FirstOrDefaultAsync(f =>
                    (f.RequestedId == userId1 && f.AddresseeId == userId2) ||
                    (f.RequestedId == userId2 && f.AddresseeId == userId1));

            if (friendship == null)
                throw new KeyNotFoundException("You are not friend of this user.");
            friendship.Status = FriendshipStatus.Rejected;
            friendship.UpdatedAt = DateTimeOffset.UtcNow;
            return await _context.SaveChangesAsync();
        }

        public async Task<int> SendFriendRequestAsync(Guid senderId, Guid receiverId)
        {
            var friendship = await _context.Friendships
                .FirstOrDefaultAsync(f =>
                    (f.RequestedId == senderId && f.AddresseeId == receiverId) ||
                    (f.RequestedId == receiverId && f.AddresseeId == senderId));

            if (friendship != null)
            {
                friendship.RequestedId = senderId;
                friendship.AddresseeId = receiverId;
                friendship.Status = FriendshipStatus.Pending;
                friendship.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else if(friendship != null && friendship.Status == FriendshipStatus.Blocked)
                throw new InvalidOperationException("You have been blocked by this user.");
            else
            {
                friendship = new Friendship
                {
                    RequestedId = senderId,
                    AddresseeId = receiverId,
                    Status = FriendshipStatus.Pending,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                await _context.Friendships.AddAsync(friendship);
            }
            return await _context.SaveChangesAsync();
        }

        public async Task<Friendship> GetFriendshipByIdAsync(Guid FriendshipId)
        {
            var friendship = await _context.Friendships.FindAsync(FriendshipId);
            if (friendship == null)
                throw new KeyNotFoundException("Friendship not found");
            return friendship;
        }

        public async Task<Friendship?> GetFriendshipByUserIdsAsync(Guid userId1, Guid userId2)
        {
            var friendship = await _context.Friendships
                .FirstOrDefaultAsync(f =>
                    (f.RequestedId == userId1 && f.AddresseeId == userId2) ||
                    (f.RequestedId == userId2 && f.AddresseeId == userId1));

            return friendship;
        }

        public IQueryable<Friendship> GetFriendsListAsync(Guid userId)
        {
            return _context.Friendships
                .AsNoTracking()
                .Include(f => f.Requested)
                    .ThenInclude(u => u.UserProfile)
                .Include(f => f.Addressee)
                    .ThenInclude(u => u.UserProfile)
                .Where(f => (f.RequestedId == userId || f.AddresseeId == userId) && f.Status == FriendshipStatus.Accepted);
        }

        public IQueryable<User> GetAllUserInBranchUserMayKnow(Guid userId, Guid branchId)
        {
            var existingFriends = _context.Friendships
                .Where(f => (f.RequestedId == userId || f.AddresseeId == userId) && (f.Status == FriendshipStatus.Accepted || f.Status == FriendshipStatus.Blocked || f.Status == FriendshipStatus.Pending))
                .Select(f => f.RequestedId == userId ? f.AddresseeId : f.RequestedId);

            return _context.Users
                .Include(u => u.UserProfile)
                .Include(u => u.CurrentBranch)
                .Include(u => u.FriendRequestsSent)
                .Include(u => u.FriendRequestsReceived)
                .Where(u => u.IsActive &&
                    u.RoleId == 3 &&
                    u.CurrentBranchId == branchId &&
                    u.UserId != userId &&
                    !existingFriends.Contains(u.UserId));
        }
    }
}
