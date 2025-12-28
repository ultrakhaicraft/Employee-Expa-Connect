using Domain.Enums;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.PlaceDTO
{
	public record CreatePlaceDto
	{
        [Required]
        [StringLength(200)]
        public string Name { get; set; }

        [Required]
        public string Description { get; set; }

        public int? CategoryId { get; set; }

        [StringLength(255)]
        public string? GooglePlaceId { get; set; }

        [Required]
        [Column(TypeName = "float(53)")]
        public double Latitude { get; set; }

        [Required]
        [Column(TypeName = "float(53)")]
        public double Longitude { get; set; }

        [Required]
        [StringLength(200)]
        public string AddressLine1 { get; set; }

        public TimeSpan? OpenTime { get; set; }

        public TimeSpan? CloseTime { get; set; }

        [Required]
        [StringLength(100)]
        public string City { get; set; }

        [Required]
        [StringLength(100)]
        public string StateProvince { get; set; }

        [StringLength(20)]
        public string? PhoneNumber { get; set; }

        public string? WebsiteUrl { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        [StringLength(100)]
        public string? BestTimeToVisit { get; set; }

        [StringLength(100)]
        public string? BusyTime { get; set; }
        public string? SuitableFor { get; set; }
        public List<CreatePlaceImgeDTO> ImageUrlsList { get; set; } = new List<CreatePlaceImgeDTO>();
        public List<int> Tags { get; set; } = new List<int>();
        public void Validate()
        {
            if (ImageUrlsList.Count > 10)
            {
                throw new ValidationException("1 place have maximum 10 images.");
            }
            if (Tags.Count > 10)
            {
                throw new ValidationException("1 place have maximum 10 tags.");
            }
        }
    }

    public record UpdatePlaceDTO : CreatePlaceDto
    {
        public Guid PlaceId { get; set; }
    }
    public record AddPlaceImage
    {
        public Guid PlaceId { get; set; }
        public List<CreatePlaceImgeDTO> ImageUrlsList { get; set; } = new List<CreatePlaceImgeDTO>();
    }

    public record CreatePlaceImgeDTO
    {
        [Required]
        public string ImageUrl { get; set; }
        public string? AltText { get; set; }
    }

    public record PlaceImageDTO
    {
        [Required]
        public Guid ImageId { get; set; }
        [Required]
        public string ImageUrl { get; set; }
        public string? AltText { get; set; }
    }
}
