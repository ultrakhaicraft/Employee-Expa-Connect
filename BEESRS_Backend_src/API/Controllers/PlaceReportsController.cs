using Application.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlaceReportsController : ControllerBase
    {
        private readonly IPlaceReportService _placeReportService;
        public PlaceReportsController(IPlaceReportService placeReportService)
        {
            _placeReportService = placeReportService;
        }

        /// <summary>
        /// Report 1 địa điểm
        /// </summary>
        /// 
        [Authorize]
        [HttpPost("report-place")]
        public async Task<ActionResult> ReportPlace([FromBody] ReportRequest reportRequest)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var result = await _placeReportService.CreateReport(reportRequest.Reason, reportRequest.PlaceId, userId);
                if(result == 0)
                    return StatusCode(500, $"Internal server error: Create report failed");

                return Ok(new { message = "Your report have been submited." });
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
        /// Lấy danh sách toàn bộ địa điểm có report chưa xử lý
        /// </summary>
        /// 
        [Authorize(Roles = "Moderator")]
        [HttpGet("get-all-place-have-report")]
        public async Task<ActionResult> GetAllPlaceHaveReport([FromQuery] OnlyPageRequest req)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                var result = await _placeReportService.GetAllPlaceHaveReport(userId, req);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy toàn bộ report của địa điểm
        /// </summary>
        /// 
        [Authorize(Roles = "Moderator")]
        [HttpGet("get-all-reoprt-by-place-id")]
        public async Task<ActionResult> GetAllReportOfPlace([FromQuery] Guid placeId)
        {
            try
            {
                var result = await _placeReportService.GetAllReportOfPlace(placeId);
                return Ok(result);
            }
            catch(Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Giải quyết 1 report (Nếu isValid là true thì xóa địa điểm, false thì chỉ đánh dấu đã giải quyết)
        /// </summary>
        /// 
        [Authorize(Roles = "Moderator")]
        [HttpPut("resolve-report")]
        public async Task<ActionResult> ResolveReport([FromBody] ResolveReport resolveReport)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                await _placeReportService.ResolveReport(resolveReport, userId);
                return Ok(new { message = "Resolved report successfully." });
            }
            catch(InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Giải quyết toàn bộ report của 1 địa điểm
        /// </summary>
        /// 
        [Authorize(Roles = "Moderator")]
        [HttpPut("resolve-all-reort-of-place")]
        public async Task<ActionResult> ResolveAllReportOfPlace([FromBody] ResolveAllReportOfPlace resolveAllReportOfPlace)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userIdClaim, out var userId))
                    return Unauthorized("Invalid or missing user ID in token");

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                await _placeReportService.ResolveAllReportOfPlace(resolveAllReportOfPlace.PlaceId, resolveAllReportOfPlace.ResolvedNote, userId);
                return Ok(new { message = "All reports resolved successfully." });
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
    }
}
