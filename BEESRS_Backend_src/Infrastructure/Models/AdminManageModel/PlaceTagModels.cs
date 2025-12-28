using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.AdminManageModel
{
    public record CreatePlaceTagDTO
    {
        [Required]
        public string Name { get; set; }
        [Required]
        public string Description { get; set; }
    }

    public record UpdatePlaceTagDTO : CreatePlaceTagDTO
    {
        public int TagId { get; set; }
    }

    public record PlaceTagDTO
    {
        public int TagId { get; set; }
        public string Name { get; set; }

        public string Description { get; set; }

        public bool IsActive { get; set; }
    }
}
