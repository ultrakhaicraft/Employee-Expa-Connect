using Domain.Entities;
using Infrastructure.Helper;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.Personal_Itinerary
{
	public class ItineraryShareRepository : IItineraryShareRepository
	{
		private readonly BEESRSDBContext _context;
		public ItineraryShareRepository(BEESRSDBContext context)
		{
			_context = context;
		}
		
		public async Task<ItineraryShare> CreateSingleAsync(ItineraryShare itineraryShare)
		{
			_context.ItineraryShares.Add(itineraryShare);
			await _context.SaveChangesAsync();
			return itineraryShare;
		}

		public async Task DeleteAsync(ItineraryShare itineraryShare)
		{
			
			_context.ItineraryShares.Remove(itineraryShare);
			await _context.SaveChangesAsync();
			
		}

		public async Task<ItineraryShare?> GetByIdAsync(Guid itineraryShareId)
		{
			return await _context.ItineraryShares
				.Include(s => s.SharedWithUser)
				.Include(s => s.SharedByUser)
				.Include(s => s.Itinerary)
				.FirstOrDefaultAsync(p => p.ShareId == itineraryShareId);
		}

		public async Task UpdateAsync(ItineraryShare itineraryShare)
		{
			_context.ItineraryShares.Update(itineraryShare);
			await _context.SaveChangesAsync();
		}

		public async Task<IEnumerable<ItineraryShare>> GetSharesByItineraryIdAsync(Guid itineraryId)
		{
			return await _context.ItineraryShares
				.Include(s => s.SharedWithUser)
				.Include(s => s.SharedByUser)
				.Include(s => s.Itinerary)
				.Where(s => s.ItineraryId == itineraryId)
				.ToListAsync();
		}

		public async Task<IEnumerable<ItineraryShare>> GetSharedWithUserAsync(Guid userId)
		{
			return await _context.ItineraryShares
				.Include(s => s.Itinerary)
				.Include(s => s.SharedByUser)
				.Where(s => s.SharedWithUserId == userId)
				.ToListAsync();
		}

		public async Task<PagedResult<ItineraryShare>> GetPagedCreatedByUser(PagedRequest request, Guid UserId)
		{
			var query = _context.ItineraryShares
			.AsNoTracking()
			.Where(i => i.SharedBy == UserId);

			// Pagination
			var pagedResult = await PageConverter<ItineraryShare>.ToPagedResultAsync(
			request.Page, request.PageSize, await query.CountAsync(), query);

			return pagedResult;
		}

		public async Task<ItineraryShare?> GetShareByItineraryIdAndUserIdAsync(Guid itineraryId, Guid userId)
		{
			return await _context.ItineraryShares
				.FirstOrDefaultAsync(s => s.ItineraryId == itineraryId && s.SharedWithUserId == userId);

		}
	}
}
