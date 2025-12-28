using Application.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Linq.Dynamic.Core;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminUsersController : ControllerBase
    {
        private readonly IAdminUserService _svc;
        public AdminUsersController(IAdminUserService svc) => _svc = svc;

        [HttpGet]
        public async Task<ActionResult<Infrastructure.Models.Common.PagedResult<UserListItemDto>>> GetUsers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] int? roleId = null,
            [FromQuery] bool? isActive = null)
        {
            var req = new PagedRequest(page, pageSize, search, roleId, isActive);
            var result = await _svc.GetUsersAsync(req);
            return Ok(result);
        }

        [HttpPut("{userId:guid}/promote")]
        public async Task<IActionResult> Promote(Guid userId)
        {
            var ok = await _svc.PromoteUserToModeratorAsync(userId);
            if (!ok) return BadRequest("Không thể promote: user không tồn tại, đã là moderator, hoặc role hiện tại không phải 3.");
            return Ok(new { message = "Promote thành công: role 3 → 2." });
        }
    }
}
