using Application.Interfaces;
using AutoMapper;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Models.UserDTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Services
{
    public class AdminUserService :IAdminUserService
    {
        private readonly IUserAdminRepository _repo;
        private readonly IMapper _mapper;

        public AdminUserService(IUserAdminRepository repo, IMapper mapper)
        {
            _repo = repo;
            _mapper = mapper;
        }
        public async Task<PagedResult<UserListItemDto>> GetUsersAsync(PagedRequest req)
        {
            var page = await _repo.GetUsersPagedAsync(req);
            var mapped = page.Items.Select(u => _mapper.Map<UserListItemDto>(u)).ToList();
            return new PagedResult<UserListItemDto>(page.Page, page.PageSize, page.TotalItems, mapped);
        }

        public async Task<bool> PromoteUserToModeratorAsync(Guid userId)
        {
            var user = await _repo.GetByIdAsync(userId);
            if (user == null) return false;

            // idempotent
            if (user.RoleId == 2) return true;

            // chính sách: chỉ promote từ role 3 lên 2
            if (user.RoleId != 3) return false;

            user.RoleId = 2;
            await _repo.UpdateAsync(user);
            return true;
        }
    }
}
