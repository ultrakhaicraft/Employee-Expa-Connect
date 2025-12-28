using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Common
{
    public record PagedRequest(
        int Page = 1,
        int PageSize = 20,
        string? Search = null,      // email / name
        int? RoleId = null,         // lọc theo role
        bool? IsActive = null
    );

    public record PagedResult<T>(
        int Page,
        int PageSize,
        int TotalItems,
        IReadOnlyList<T> Items
    );
}
