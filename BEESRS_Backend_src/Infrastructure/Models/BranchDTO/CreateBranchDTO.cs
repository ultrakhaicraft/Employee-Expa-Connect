using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.BranchDTO
{
    public record CreateBranchDTO
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [StringLength(255)]
        public string? Address { get; set; }

        [Required]
        public Guid CityId { get; set; }

        [Required]
        public Guid CountryId { get; set; }

        [StringLength(30)]
        public string? PhoneNumber { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        [Required]
        public DateOnly EstablishedDate { get; set; }
    }
    public record UpdateBranchDTO : CreateBranchDTO
    {
        [Required]
        public Guid BranchId { get; set; }
    }

    public record BranchDTO : CreateBranchDTO
    {
        public Guid BranchId { get; set; }
        public bool IsActive { get; set; } = true;
        public string? CityName { get; set; }
        public string? CountryName { get; set; }
    }

    public record SearchBranchFilter
    {
        public string? Name { get; set; }
        public Guid? CityId { get; set; }
        public Guid? CountryId { get; set; }
    }
}
