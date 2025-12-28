using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Interfaces
{
    public interface IFriendshipRepository
    {
        Task<int> SendFriendRequestAsync(Guid senderId, Guid receiverId);
        Task<int> AcceptFriendRequestAsync(Guid FriendshipId);
        Task<int> DeclineFriendRequestAsync(Guid FriendshipId);
        Task<int> RemoveFriendAsync(Guid userId1, Guid userId2);
        Task<IEnumerable<Friendship>> GetPendingRequestsAsync(Guid userId);
        Task<Friendship> GetFriendshipByIdAsync(Guid FriendshipId);
        Task<Friendship?> GetFriendshipByUserIdsAsync(Guid userId1, Guid userId2);

        IQueryable<Friendship> GetFriendsListAsync(Guid userId);
        IQueryable<User> GetAllUserInBranchUserMayKnow(Guid userId, Guid branchId);
    }
}
