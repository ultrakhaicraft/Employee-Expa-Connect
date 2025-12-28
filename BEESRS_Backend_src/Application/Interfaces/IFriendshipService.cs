using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using Infrastructure.Models.UserProfileDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IFriendshipService
    {
        Task SendFriendRequestAsync(Guid senderId, Guid receiverId);
        Task AcceptFriendRequestAsync(Guid receiverId, Guid friendshipId);
        Task DeclineFriendRequestAsync(Guid receiverId, Guid friendshipId);
        Task RemoveFriendAsync(Guid userId, Guid friendId);
        //Task<IEnumerable<Guid>> GetFriendsAsync(Guid userId);
        Task<IEnumerable<FriendRequest>> GetPendingFriendRequestsAsync(Guid userId);
        Task<PagedResult<FriendList>> GetFriendsListAsync(Guid userId, OnlyPageRequest req);
        Task<PagedResult<FriendSuggestion>> GetAllUserInBranchUserMayKnowAsync(Guid userId, OnlyPageRequest req);
        Task<PagedResult<UserProfileViewDto>> GetAllUserProfileInBranchUserMayKnowAsync(Guid userId, OnlyPageRequest req);
    }
}
