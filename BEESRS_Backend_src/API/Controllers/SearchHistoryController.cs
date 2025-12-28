using Application.Interfaces;
using Infrastructure.Models.PlaceDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SearchHistoryController : ControllerBase
    {
        private readonly ISearchHistoryService _searchHistoryService;

        public SearchHistoryController(ISearchHistoryService searchHistoryService)
        {
            _searchHistoryService = searchHistoryService;
        }

        ///<summary>
        /// Thêm lịch sử tìm kiếm
        ///</summary>
        ///
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> AddSearchHistory(CreateSearchHistory createSearchHistory)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");
                await _searchHistoryService.AddSearchHistoryAsync(userId, createSearchHistory);
                return Ok(new { message = "Search history added." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        ///<summary>
        /// Lấy lịch sử tìm kiếm của người dùng (10 từ) (Lấy mấy từ user đã nhập ở thanh search rồi enter)
        ///</summary>
        ///
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetSearchHistories()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var histories = await _searchHistoryService.GetSearchHistoriesByUserIdAsync(userId);
                return Ok(histories);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        ///<summary>
        /// Xóa một mục lịch sử tìm kiếm
        ///</summary>
        [Authorize]
        [HttpDelete("{searchHistoryId}")]
        public async Task<IActionResult> DeleteSearchHistory(Guid searchHistoryId)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                await _searchHistoryService.DeleteSearchHistoryAsync(searchHistoryId, userId);
                return Ok(new { message = "Search history deleted." });
            }
            catch (UnauthorizedAccessException uaEx)
            {
                return Unauthorized(uaEx.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        ///<summary>
        /// Xóa tất cả lịch sử tìm kiếm của người dùng
        ///</summary>
        ///
        [Authorize]
        [HttpDelete("all")]
        public async Task<IActionResult> DeleteAllSearchHistory()
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");
                await _searchHistoryService.DeleteAllSearchHistoryAsync(userId);
                return Ok(new { message = "All search history deleted." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}
