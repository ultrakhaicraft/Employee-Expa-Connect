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
    public class SavedPlaceController : ControllerBase
    {
        private readonly ISavedPlaceService _savedPlaceService;
        public SavedPlaceController(ISavedPlaceService savedPlaceService)
        {
            _savedPlaceService = savedPlaceService;
        }

        ///<summary>
        /// Lưu địa điểm vào danh sách yêu thích của người dùng
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("add-to-saved-places")]
        public async Task<ActionResult> AddToSavedPlaces([FromQuery] Guid placeId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _savedPlaceService.SavePlaceAsync(userId, placeId);
                return Ok(new { message = "Place added to saved places successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        ///<summary>
        /// Lấy danh sách địa điểm yêu thích của người dùng
        /// </summary>
        /// 
        [Authorize]
        [HttpGet("get-saved-places")]
        public async Task<ActionResult> GetSavedPlaces([FromQuery] OnlyPageRequest pagedRequest)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var savedPlaces = await _savedPlaceService.GetSavedPlacesByUserIdAsync(userId, pagedRequest);

                return Ok(savedPlaces);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        ///<summary>
        /// Xóa địa điểm khỏi danh sách yêu thích của người dùng
        /// </summary>
        /// 
        [Authorize]
        [HttpDelete("remove-from-saved-places")]
        public async Task<ActionResult> RemoveFromSavedPlaces([FromQuery] Guid placeId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _savedPlaceService.RemoveSavedPlaceAsync(userId, placeId);
                return Ok(new { message = "Place removed from saved places successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
