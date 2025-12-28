using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Common
{
    public record OnlyPageRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public record OnlyPageRequestWithUserId : OnlyPageRequest
    {
        public Guid UserId { get; set; }
    }

    public record PageRequestWithLocation : OnlyPageRequest
    {
        public double? UserLat { get; set; }
        public double? UserLng { get; set; }
        public  Guid? BrandId { get; set; }
        public int? CategoryId { get; set; }
        }
}
