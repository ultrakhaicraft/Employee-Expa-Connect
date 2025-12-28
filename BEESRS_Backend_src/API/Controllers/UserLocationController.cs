using Application.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserLocationDTO;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class UserLocationController : Controller
	{
		private readonly IUserLocationService _userLocationService;

		public UserLocationController(IUserLocationService userLocationService)
		{
			_userLocationService = userLocationService;
		}

		#region  additional CRUD endpoints for user locations

		/// <summary>
		/// Get all user locations with pagination
		/// </summary>
		/// <param name="request"></param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		/// <remarks>Does not support searching</remarks>
		[HttpGet]
		public async Task<IActionResult> GetAllUserLocations([FromQuery] PagedRequest request)
		{
			var response = await _userLocationService.GetAllUserLocationPagedAsync(request);
			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}

		}

		/// <summary>
		/// Get user location detail based on the user location ID
		/// </summary>
		/// <param name="userLocationId">ID of user location entity</param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		[HttpGet("{userLocationId}")]
		public async Task<IActionResult> GetUserLocationsDetail([FromRoute] Guid userLocationId)
		{
			if (userLocationId == Guid.Empty)
			{
				return BadRequest(new { Message = "userLocationId is empty, please input the id" });
			}

			var response = await _userLocationService.GetUserLocationDetailById(userLocationId);
			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}

		}

		/// <summary>
		/// Create new user location entity
		/// </summary>
		/// <param name="request">user location information to be created</param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		[HttpPost]
		public async Task<IActionResult> CreateUserLocation([FromBody] UserLocationCreateDto request)
		{
			if (request == null)
			{
				return BadRequest(new { Message = "Request body is null, please input the user location information" });
			}

			if (!ModelState.IsValid)
			{
				return BadRequest(ModelState);
			}

			var response = await _userLocationService.CreateUserLocationAsync(request);
			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}
		}

		/// <summary>
		/// Update user location entity based on the user location ID
		/// </summary>
		/// <param name="request">User Location information to be updated</param>
		/// <param name="userLocationId">ID of user location entity</param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		[HttpPut("{userLocationId}")]
		public async Task<IActionResult> UpdateUserLocation([FromBody] UserLocationUpdateDto request, [FromRoute] Guid userLocationId)
		{
			if (request == null || userLocationId == Guid.Empty)
			{
				return BadRequest(new { Message = "Request body is null or userLocationId is empty, please input both user location and id information" });
			}

			if (!ModelState.IsValid)
			{
				return BadRequest(ModelState);
			}

			var response = await _userLocationService.UpdateUserLocationAsync(request, userLocationId);
			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}
		}

		/// <summary>
		/// Delete user location entity based on the user location ID
		/// </summary>
		/// <param name="userLocationId">ID of user location entity</param>
		/// <returns></returns>
		/// <remarks>User</remarks>
		[HttpDelete("{userLocationId}")]
		public async Task<IActionResult> DeleteUserLocation([FromRoute] Guid userLocationId)
		{
			if (userLocationId == Guid.Empty)
			{
				return BadRequest(new { Message = "Please input user location id" });
			}
			var response = await _userLocationService.DeleteUserLocationAsync(userLocationId);
			if (response.Success)
			{
				return Ok(response);
			}
			else
			{
				return StatusCode(response.StatusCode, response);
			}
		}

		#endregion
	}
}
