using Application.Interfaces;
using Application.Interfaces.AdminManage;
using Infrastructure.Models.AdminManageModel;
using Infrastructure.Models.BranchDTO;
using Infrastructure.Models.Common;
using Infrastructure.Models.Moderator;
using Infrastructure.Models.PlaceDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;

namespace API.Controllers
{

    /// <summary>
    /// Manage operation related to places
    /// </summary>
    [Route("[controller]")]
    [ApiController]
    public class PlaceController : ControllerBase
    {
        private readonly IPlaceService _placeService;
        private readonly IPlaceTagService _placeTagService;
        private readonly IBranchService _branchService;
        private readonly ILogger<PlaceController> _logger;

        public PlaceController(IPlaceService placeService, IPlaceTagService placeTagService, IBranchService branchService, ILogger<PlaceController> logger)
        {
            _placeService = placeService;
            _placeTagService = placeTagService;
            _branchService = branchService;
            _logger = logger;
        }

        /// <summary>
        /// Lấy danh sách toàn bộ địa điểm trên hệ thống
        /// </summary>
        /// <returns></returns>
        [HttpPost]
        public async Task<ActionResult<PagedResult<PlaceListItemDto>>> GetPlaces(OnlyPageRequest pagedRequest)

        {
            try
            {
                var result = await _placeService.GetAllAsync(pagedRequest);
                if (result.TotalItems == 0)
                    return NotFound("No places found");

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching places");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy danh sách toàn bộ địa điểm và review của địa điểm đó theo branch của user
        /// </summary>
        [HttpGet("get-all-place-by-branch")]
        public async Task<ActionResult<PagedResult<PlaceWithReviews>>> GetPlacesByBranch([FromQuery] OnlyPageRequest pagedRequest)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeService.GetAllPlaceByBranchIdAsync(userId, pagedRequest);
                if (result.TotalItems == 0)
                    return NotFound("No places found");
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching places");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy danh sách toàn bộ địa điểm do user tạo trên hệ thống (Owner)
        /// </summary>
        /// <returns></returns>
        [HttpPost("get-all-created-place")]
        public async Task<ActionResult<PagedResult<PlaceListItemDto>>> GetCreatedPlaces(OnlyPageRequest pagedRequest)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeService.GetAllCreatedPlaceAsync(userId, pagedRequest);
                if (result.TotalItems == 0)
                    return NotFound("No places found");

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching places");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy danh sách toàn bộ địa điểm do 1 user khác tạo trên hệ thống
        /// </summary>
        /// <returns></returns>
        [HttpPost("get-all-created-place-of")]
        public async Task<ActionResult<PagedResult<PlaceWithReviews>>> GetCreatedPlacesOf(OnlyPageRequestWithUserId pagedRequest)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeService.GetAllCreatedPlaceOfAsync(userId, pagedRequest);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while fetching places");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Search places by name or address (sorted by distance from user to place)
        /// </summary>
        /// <returns></returns>
        /// 
        [Authorize]
        [HttpPost("search")]
        public async Task<ActionResult<PagedResult<PlaceListItemDto>>> SearchPlace([FromBody] SearchPlaceRequest req)
        {
            try
            {
                var result = await _placeService.SearchPlacesByNameOrAddressAsync(req.Name, req.UserLat, req.UserLng, req.Page, req.PageSize);

                if (result.TotalItems == 0)
                    return NotFound("No places found matching the search criteria");

                return Ok(result);
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

        /// <summary>
		/// Lấy thông tin địa điểm chi tiết bằng id
		/// </summary>
		/// <returns></returns>
		/// 
		[Authorize]
        [HttpGet("get-by-id")]
        public async Task<ActionResult<PlaceDetail>> GetPlaceById([FromQuery] string placeId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var guidParse = Guid.TryParse(placeId, out Guid placeGuid);
                if (!guidParse)
                    return BadRequest("Invalid Place Id format");

                var result = await _placeService.GetPlaceByIdAsync(placeGuid, userId);
                return Ok(result);
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

        /// <summary>
        /// Lấy danh sách địa điểm trong một hình chữ nhật giới hạn bởi toạ độ
        /// </summary>
        /// <returns></returns>
        /// 
        [Authorize]
        [HttpPost("get-list")]
        public async Task<ActionResult<PlaceDetailDto>> GetPlaceByBoundingBox(PlaceBoundingBoxSearchFilter filter)
        {
            try
            {
                var places = await _placeService.GetByBoundingBoxAsync(filter);
                return Ok(places);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
		/// Lấy toàn bộ category (không phân trang)
		/// </summary>
		/// <returns></returns>
		/// 
		[Authorize]
        [HttpGet("get-all-category")]
        public async Task<ActionResult<PlaceDetailDto>> GetAllCategory()
        {
            try
            {
                var result = await _placeService.GetAllPlaceCategory();
                if (result == null || result.Count == 0)
                    return NotFound("No categories found");

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Tạo địa điểm mới
        /// </summary>
        /// <returns></returns>
        /// 
        [Authorize]
        [HttpPost("create-new")]
        public async Task<ActionResult<PlaceDetailForHome>> CreateNewPlace(CreatePlaceDto createPlaceDto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                createPlaceDto.Validate();

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var places = await _placeService.CreatePlaceAsync(createPlaceDto, userId);
                return Ok(places);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ValidationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Cập nhật thông tin của địa điểm (Moderator hoặc Owner)
        /// </summary>
        /// <returns></returns>
        /// 
        [Authorize]
        [HttpPut("update-place")]
        public async Task<ActionResult<string>> UpdatePlace(UpdatePlaceDTO updatePlaceDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _placeService.UpdatePlaceAsync(updatePlaceDTO, userId);
                return Ok("Place updated successfully");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Xóa địa điểm (Chỉ Moderator)
        /// </summary>
        /// <returns></returns>
        /// 
        [Authorize]
        [HttpDelete("delete-place")]
        public async Task<ActionResult<string>> DeletePlace([FromQuery] string placeId)
        {
            try
            {
                var guidParse = Guid.TryParse(placeId, out Guid placeGuid);
                if (!guidParse)
                    return BadRequest("Invalid Place Id format");

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeService.DeletePlaceAsync(placeGuid, userId);
                return result > 0 ? Ok($"({result}) Place deleted successfully") : BadRequest("Delete place failed");
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

        /// <summary>
        /// Thêm ảnh cho địa điểm (Moderator hoặc Owner)
        /// </summary>
        /// <returns></returns>
        /// 
        [Authorize]
        [HttpPost("add-image")]
        public async Task<ActionResult<string>> AđdImage(AddPlaceImage addPlaceImage)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeService.AddImagesToPlace(addPlaceImage, userId);
                return result > 0 ? Ok("Images added successfully") : BadRequest("Add images failed");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Xoá ảnh của địa điểm (Moderator hoặc Owner)
        /// </summary>
        /// <returns></returns>
        /// 
        [Authorize]
        [HttpDelete("remove-image")]
        public async Task<ActionResult<string>> RemoveImage(Guid imageId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");
                var result = await _placeService.RemoveImage(userId, imageId);

                return result > 0 ? Ok("Image removed successfully") : BadRequest("Remove Image failed");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy toàn bộ địa điểm đang chờ duyệt ở branch của moderator (Moderator)
        /// </summary>
        /// 
        [Authorize(Roles = "Moderator")]
        [HttpGet("get-all-pending-place")]
        public async Task<ActionResult<PagedResult<PlaceDetailForHome>>> GetAllPendingPlace([FromQuery] OnlyPageRequest pagedRequest)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeService.GetAllPendingPlaceAsync(userId, pagedRequest);
                if (result.TotalItems == 0)
                    return NotFound("No places found");

                return Ok(result);
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

        /// <summary>
        /// Cập nhật trạng thái địa điểm (Moderator).
        /// <para>Phần Status phải là Pending/Approved/Rejected</para>
        /// </summary>
        /// 
        [Authorize(Roles = "Moderator")]
        [HttpPut("verify-place")]
        public async Task<ActionResult<string>> VerifyPlace(UpdatePlaceStatus updatePlaceStatus)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeService.VerifyPlaceAsync(userId, updatePlaceStatus);
                return result > 0 ? Ok("Place status updated successfully") : BadRequest("Update place status failed");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Like địa điểm
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("like-place")]
        public async Task<ActionResult<string>> LikePlace([FromQuery] Guid placeId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _placeService.LikePlaceAsync(userId, placeId);
                return Ok("Place liked successfully");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
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

        /// <summary>
        /// Bỏ like địa điểm
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("unlike-place")]
        public async Task<ActionResult<string>> DislikePlace([FromQuery] Guid placeId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _placeService.DislikePlaceAsync(userId, placeId);
                return Ok("Place unliked successfully");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
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

        /// <summary>
        /// Lấy toàn bộ địa điểm đã like
        /// </summary>
        /// 
        [Authorize]
        [HttpGet("get-all-liked-place")]
        public async Task<ActionResult<PagedResult<PlaceWithReviews>>> GetAllLikedPlaces([FromQuery] OnlyPageRequest pagedRequest)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeService.GetAllLikedPlaces(userId, pagedRequest);

                return Ok(result);
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

        /// <summary>
        /// Lấy toàn bộ địa điểm hiển thị cho trang Home
        /// </summary>
        /// 
        [Authorize]
        [HttpGet("get-places-for-home")]
        public async Task<ActionResult<PagedResult<PlaceWithReviews>>> GetPlacesForHome([FromQuery] PageRequestWithLocation pagedRequest)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeService.GetPlacesForHome(userId, pagedRequest);
                if (result.TotalItems == 0)
                    return NotFound("No places found");

                return Ok(result);
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

        /// <summary>
        /// Check if a place exists in system by GooglePlaceId
        /// </summary>
        /// <param name="googlePlaceId">GooglePlaceId to check</param>
        /// <returns>Place details if exists, null otherwise</returns>
        [Authorize]
        [HttpGet("check-by-google-place-id")]
        public async Task<ActionResult<PlaceDetailDto>> CheckPlaceByGooglePlaceId([FromQuery] string googlePlaceId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(googlePlaceId))
                    return BadRequest("GooglePlaceId is required");

                var result = await _placeService.GetPlaceByGooglePlaceIdAsync(googlePlaceId);

                if (result == null)
                    return NotFound(new { exists = false, message = "Place not found in system" });

                return Ok(new { exists = true, place = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking place by GooglePlaceId: {GooglePlaceId}", googlePlaceId);
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy toàn bộ tag của địa điểm
        /// </summary>
        /// 
        [HttpGet("get-tags-of")]
        public async Task<ActionResult<List<PlaceTagDTO>>> GetTagsOfPlace([FromQuery] Guid placeId)
        {
            try
            {
                var result = await _placeService.GetTagsOfPlace(placeId);
                if (result == null || result.Count == 0)
                    return NotFound("No tags found for the specified place");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy toàn bộ tag trên hệ thống
        /// </summary>
        /// 
        [HttpGet("get-all-tag")]
        public async Task<ActionResult<List<PlaceTagDTO>>> GetAllTag()
        {
            try
            {
                var result = await _placeTagService.GetAllTags();
                if (result == null || result.Count == 0)
                    return NotFound("No tags found");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("get-all-branch")]
        public async Task<ActionResult<List<BranchDTO>>> GetAllBranch()
        {
            try
            {
                var result = await _branchService.GetAllBranchWithNoPaging();
                if (result == null || result.Count == 0)
                    return NotFound("No branches found");
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
