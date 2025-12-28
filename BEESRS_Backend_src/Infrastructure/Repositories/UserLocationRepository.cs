using AutoMapper;
using Domain.Entities;
using Infrastructure.Helper;
using Infrastructure.Interfaces;
using Infrastructure.Models.Common;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Infrastructure.Repositories
{
	public class UserLocationRepository : IUserLocationRepository
	{
		private readonly BEESRSDBContext _context;

		public UserLocationRepository(BEESRSDBContext context)
		{
			_context = context;
		}

		public async Task<UserLocation> CreateAsync(UserLocation userLocation)
		{
			_context.UserLocations.Add(userLocation);
			await _context.SaveChangesAsync();
			return userLocation;
		}

		public async Task DeleteAsync(Guid userLocationId)
		{
			var userLocation = await _context.UserLocations.FindAsync(userLocationId);
			if (userLocation != null)
			{
				_context.UserLocations.Remove(userLocation);
				await _context.SaveChangesAsync();
			}
		}

		public async Task<UserLocation?> GetByIdAsync(Guid userLocationId)
		{
			return await _context.UserLocations
			   .FirstOrDefaultAsync(p => p.LocationId == userLocationId);
		}

		public async Task UpdateAsync(UserLocation userLocation)
		{
			userLocation.RecordedAt = DateTimeOffset.UtcNow; //Update the record location
			_context.UserLocations.Update(userLocation);
			await _context.SaveChangesAsync();
		}


		/// <summary>
		/// Get all user location, no search
		/// </summary>
		/// <param name="request"></param>
		/// <returns></returns>
		/// <exception cref="NotImplementedException"></exception>
		/// Just delete the function if not needed
		public async Task<PagedResult<UserLocation>> GetAllUserLocation(PagedRequest request)
		{
			var list = _context.UserLocations
				.AsNoTracking()
				.AsQueryable();

			list = list.OrderByDescending(p => p.RecordedAt);


			var pagedResult = await PageConverter<UserLocation>.ToPagedResultAsync(
				request.Page, request.PageSize, await list.CountAsync(), list);

			return pagedResult;
		}

	public async Task<List<UserLocation>> GetByUserIdsAsync(List<Guid> userIds)
	{
		return await _context.UserLocations
			.Where(ul => userIds.Contains(ul.UserId) && ul.IsPrimary)
			.ToListAsync();
	}
	}
}
