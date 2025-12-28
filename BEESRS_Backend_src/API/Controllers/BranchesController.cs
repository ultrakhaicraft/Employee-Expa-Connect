using Application.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.BranchDTO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Domain.Enums;
using Infrastructure.Models.UserDTO;
using Infrastructure.Helper.Enum;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BranchesController : ControllerBase
    {
        private readonly IBranchService _branchService;
        public BranchesController(IBranchService branchService)
        {
            _branchService = branchService;
        }

        ///<summary>
        /// Lấy danh sách tất cả quốc gia
        /// </summary>
        /// 
        [HttpGet("get-countries")]
        public async Task<ActionResult> GetAllCountries()
        {
            try
            {
                var countries = await _branchService.GetAllCountryAsync();
                if (countries == null || countries.Count == 0)
                    return NotFound("Can not found any country.");
                return Ok(countries);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        ///<summary>
        /// Lấy danh sách các quốc gia có branches (chỉ trả về countries có ít nhất 1 branch active)
        /// </summary>
        /// 
        [HttpGet("get-countries-with-branches")]
        public async Task<ActionResult> GetCountriesWithBranches()
        {
            try
            {
                var countries = await _branchService.GetCountriesWithBranchesAsync();
                if (countries == null || countries.Count == 0)
                    return NotFound("Can not found any country with branches.");
                return Ok(countries);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        ///<summary>
        /// Lấy danh sách tất cả thành phố theo quốc gia (lay tất cả nếu không truyền vào countryId)
        /// </summary>
        [HttpGet("get-cities")]
        public async Task<ActionResult> GetAllCities([FromQuery] Guid? countryId)
        {
            try
            {
                var cities = await _branchService.GetAllCityAsync(countryId);
                if (cities == null || cities.Count == 0)
                    return NotFound("Can not found any city.");
                return Ok(cities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        ///<summary>
        /// Lấy danh sách các thành phố có branches trong quốc gia (chỉ trả về cities có ít nhất 1 branch active)
        /// </summary>
        [HttpGet("get-cities-with-branches")]
        public async Task<ActionResult> GetCitiesWithBranches([FromQuery] Guid? countryId)
        {
            try
            {
                var cities = await _branchService.GetCitiesWithBranchesAsync(countryId);
                if (cities == null || cities.Count == 0)
                    return NotFound("Can not found any city with branches.");
                return Ok(cities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Tạo mới một chi nhánh
        /// </summary>
        /// 
        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<ActionResult> AddBranch([FromBody] CreateBranchDTO branch)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var addedBranch = await _branchService.AddBranchAsync(branch);
                return Ok(addedBranch);

            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy danh sách tất cả chi nhánh với phân trang
        /// </summary>
        /// 
        [Authorize]
        [HttpGet("get-all")]
        public async Task<ActionResult> GetAllBranchs([FromQuery] OnlyPageRequest request)
        {
            try
            {
                var branchs = await _branchService.GetAllBranch(request);
                if (branchs == null || branchs.Items.Count == 0)
                    return NotFound("Can not found any branch.");

                return Ok(branchs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Tìm kiếm chi nhánh theo tên với phân trang
        /// </summary>
        /// 
        [Authorize]
        [HttpGet("search-by-filter")]
        public async Task<ActionResult> SearchBranchByName([FromQuery] SearchBranchFilter filter, [FromQuery] OnlyPageRequest request)
        {
            try
            {
                var branchs = await _branchService.SearchBranch(filter, request);
                if (branchs == null || branchs.Items.Count == 0)
                    return NotFound("Can not found any branch.");

                return Ok(branchs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        ///<summary>
        /// Lấy thông tin chi nhánh theo ID
        /// </summary>
        /// 
        [Authorize]
        [HttpGet("{id}")]
        public async Task<ActionResult> GetBranchById([FromRoute] Guid id)
        {
            try
            {
                var branch = await _branchService.GetBranchByIdAsync(id);
                if (branch == null)
                    return NotFound($"Can not found any branch with id: {id}");
                return Ok(branch);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Cập nhật thông tin chi nhánh
        /// </summary>
        /// 
        [Authorize(Roles = "Admin")]
        [HttpPut]
        public async Task<ActionResult> UpdateBranch([FromBody] UpdateBranchDTO branch)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);
                var updatedBranch = await _branchService.UpdateBranchAsync(branch);
                return Ok(updatedBranch);
            }
            catch (KeyNotFoundException knfEx)
            {
                return NotFound(knfEx.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

		/// <summary>
		/// Save branch information to the user (Admin only)
		/// </summary>
		/// 
		[Authorize(Roles = "Admin")]
		[HttpPut("save-user")]
		public async Task<ActionResult> SaveBranchToUser([FromBody] SaveBranchToUserDto request)
        {
            if(request.SaveToUserId == Guid.Empty)
            {
				return BadRequest(ApiResponse<UserInfoDto>
				.ErrorResultWithCode("UserId is null", errorStatusCode: (int)ResponseCode.BadRequest));
			}

			if (request == null)
			{
				return BadRequest(ApiResponse<UserInfoDto>
                    .ErrorResultWithCode("Request body is null, please input the branch information", errorStatusCode: (int) ResponseCode.BadRequest));
			}

			if (!ModelState.IsValid)
			{
				return BadRequest(ModelState);
			}

			var response = await _branchService.SaveBranchToUser(request.SaveToUserId, request);
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
        /// Xóa chi nhánh theo ID (Admin only, Xóa mềm) 
        /// </summary>
        /// 
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteBranchById([FromRoute] Guid id)
        {
            try
            {
                await _branchService.RemoveBranch(id);
                return Ok($"Delete branch with id: {id} successfully.");
            }
            catch (InvalidDataException ex)
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
