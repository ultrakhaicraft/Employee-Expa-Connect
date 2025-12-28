using Application.Interfaces;
using Infrastructure.Models.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FriendshipsController : ControllerBase
    {
        public readonly IFriendshipService _friendshipService;
        public FriendshipsController(IFriendshipService friendshipService)
        {
            _friendshipService = friendshipService;
        }

        /// <summary>
        /// Lấy danh sách các người dùng trong chi nhánh mà bạn có thể biết
        /// </summary>
        /// 
        [Authorize]
        [HttpGet("people-you-may-know")]
        public async Task<IActionResult> GetPeopleYouMayKnow([FromQuery] OnlyPageRequest req)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var people = await _friendshipService.GetAllUserInBranchUserMayKnowAsync(userId, req);
                if (people == null || !people.Items.Any())
                    return NotFound("No suggestions available at the moment.");

                return Ok(people);
            }
            catch (KeyNotFoundException knfEx)
            {
                return NotFound(knfEx.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Lấy danh sách các profile người dùng trong chi nhánh mà bạn có thể biết
        /// </summary>
        /// 
        [Authorize]
        [HttpGet("people-profile-you-may-know")]
        public async Task<IActionResult> GetPeopleProfileYouMayKnow([FromQuery] OnlyPageRequest req)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var people = await _friendshipService.GetAllUserProfileInBranchUserMayKnowAsync(userId, req);
                if (people == null || !people.Items.Any())
                    return NotFound("No suggestions available at the moment.");

                return Ok(people);
            }
            catch (KeyNotFoundException knfEx)
            {
                return NotFound(knfEx.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Lấy danh sách yêu cầu kết bạn
        /// </summary>
        /// 
        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetPendingFriendRequests()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var requests = await _friendshipService.GetPendingFriendRequestsAsync(userId);
                if (requests == null || !requests.Any())
                    return NotFound("Look like you dont have any friend requests now.");

                return Ok(requests);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Gửi yêu cầu kết bạn
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("add-friend")]
        public async Task<IActionResult> SendFriendRequest([FromQuery]Guid targetUserId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");
                if (userId == targetUserId)
                    return BadRequest("You cannot send a friend request to yourself.");

                await _friendshipService.SendFriendRequestAsync(userId, targetUserId);
                return Ok("Friend request sent successfully.");
            }
            catch (ArgumentException argEx)
            {
                return BadRequest(argEx.Message);
            }
            catch (InvalidOperationException invOpEx)
            {
                return Conflict(invOpEx.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Chấp nhận yêu cầu kết bạn
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("accept-request/{friendshipId}")]
        public async Task<IActionResult> AcceptFriendRequest([FromRoute] Guid friendshipId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _friendshipService.AcceptFriendRequestAsync(userId, friendshipId);
                return Ok("Friend request accepted successfully.");
            }
            catch (KeyNotFoundException knfEx)
            {
                return NotFound(knfEx.Message);
            }
            catch (InvalidOperationException invOpEx)
            {
                return Conflict(invOpEx.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Từ chối yêu cầu kết bạn
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("decline-request/{friendshipId}")]
        public async Task<IActionResult> DeclineFriendRequest([FromRoute] Guid friendshipId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _friendshipService.DeclineFriendRequestAsync(userId, friendshipId);
                return Ok("Friend request declined successfully.");
            }
            catch (KeyNotFoundException knfEx)
            {
                return NotFound(knfEx.Message);
            }
            catch (InvalidOperationException invOpEx)
            {
                return Conflict(invOpEx.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Lấy danh sách bạn bè
        /// </summary>
        /// 
        [Authorize]
        [HttpGet("friends")]
        public async Task<IActionResult> GetFriendsList([FromQuery] OnlyPageRequest req)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var friends = await _friendshipService.GetFriendsListAsync(userId, req);
                if (friends == null || !friends.Items.Any())
                    return NotFound("You have no friends in your list.");

                return Ok(friends);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Xóa bạn bè
        /// </summary>
        /// 
        [Authorize]
        [HttpDelete("remove-friend/{friendUserId}")]
        public async Task<IActionResult> RemoveFriend([FromRoute] Guid friendUserId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _friendshipService.RemoveFriendAsync(userId, friendUserId);
                return Ok("Friend removed successfully.");
            }
            catch (KeyNotFoundException knfEx)
            {
                return NotFound(knfEx.Message);
            }
            catch (InvalidOperationException invOpEx)
            {
                return Conflict(invOpEx.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        /// <summary>
        /// Kiểm tra người này có phải đã gửi cho bạn lời mời kết bạn không
        /// </summary>
        ///
        [Authorize]
        [HttpGet("check-is-send-request-to-you")]
        public async Task<IActionResult> CheckIsThisUserSendYou(Guid senderId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var requests = await _friendshipService.GetPendingFriendRequestsAsync(userId);
                return Ok(requests.Any(r => r.RequestedId == senderId));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

    }
}
