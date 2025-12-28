using System;

namespace Infrastructure.Models.UserDTO
{
    public class UserSearchResultDto
    {
        public Guid UserId { get; set; }
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string FullName { get; set; }
        public string? ProfilePictureUrl { get; set; }
        public string? JobTitle { get; set; }
        public Guid CurrentBranchId { get; set; }
        public string? CurrentBranchName { get; set; }
    }
}

