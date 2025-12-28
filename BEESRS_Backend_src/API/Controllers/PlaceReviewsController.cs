using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using Infrastructure.Models.PlaceReview;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

namespace API.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class PlaceReviewsController : ControllerBase
    {
        private readonly IPlaceReviewService _placeReviewService;
        public PlaceReviewsController(IPlaceReviewService placeReviewService)
        {
            _placeReviewService = placeReviewService;
        }
        /// <summary>
        /// Lấy tất cả đánh giá của một địa điểm theo placeId
        /// </summary>
        /// 
        [HttpGet("get-by-place-id")]
        public async Task<ActionResult<PagedResult<PlaceListItemDto>>> GetReviewsByPlaceId([FromQuery] Guid placeId, [FromQuery] OnlyPageRequest req)
        {
            try
            {
                var result = await _placeReviewService.GetAllReviewsByPlaceIdAsync(placeId, req);
                if (result == null || result.Items.Count == 0)
                    return NotFound($"No reviews found for this place");

                return Ok(result);
            }
            catch (InvalidOperationException ioe)
            {
                return BadRequest(ioe.Message);
            }
            catch (KeyNotFoundException knf)
            {
                return NotFound(knf.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy đánh giá của một địa điểm theo id
        /// </summary>
        /// 
        [HttpGet("get-by-id")]
        public async Task<ActionResult<ReviewDetailDTO>> GetReviewById([FromQuery] Guid reviewId)
        {
            try
            {
                var result = await _placeReviewService.GetPlaceReviewByIdAsync(reviewId);
                if (result == null)
                    return NotFound($"No review found for this id: {reviewId}");
                return Ok(result);
            }
            catch (KeyNotFoundException knf)
            {
                return NotFound(knf.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Kiểm tra người dùng đã đánh giá địa điểm chưa (true nếu đã đánh giá, false nếu chưa)
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("check-if-reviewed")]
        public async Task<ActionResult<int>> CheckIfUserReviewed([FromQuery] Guid placeId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeReviewService.IsReviewedPlace(placeId, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException knf)
            {
                return NotFound(knf.Message);
            }
            catch (UnauthorizedAccessException uae)
            {
                return Unauthorized(uae.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Tạo mới đánh giá cho một địa điểm
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("create")]
        public async Task<ActionResult<int>> CreateReview([FromBody] CreatePlaceReviewDTO createReviewDTO)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeReviewService.CreatePlaceReviewAsync(createReviewDTO, userId);
                return Ok(result);
            }
            catch (InvalidDataException ioe)
            {
                return BadRequest(new { errors = ioe.Message });
            }
            catch (KeyNotFoundException knf)
            {
                return NotFound(new { errors = knf.Message });
            }
            catch (UnauthorizedAccessException uae)
            {
                return Unauthorized(new { errors = uae.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Cập nhật đánh giá của một địa điểm
        /// </summary>
        /// 
        [Authorize]
        [HttpPut("update")]
        public async Task<ActionResult<int>> UpdateReview([FromBody] UpdatePlaceReviewDTO updateReviewDTO)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeReviewService.UpdatePlaceReviewAsync(updateReviewDTO, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException knf)
            {
                return NotFound(new { errors = knf.Message });
            }
            catch (InvalidDataException ioe)
            {
                return BadRequest(new { errors = ioe.Message });
            }
            catch (UnauthorizedAccessException uae)
            {
                return Unauthorized(new { errors = uae.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Xoá đánh giá của một địa điểm
        /// </summary>
        /// 
        [Authorize]
        [HttpDelete("delete")]
        public async Task<ActionResult> DeleteReview([FromQuery] Guid reviewId)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _placeReviewService.DeletePlaceReviewAsync(reviewId, userId);
                return Ok("Review delete successfully");
            }
            catch (KeyNotFoundException knf)
            {
                return NotFound(knf.Message);
            }
            catch (UnauthorizedAccessException uae)
            {
                return Unauthorized(uae.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Report một đánh giá
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("report")]
        public async Task<ActionResult<int>> ReportReview([FromBody] ReportReviewDTO report)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeReviewService.ReportReview(report, userId);
                return Ok("Report review successfully");
            }
            catch (KeyNotFoundException knf)
            {
                return NotFound(knf.Message);
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
        /// Lấy tất cả đánh giá bị report theo branchId
        /// </summary>
        /// 
        [Authorize(Roles = "Moderator")]
        [HttpGet("get-flagged-reviews")]
        public async Task<ActionResult<PagedResult<ReviewWithReport>>> GetFlaggedReviews([FromQuery] OnlyPageRequest req)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeReviewService.GetAllFlaggedReviewByModeratorId(userId, req);
                if (result == null || result.Items.Count == 0)
                    return NotFound($"No flagged reviews found.");

                return Ok(result);
            }
            catch (KeyNotFoundException knf)
            {
                return NotFound(knf.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Giải quyết một đánh giá bị report
        /// Nếu các report là đúng thì set IsValidReport = true (gỡ review xuống/ ẩn review), nếu thấy các report là không đúng thì set IsValidReport = false
        /// </summary>
        /// 
        [Authorize(Roles = "Moderator")]
        [HttpPost("resolve-report")]
        public async Task<ActionResult<int>> ResolveReport([FromBody] SolveReport solveReport)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeReviewService.ResolveReportAsync(solveReport, userId);
                return Ok("Resolve report successfully");
            }
            catch (KeyNotFoundException knf)
            {
                return NotFound(knf.Message);
            }
            catch (UnauthorizedAccessException uae)
            {
                return Unauthorized(uae.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}
