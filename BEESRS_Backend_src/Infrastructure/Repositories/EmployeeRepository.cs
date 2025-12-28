using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Interfaces;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class EmployeeRepository : IEmployeeRepository
    {
        private readonly BEESRSDBContext _context;

        public EmployeeRepository(BEESRSDBContext context)
        {
            _context = context;
        }
        public async Task<Employee> CreateAsync(Employee employee)
        {
            // Auto-generate EmployeeId nếu chưa có hoặc rỗng
            if (string.IsNullOrWhiteSpace(employee.EmployeeId))
            {
                employee.EmployeeId = await GenerateUniqueEmployeeIdAsync();
            }

            Normalize(employee);

            var exists = await _context.Employees.AnyAsync(e =>
                e.EmployeeId == employee.EmployeeId &&
                e.EmployeeCode == employee.EmployeeCode);

            if (exists)
                throw new InvalidOperationException("EmployeeId + EmployeeCode đã tồn tại.");

            if (employee.CreatedAt == default)
                employee.CreatedAt = DateTimeOffset.UtcNow;

            if (employee.Status == default)
                employee.Status = EmployeeStatus.Inactive;

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();
            return employee;
        }

        public async Task<int> BulkCreateAsync(IEnumerable<Employee> employees)
        {
            var list = employees.ToList();
            
            // Auto-generate EmployeeId cho các employee chưa có
            foreach (var e in list)
            {
                if (string.IsNullOrWhiteSpace(e.EmployeeId))
                {
                    e.EmployeeId = await GenerateUniqueEmployeeIdAsync();
                }
            }
            
            foreach (var e in list) Normalize(e);

            var existingKeys = await _context.Employees
                .Where(db => list.Select(x => x.EmployeeId).Contains(db.EmployeeId))
                .Select(db => new { db.EmployeeId, db.EmployeeCode })
                .ToListAsync();

            var existingSet = existingKeys
                .Select(k => $"{k.EmployeeId}||{k.EmployeeCode}")
                .ToHashSet(StringComparer.Ordinal);

            var toAdd = list
                .Where(x => !existingSet.Contains($"{x.EmployeeId}||{x.EmployeeCode}"))
                .Select(x =>
                {
                    if (x.CreatedAt == default) x.CreatedAt = DateTimeOffset.UtcNow;
                    if (x.Status == default) x.Status = EmployeeStatus.Inactive;
                    return x;
                })
                .ToList();

            if (toAdd.Count == 0) return 0;

            await _context.Employees.AddRangeAsync(toAdd);
            return await _context.SaveChangesAsync();
        }

        public async Task<Employee?> GetAsync(string employeeId, string employeeCode)
        {
            employeeId = NormId(employeeId);
            employeeCode = NormCode(employeeCode);

            return await _context.Employees
                .AsNoTracking()
                .Include(e => e.Branch)
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId && e.EmployeeCode == employeeCode);
        }

        public async Task<(IReadOnlyList<Employee> Items, int Total)> ListAsync(
            string? search = null,
            int page = 1,
            int pageSize = 20,
            EmployeeStatus? status = null)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize <= 0 ? 20 : pageSize;

            var q = _context.Employees.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                q = q.Where(e => e.EmployeeId.Contains(s) || e.EmployeeCode.Contains(s) || e.Email.Contains(s));
            }

            if (status.HasValue)
            {
                q = q.Where(e => e.Status == status.Value);
            }

            var total = await q.CountAsync();
            var items = await q
                .Include(e => e.Branch)
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total);
        }

        public async Task<bool> DeleteAsync(string employeeId, string employeeCode)
        {
            employeeId = NormId(employeeId);
            employeeCode = NormCode(employeeCode);

            var entity = await _context.Employees
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId && e.EmployeeCode == employeeCode);

            if (entity == null) return false;

            _context.Employees.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> DeleteExpiredAsync(DateTimeOffset? now = null)
        {
            var ts = now ?? DateTimeOffset.UtcNow;
            var expired = await _context.Employees
                .Where(e => e.Status == EmployeeStatus.Expired || (e.ExpiresAt != null && e.ExpiresAt <= ts))
                .ToListAsync();

            if (expired.Count == 0) return 0;

            _context.Employees.RemoveRange(expired);
            return await _context.SaveChangesAsync();
        }
        public async Task<(Employee Entity, bool Created)> UpsertAsync(Employee employee)
        {
            Normalize(employee);
            
            // Auto-generate EmployeeId nếu chưa có hoặc rỗng
            if (string.IsNullOrWhiteSpace(employee.EmployeeId))
            {
                employee.EmployeeId = await GenerateUniqueEmployeeIdAsync();
            }

            // Tìm entity theo EmployeeId + EmployeeCode
            var entity = await _context.Employees
                .FirstOrDefaultAsync(e => e.EmployeeId == employee.EmployeeId && e.EmployeeCode == employee.EmployeeCode);

            if (entity == null)
            {
                // Tạo mới
                if (employee.CreatedAt == default) employee.CreatedAt = DateTimeOffset.UtcNow;
                if (employee.Status == default) employee.Status = EmployeeStatus.Inactive;
                _context.Employees.Add(employee);
                await _context.SaveChangesAsync();
                return (employee, true);
            }
            else
            {
                // Update existing
                entity.BranchId = employee.BranchId;
                entity.Email = employee.Email;
                entity.JobTitle = employee.JobTitle;
                entity.ExpiresAt = employee.ExpiresAt;
                if (employee.Status != default)
                {
                    entity.Status = employee.Status;
                }
                await _context.SaveChangesAsync();
                return (entity, false);
            }
        }
        public async Task<bool> ExistsAsync(string employeeId, string employeeCode)
        {
            employeeId = NormId(employeeId);
            employeeCode = NormCode(employeeCode);

            return await _context.Employees
                .AsNoTracking()
                .AnyAsync(e => e.EmployeeId == employeeId && e.EmployeeCode == employeeCode);
        }
        public async Task<bool> IsValidEmployeeAsync(string employeeCode)
        {
            if (string.IsNullOrWhiteSpace(employeeCode)) return false;

            var code = NormCode(employeeCode);

            return await _context.Employees
                .AsNoTracking()
                .AnyAsync(e =>
                    e.EmployeeCode == code &&
                    e.Status == EmployeeStatus.Active);
        }
        public async Task<bool> IsValidEmployeeAsync(string employeeId, string employeeCode)
        {
            if (string.IsNullOrWhiteSpace(employeeId) || string.IsNullOrWhiteSpace(employeeCode))
                return false;

            var id = NormId(employeeId);
            var code = NormCode(employeeCode);

            return await _context.Employees
                .AsNoTracking()
                .AnyAsync(e =>
                    e.EmployeeId == id &&
                    e.EmployeeCode == code &&
                    e.Status == EmployeeStatus.Active);
        }

        private static void Normalize(Employee e)
        {
            e.EmployeeId = NormId(e.EmployeeId);
            e.EmployeeCode = NormCode(e.EmployeeCode);
            e.Email = NormEmail(e.Email);
        }

        private static string NormId(string value)
        {
            var trimmed = value?.Trim() ?? string.Empty;
            // Truncate nếu vượt quá 20 ký tự để tránh lỗi database
            if (trimmed.Length > 20)
            {
                return trimmed.Substring(0, 20);
            }
            return trimmed;
        }

        private static string NormCode(string value)
        {
            return (value?.Trim() ?? string.Empty).ToUpperInvariant();
        }

        private static string NormEmail(string value)
        {
            return (value?.Trim() ?? string.Empty).ToLowerInvariant();
        }

        /// <summary>
        /// Tạo EmployeeId unique tự động
        /// Format: EMP{YYYYMMDD}{random 6 số}
        /// Ví dụ: EMP20251129A1B2C3 (16 ký tự)
        /// </summary>
        private async Task<string> GenerateUniqueEmployeeIdAsync()
        {
            var random = new Random();
            var maxAttempts = 10;
            var attempt = 0;

            while (attempt < maxAttempts)
            {
                // Format: EMP{YYYYMMDD}{random 6 ký tự alphanumeric}
                var datePart = DateTimeOffset.UtcNow.ToString("yyyyMMdd");
                var randomPart = GenerateRandomString(6, random);
                var employeeId = $"EMP{datePart}{randomPart}";

                // Đảm bảo không vượt quá 20 ký tự
                if (employeeId.Length > 20)
                {
                    employeeId = employeeId.Substring(0, 20);
                }

                // Kiểm tra xem EmployeeId đã tồn tại chưa
                var exists = await _context.Employees
                    .AnyAsync(e => e.EmployeeId == employeeId);

                if (!exists)
                {
                    return employeeId;
                }

                attempt++;
            }

            // Fallback: dùng GUID rút gọn nếu không tạo được sau 10 lần thử
            var guidPart = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpperInvariant();
            return $"EMP{guidPart}";
        }

        private static string GenerateRandomString(int length, Random random)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
        public async Task<Employee?> GetActiveByCodeAsync(string employeeCode)
        {
            var code = (employeeCode ?? string.Empty).Trim().ToUpperInvariant();

            return await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeCode == code && e.Status == EmployeeStatus.Active)
                .OrderByDescending(e => e.CreatedAt) 
                .FirstOrDefaultAsync();
        }

        public async Task<Employee?> GetInactiveByCodeAsync(string employeeCode)
        {
            var code = (employeeCode ?? string.Empty).Trim().ToUpperInvariant();

            return await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeCode == code && e.Status == EmployeeStatus.Inactive)
                .OrderByDescending(e => e.CreatedAt) 
                .FirstOrDefaultAsync();
        }

        public async Task<bool> UpdateEmployeeStatusAsync(string employeeId, string employeeCode, EmployeeStatus newStatus)
        {
            employeeId = NormId(employeeId);
            employeeCode = NormCode(employeeCode);

            var entity = await _context.Employees
                .FirstOrDefaultAsync(e => e.EmployeeId == employeeId && e.EmployeeCode == employeeCode);

            if (entity == null) return false;

            entity.Status = newStatus;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IReadOnlyList<string>> GetRegisteredEmployeeCodesAsync(EmployeeStatus? status = null)
        {
            var q = _context.Employees.AsNoTracking().AsQueryable();

            if (status.HasValue)
            {
                q = q.Where(e => e.Status == status.Value);
            }

            var codes = await q
                .Select(e => e.EmployeeCode)
                .Distinct()
                .OrderBy(code => code)
                .ToListAsync();

            return codes;
        }
    }
}