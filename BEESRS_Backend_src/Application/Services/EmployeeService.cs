using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces;
using AutoMapper;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Interfaces;
using Infrastructure.Models.Employe;

namespace Application.Services
{
    public class EmployeeService : IEmployeeService
    {
        private readonly IEmployeeRepository _repo;
        private readonly IMapper _mapper;

        public EmployeeService(IEmployeeRepository repo, IMapper mapper)
        {
            _repo = repo;
            _mapper = mapper;
        }

        public async Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto)
        {
            // Validate EmployeeId length nếu có cung cấp (nếu không sẽ tự động generate)
            if (!string.IsNullOrEmpty(dto.EmployeeId) && dto.EmployeeId.Length > 20)
            {
                throw new ArgumentException($"EmployeeId cannot exceed 20 characters. Provided length: {dto.EmployeeId.Length}");
            }
            
            // Map DTO -> Entity (EmployeeId sẽ được tự động generate trong Repository nếu null/empty)
            var entity = _mapper.Map<Employee>(dto);
            var created = await _repo.CreateAsync(entity);
            return _mapper.Map<EmployeeDto>(created);
        }

        public async Task<int> BulkCreateAsync(BulkCreateEmployeeDto bulkDto)
        {
            // Validate EmployeeId length nếu có cung cấp (nếu không sẽ tự động generate)
            var invalidItems = bulkDto.Items
                .Where(item => !string.IsNullOrEmpty(item.EmployeeId) && item.EmployeeId.Length > 20)
                .ToList();
            
            if (invalidItems.Any())
            {
                var invalidIds = string.Join(", ", invalidItems.Select(i => $"'{i.EmployeeId}' (length: {i.EmployeeId.Length})"));
                throw new ArgumentException($"One or more EmployeeIds exceed 20 characters: {invalidIds}");
            }
            
            // Map DTO -> Entity (EmployeeId sẽ được tự động generate trong Repository nếu null/empty)
            var entities = _mapper.Map<List<Employee>>(bulkDto.Items);
            return await _repo.BulkCreateAsync(entities);
        }

        public async Task<EmployeeDto?> GetAsync(string employeeId, string employeeCode)
        {
            var entity = await _repo.GetAsync(employeeId, employeeCode);
            return entity == null ? null : _mapper.Map<EmployeeDto>(entity);
        }

        public async Task<PagedResult<EmployeeDto>> ListAsync(EmployeeQuery query)
        {
            var (items, total) = await _repo.ListAsync(
                search: query.Search,
                page: query.Page,
                pageSize: query.PageSize,
                status: query.Status
            );

            return new PagedResult<EmployeeDto>
            {
                Items = _mapper.Map<IReadOnlyList<EmployeeDto>>(items),
                Total = total,
                Page = query.Page,
                PageSize = query.PageSize
            };
        }

        public Task<bool> DeleteAsync(string employeeId, string employeeCode)
            => _repo.DeleteAsync(employeeId, employeeCode);

        public Task<int> DeleteExpiredAsync(DateTimeOffset? now = null)
            => _repo.DeleteExpiredAsync(now);

        public async Task<(EmployeeDto Dto, bool Created)> UpsertAsync(UpsertEmployeeDto dto)
        {
            if (dto.ExpiresAt is { } exp && exp <= DateTimeOffset.UtcNow)
                throw new ArgumentException("ExpiresAt must be in the future.");

            // Validate EmployeeId length nếu có cung cấp (nếu không sẽ tự động generate)
            if (!string.IsNullOrEmpty(dto.EmployeeId) && dto.EmployeeId.Length > 20)
            {
                throw new ArgumentException($"EmployeeId cannot exceed 20 characters. Provided length: {dto.EmployeeId.Length}");
            }

            // Map DTO -> Entity (EmployeeId sẽ được tự động generate trong Repository nếu null/empty)
            var entity = _mapper.Map<Employee>(dto);
            var (saved, created) = await _repo.UpsertAsync(entity);
            return (_mapper.Map<EmployeeDto>(saved), created);
        }

        // ===== Helpers =====

        public Task<bool> ExistsAsync(string employeeId, string employeeCode)
            => _repo.ExistsAsync(employeeId, employeeCode);

        public Task<bool> IsValidByCodeAsync(string employeeCode)
            => _repo.IsValidEmployeeAsync(employeeCode);

        public Task<bool> IsValidAsync(string employeeId, string employeeCode)
            => _repo.IsValidEmployeeAsync(employeeId, employeeCode);

        public Task<IReadOnlyList<string>> GetRegisteredEmployeeCodesAsync(EmployeeStatus? status = null)
            => _repo.GetRegisteredEmployeeCodesAsync(status);
    }
}
