using Application.Interfaces.AdminManage;
using AutoMapper;
using Domain.Entities;
using Infrastructure.Interfaces.AdminManage;
using Infrastructure.Models.AdminManageModel;
using Infrastructure.Models.Common;
using Infrastructure.Models.PlaceDTO;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services.AdminManage
{
    public class PlaceCategoryService : IPlaceCategoryService
    {
        private readonly ICategoryRepository _categoryRepository;
        private readonly IMapper _mapper;

        public PlaceCategoryService(ICategoryRepository categoryRepository, IMapper mapper)
        {
            _categoryRepository = categoryRepository;
            _mapper = mapper;
        }

        public async Task CreateCategoryAsync(CreateCategoryDTO createCategoryDTO)
        {
            var category = _mapper.Map<PlaceCategory>(createCategoryDTO);
            await _categoryRepository.CreateCategoryAsync(category);
        }

        public async Task DeleteCategoryAsync(int id)
        {
            await _categoryRepository.Delete(id);
        }

        public async Task<PagedResult<PlaceCategoryDTO>> GetAllCategoriesAsync(OnlyPageRequest req)
        {
            var query = _categoryRepository.GetAllCategoriesAsync();

            var totalCount = await query.CountAsync();

            var categories = await query
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            var result = _mapper.Map<List<PlaceCategoryDTO>>(categories);
            return new PagedResult<PlaceCategoryDTO>(
                req.Page,
                req.PageSize,
                totalCount,
                result
                );
        }

        public async Task<PlaceCategoryDTO> GetCategoryByIdAsync(int id)
        {
            var category = await  _categoryRepository.GetCategoryByIdAsync(id);
            return _mapper.Map<PlaceCategoryDTO>(category);
        }

        public async Task<PagedResult<PlaceCategoryDTO>> SearchCategories(string? name, OnlyPageRequest req)
        {
            var query = _categoryRepository.SearchCategories(name);
            var totalCount = await query.CountAsync();

            var categories = await query
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            var result = _mapper.Map<List<PlaceCategoryDTO>>(categories);
            return new PagedResult<PlaceCategoryDTO>(
                req.Page,
                req.PageSize,
                totalCount,
                result
                );
        }

        public async Task UpdateCategoryAsync(UpdateCategoryDTO updateCategoryDTO)
        {
            var existingCategory = await _categoryRepository.GetCategoryByIdAsync(updateCategoryDTO.CategoryId);
            if (existingCategory == null)
                throw new KeyNotFoundException($"Category with ID {updateCategoryDTO.CategoryId} not found.");

            _mapper.Map(updateCategoryDTO, existingCategory);
            await _categoryRepository.Update(existingCategory);
        }
    }
}
