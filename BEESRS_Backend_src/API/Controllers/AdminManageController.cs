using Application.Interfaces.AdminManage;
using Infrastructure.Models.AdminManageModel;
using Infrastructure.Models.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminManageController : ControllerBase
    {
        private readonly IPlaceCategoryService _placeCategoryService;
        private readonly IPlaceTagService _placeTagService;

        public AdminManageController(IPlaceCategoryService placeCategoryService, IPlaceTagService placeTagService)
        {
            _placeCategoryService = placeCategoryService;
            _placeTagService = placeTagService;
        }
        #region Place Category Management

        /// <summary>
        /// Thêm place category mới
        /// </summary>
        /// 
        [HttpPost("category/create-place-category")]
        public async Task<ActionResult> CreatePlaceCategory([FromBody] CreateCategoryDTO createCategoryDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                await _placeCategoryService.CreateCategoryAsync(createCategoryDTO);
                return Ok("Create place category successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy danh sách place category
        /// </summary>
        /// 
        [HttpGet("category/get-all-place-categories")]
        public async Task<ActionResult> GetAllPlaceCategories([FromQuery] OnlyPageRequest request)
        {
            try
            {
                var categories = await _placeCategoryService.GetAllCategoriesAsync(request);
                if (categories.Items.Count == 0)
                    return NotFound("No place categories found.");

                return Ok(categories);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Tìm kiếm place category theo tên (nếu name = null thì trả về tất cả)
        /// </summary>
        /// 
        [HttpGet("category/search-place-categories")]
        public async Task<ActionResult> SearchPlaceCategories([FromQuery] string? name, [FromQuery] OnlyPageRequest request)
        {
            try
            {
                var categories = await _placeCategoryService.SearchCategories(name, request);
                if (categories.Items.Count == 0)
                    return NotFound("No place categories found.");

                return Ok(categories);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Cập nhật place category
        /// </summary>
        /// 
        [HttpPut("category/update-place-category")]
        public async Task<ActionResult> UpdatePlaceCategory([FromBody] UpdateCategoryDTO updateCategoryDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                await _placeCategoryService.UpdateCategoryAsync(updateCategoryDTO);
                return Ok("Update place category successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Xóa place category
        /// </summary>
        /// 
        [HttpDelete("category/delete-place-category/{id}")]
        public async Task<ActionResult> DeletePlaceCategory([FromRoute] int id)
        {
            try
            {
                await _placeCategoryService.DeleteCategoryAsync(id);
                return Ok("Delete place category successfully.");
            }

            catch (InvalidDataException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
        #endregion

        /// <summary>
        /// Thêm place tag mới
        /// </summary>
        /// 
        [HttpPost("place-tag/create-place-tag")]
        public async Task<ActionResult> CreatePlaceTag(CreatePlaceTagDTO createPlaceTagDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                await _placeTagService.CreatePlaceTagAsync(createPlaceTagDTO);
                return Ok("Create place tag successfully.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy danh sách place tag
        /// </summary>
        /// 
        [HttpGet("place-tag/get-all-place-tags")]
        public async Task<ActionResult> GetAllPlaceTags([FromQuery] OnlyPageRequest request)
        {
            try
            {
                var tags = await _placeTagService.GetAllPlaceTagsAsync(request);
                if (tags.Items.Count == 0)
                    return NotFound("No place tags found.");
                return Ok(tags);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Tìm kiếm place tag theo tên (nếu name = null thì trả về tất cả)
        /// </summary>
        /// 
        [HttpGet("place-tag/search-place-tags")]
        public async Task<ActionResult> SearchPlaceTags([FromQuery] string? name, [FromQuery] OnlyPageRequest request)
        {
            try
            {
                var tags = await _placeTagService.SearchPlaceTags(name, request);
                if (tags.Items.Count == 0)
                    return NotFound("No place tags found.");
                return Ok(tags);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy place tag theo Id
        /// </summary>
        /// 

        [HttpGet("place-tag/get-place-tag-by-id/{id}")]
        public async Task<ActionResult> GetPlaceTagById([FromRoute] int id)
        {
            try
            {
                var tag = await _placeTagService.GetPlaceTagByIdAsync(id);
                return Ok(tag);
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

        /// <summary>
        /// Cập nhật thông tin của place tag
        /// </summary>
        /// 
        [HttpPut("place-tag/update-place-tag")]
        public async Task<ActionResult> UpdatePlaceTag([FromBody] UpdatePlaceTagDTO updatePlaceTagDTO)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                await _placeTagService.UpdatePlaceTagAsync(updatePlaceTagDTO);
                return Ok("Update place tag successfully.");
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

        /// <summary>
        /// Xóa place tag
        /// </summary>
        /// 
        [HttpDelete("place-tag/delete-place-tag/{id}")]
        public async Task<ActionResult> DeletePlaceTag([FromRoute] int id)
        {
            try
            {
                await _placeTagService.DeletePlaceTagAsync(id);
                return Ok("Delete place tag successfully.");
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

