using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserDTO
{
    public record UserListItemDto(
        Guid UserId,
        string EmployeeId,
        string Email,
        string FirstName,
        string LastName,
        string FullName,
        int RoleId,
        string RoleName,
        bool IsActive,
        string JobTitle,
        string CurrentBranchName,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt
    );
}
