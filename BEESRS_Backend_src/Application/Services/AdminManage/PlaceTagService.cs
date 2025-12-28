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
    public class PlaceTagService : IPlaceTagService
    {
        private readonly IPlaceTagRepository _placeTagRepository;
        private readonly IMapper _mapper;
        public PlaceTagService(IPlaceTagRepository placeTagRepository, IMapper mapper)
        {
            _placeTagRepository = placeTagRepository;
            _mapper = mapper;
        }

        public async Task CreatePlaceTagAsync(CreatePlaceTagDTO createPlaceTagDTO)
        {
            var placeTag = _mapper.Map<PlaceTag>(createPlaceTagDTO);
            await _placeTagRepository.CreatePlaceTagAsync(placeTag);
        }

        public async Task DeletePlaceTagAsync(int id)
        {
            await _placeTagRepository.Delete(id);
        }

        public async Task<PagedResult<PlaceTagDTO>> GetAllPlaceTagsAsync(OnlyPageRequest req)
        {
            var query = _placeTagRepository.GetAllPlaceTags();

            var totalCount = await query.CountAsync();

            var placeTags = await query
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            var result = _mapper.Map<List<PlaceTagDTO>>(placeTags);
            return new PagedResult<PlaceTagDTO>(
                req.Page,
                req.PageSize,
                totalCount,
                result
                );
        }

        public async Task<List<PlaceTagDTO>> GetAllTags()
        {
            var tags =  await _placeTagRepository.GetAllPlaceTags().OrderBy(t => t.Name).ToListAsync();
            return _mapper.Map<List<PlaceTagDTO>>(tags);
        }

        public async Task<PlaceTagDTO> GetPlaceTagByIdAsync(int id)
        {
            var placeTag = await  _placeTagRepository.GetPlaceTagByIdAsync(id);

            return _mapper.Map<PlaceTagDTO>(placeTag);
        }

        public async Task<PagedResult<PlaceTagDTO>> SearchPlaceTags(string? name, OnlyPageRequest req)
        {
            var query = _placeTagRepository.SearchPlaceTags(name);

            var totalCount = await query.CountAsync();

            var placeTags = await query
                .Skip((req.Page - 1) * req.PageSize)
                .Take(req.PageSize)
                .ToListAsync();

            var result = _mapper.Map<List<PlaceTagDTO>>(placeTags);
            return new PagedResult<PlaceTagDTO>(
                req.Page,
                req.PageSize,
                totalCount,
                result
                );
        }

        public async Task UpdatePlaceTagAsync(UpdatePlaceTagDTO updatePlaceTagDTO)
        {
            var placeTag = await _placeTagRepository.GetPlaceTagByIdAsync(updatePlaceTagDTO.TagId);
            if(placeTag == null)
             throw new InvalidDataException("Place tag not found");

            _mapper.Map(updatePlaceTagDTO, placeTag);
            await _placeTagRepository.Update(placeTag);
        }
    }
}
