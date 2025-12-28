using Infrastructure.Models.UserProfileDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.UserDTO
{
    public class UserInfoDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName => $"{FirstName} {LastName}";
        public string EmployeeId { get; set; } = string.Empty;
		public string? CurrentBranch { get; set; } // Current Branch name
		public Guid? CurrentBranchId { get; set; } // Current Branch ID
		public string? JobTitle { get; set; }
		public string? PhoneNumber { get; set; }
		public string RoleName { get; set; } = string.Empty;
        public string FriendshipStatus { get; set; } = string.Empty;
		public bool EmailVerified { get; set; }
        public UserProfileDetailDto? Profile { get; set; }
    }
}
