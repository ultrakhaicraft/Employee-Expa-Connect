using Infrastructure.Models.Common;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Helper
{
	public static class PageConverter<T> where T : class
	{
		public async static Task<PagedResult<T>> ToPagedResultAsync(
			int page, int pageSize, int totalItems, IQueryable<T> queryableList)
		{
			var items = await queryableList.Skip((page - 1) * pageSize)
							   .Take(pageSize)
							   .ToListAsync();

			return new PagedResult<T>(page, pageSize, totalItems, items);
		}
	}
}
