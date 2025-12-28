using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Enums;
using Infrastructure.Models.Employe;

namespace Application.Interfaces
{
    public interface IEmployeeService
    {
        Task<EmployeeDto> CreateAsync(CreateEmployeeDto dto);
        Task<int> BulkCreateAsync(BulkCreateEmployeeDto bulkDto);
        Task<EmployeeDto?> GetAsync(string employeeId, string employeeCode);
        Task<PagedResult<EmployeeDto>> ListAsync(EmployeeQuery query);
        Task<bool> DeleteAsync(string employeeId, string employeeCode);
        Task<int> DeleteExpiredAsync(DateTimeOffset? now = null);
        Task<(EmployeeDto Dto, bool Created)> UpsertAsync(UpsertEmployeeDto dto);

        // Helpers
        Task<bool> ExistsAsync(string employeeId, string employeeCode);

        // Validity checks
        Task<bool> IsValidByCodeAsync(string employeeCode);
        Task<bool> IsValidAsync(string employeeId, string employeeCode);

        // Get registered employee codes
        Task<IReadOnlyList<string>> GetRegisteredEmployeeCodesAsync(EmployeeStatus? status = null);
    }
}
