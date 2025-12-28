using Domain.Entities;
using Infrastructure.Helper;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Index.HPRtree;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories.Personal_Itinerary
{
	public class ItineraryItemRepository : IItineraryItemRepository
	{

		private readonly BEESRSDBContext _context;

		public ItineraryItemRepository(BEESRSDBContext context)
		{
			_context = context;
		}

		public async Task CreateBatchAsync(List<ItineraryItem> itineraryItems)
		{
			await _context.ItineraryItems.AddRangeAsync(itineraryItems);
			await _context.SaveChangesAsync();
		}

		public async Task<ItineraryItem> CreateSingleAsync(ItineraryItem itineraryItem)
		{
			_context.ItineraryItems.Add(itineraryItem);
			await _context.SaveChangesAsync();
			return itineraryItem;
		}

		public async Task DeleteAsync(Guid itineraryItemId)
		{
			var itinerary = await _context.ItineraryItems.FindAsync(itineraryItemId);
			if (itinerary != null)
			{
				_context.ItineraryItems.Remove(itinerary);
				await _context.SaveChangesAsync();
			}
		}

		public async Task<ItineraryItem?> GetByIdAsync(Guid itineraryItemId)
		{
			return await _context.ItineraryItems
				.FirstOrDefaultAsync(p => p.ItemId == itineraryItemId);
		}

		public async Task<List<ItineraryItem>> GetAllByItineraryIdAsync(Guid itineraryId)
		{
			if (_context == null)
				throw new InvalidOperationException("DbContext is not initialized in ItineraryItemRepository.");

			var list = _context.ItineraryItems
				.Include(i=>i.Place)
				.Where(p => p.ItineraryId == itineraryId)
				.AsQueryable();

			list = list.OrderByDescending(p => p.SortOrder);
			return await list.ToListAsync();
		}

		public async Task UpdateAsync(ItineraryItem itineraryItem)
		{
			itineraryItem.UpdatedAt = DateTimeOffset.UtcNow;
			_context.ItineraryItems.Update(itineraryItem);
			await _context.SaveChangesAsync();
		}

		public async Task UpdateRangeAsync(IEnumerable<ItineraryItem> itineraryItems)
		{
			_context.ItineraryItems.UpdateRange(itineraryItems);
			await _context.SaveChangesAsync();
		}

	}
}
