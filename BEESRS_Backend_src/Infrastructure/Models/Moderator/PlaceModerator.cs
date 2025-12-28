using Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Moderator
{
    public record UpdatePlaceStatus
    {
        public PlaceVerificationStatus Status { get; set; }
        public string? Notes { get; set; }
        public Guid PlaceId { get; set; }
    }
}
