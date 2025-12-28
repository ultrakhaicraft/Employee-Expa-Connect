using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{

    public class PlaceImage
    {
        [Key]
        public Guid ImageId { get; set; } = Guid.NewGuid();

        [ForeignKey("Place")]
        public Guid PlaceId { get; set; }

        [ForeignKey("UploadedByUser")]
        public Guid UploadedBy { get; set; }

        [Required]
        public string ImageUrl { get; set; }

        public string AltText { get; set; }

        public bool IsPrimary { get; set; } = false;

        public int SortOrder { get; set; } = 0;

        public DateTimeOffset UploadDate { get; set; } = DateTimeOffset.Now;

        // Navigation Properties
        public virtual Place Place { get; set; }
        public virtual User UploadedByUser { get; set; }
    }
}
