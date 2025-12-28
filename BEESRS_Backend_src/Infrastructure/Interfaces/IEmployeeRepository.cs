using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Entities;
using Domain.Enums;

namespace Infrastructure.Interfaces
{
    public interface IEmployeeRepository
    {
        Task<Employee> CreateAsync(Employee employee);
        Task<int> BulkCreateAsync(IEnumerable<Employee> employees);
        Task<Employee?> GetAsync(string employeeId, string employeeCode);
        Task<(IReadOnlyList<Employee> Items, int Total)> ListAsync(
            string? search = null,
            int page = 1,
            int pageSize = 20,
            EmployeeStatus? status = null);
        Task<bool> DeleteAsync(string employeeId, string employeeCode);
        Task<int> DeleteExpiredAsync(DateTimeOffset? now = null);
        Task<(Employee Entity, bool Created)> UpsertAsync(Employee employee);
        Task<bool> ExistsAsync(string employeeId, string employeeCode);
        Task<bool> IsValidEmployeeAsync(string employeeCode);
        Task<bool> IsValidEmployeeAsync(string employeeId, string employeeCode);
        Task<Employee?> GetActiveByCodeAsync(string employeeCode);
        Task<Employee?> GetInactiveByCodeAsync(string employeeCode);
        Task<bool> UpdateEmployeeStatusAsync(string employeeId, string employeeCode, EmployeeStatus newStatus);
        Task<IReadOnlyList<string>> GetRegisteredEmployeeCodesAsync(EmployeeStatus? status = null);
    }
}
