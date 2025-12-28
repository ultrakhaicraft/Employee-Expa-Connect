using AutoMapper;
using Domain.Entities;
using Infrastructure.Helper;
using Infrastructure.Interfaces.Personal_Itinerary;
using Infrastructure.Models.Common;
using Infrastructure.Models.ItineraryDTO;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace Infrastructure.Repositories.Personal_Itinerary
{
	public class ItineraryRepository : IItineraryRepository
	{
		private readonly BEESRSDBContext _context;

		public ItineraryRepository(BEESRSDBContext context)
		{
			_context = context;
		}

		public async Task<Itinerary> CreateAsync(Itinerary itinerary)
		{
			_context.Itineraries.Add(itinerary);
			await _context.SaveChangesAsync();
			return itinerary;
		}

		public async Task<bool> DeleteAsync(Guid itineraryId)
		{
			var itinerary = await _context.Itineraries.FindAsync(itineraryId);
			if (itinerary != null)
			{
				_context.Itineraries.Remove(itinerary);
				var result = await _context.SaveChangesAsync();
				return result > 0;
			}

			return false;
		}

		public async Task<PagedResult<Itinerary>> GetPagedByUserIdAsync(ItineraryPagedRequest request, Guid userId)
		{
			var query = _context.Itineraries
			.AsNoTracking()
			.Where(i => i.UserId == userId);


			if (!string.IsNullOrWhiteSpace(request.Title))
			{
				var search = request.Title.Trim().ToLower();
				query = query.Where(i =>
					i.Title.ToLower().Contains(search) ||
					i.Description.ToLower().Contains(search));
			}

			//Filter: TripType
			if (!string.IsNullOrWhiteSpace(request.TripType))
			{
				query = query.Where(i => i.TripType == request.TripType);
			}

			//Filter: DestinationCountry
			if (!string.IsNullOrWhiteSpace(request.DestinationCountry))
			{
				query = query.Where(i => i.DestinationCountry == request.DestinationCountry);
			}

			// Pagination
			var pagedResult = await PageConverter<Itinerary>.ToPagedResultAsync(
			request.Page, request.PageSize, await query.CountAsync(), query);

			return pagedResult;
		}

		public async Task<Itinerary?> GetByIdAsync(Guid itineraryId)
		{
			return await _context.Itineraries
				.FirstOrDefaultAsync(p => p.ItineraryId == itineraryId);
		}

		public async Task<bool> UpdateAsync(Itinerary itinerary)
		{
			itinerary.UpdatedAt = DateTimeOffset.UtcNow;
			_context.Itineraries.Update(itinerary);
			var result = await _context.SaveChangesAsync();
			return result > 0;

		}

		public async Task<PagedResult<Itinerary>> SearchAllItineraryByUserId(ItineraryPagedRequest request, Guid userId)
		{
			var query = _context.Itineraries
				.Where(n=>n.UserId==userId)
				.AsNoTracking();
			
			if (!string.IsNullOrWhiteSpace(request.Title))
			{
				var search = request.Title.Trim().ToLower();
				query = query.Where(i =>
					i.Title.ToLower().Contains(search) ||
					i.Description.ToLower().Contains(search));
			}

			//Filter: TripType
			if (!string.IsNullOrWhiteSpace(request.TripType))
			{
				query = query.Where(i => i.TripType == request.TripType);
			}

			//Filter: DestinationCountry
			if (!string.IsNullOrWhiteSpace(request.DestinationCountry))
			{
				query = query.Where(i => i.DestinationCountry == request.DestinationCountry);
			}

			// Pagination
			var pagedResult = await PageConverter<Itinerary>.ToPagedResultAsync(
			request.Page, request.PageSize, await query.CountAsync(), query);

			return pagedResult;
		}

		public async Task<string> GetItineraryImageUrlByItineraryId(Guid itineraryId)
		{
			var itinerary = await GetByIdAsync(itineraryId);
			if (itinerary != null)
			{
				return itinerary.ItineraryImageUrl ?? string.Empty;
			}
			else
			{
				throw new Exception("itinerary not found while getting itinerary avatar");
			}
		}

		public async Task AddItineraryImage(Guid itineraryId, string itineraryImageUrl)
		{
			var itinerary = await GetByIdAsync(itineraryId);
			if (itinerary != null)
			{
				itinerary.ItineraryImageUrl = itineraryImageUrl;
				itinerary.UpdatedAt = DateTimeOffset.UtcNow;
				_context.Itineraries.Update(itinerary);
				await _context.SaveChangesAsync();
			}
			else
			{
				throw new Exception("itinerary not found while adding itinerary avatar");
			}
		}

		public async Task<PagedResult<Itinerary>> SearchAllItinerary(ItineraryPagedRequest request)
		{
			var query = _context.Itineraries
				.AsNoTracking();

			if (!string.IsNullOrWhiteSpace(request.Title))
			{
				var search = request.Title.Trim().ToLower();
				query = query.Where(i =>
					i.Title.ToLower().Contains(search) ||
					i.Description.ToLower().Contains(search));
			}

			//Filter: TripType
			if (!string.IsNullOrWhiteSpace(request.TripType))
			{
				query = query.Where(i => i.TripType == request.TripType);
			}

			//Filter: DestinationCountry
			if (!string.IsNullOrWhiteSpace(request.DestinationCountry))
			{
				query = query.Where(i => i.DestinationCountry == request.DestinationCountry);
			}

			// Pagination
			var pagedResult = await PageConverter<Itinerary>.ToPagedResultAsync(
			request.Page, request.PageSize, await query.CountAsync(), query);

			return pagedResult;
		}
	}
}
