using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class City
    {
        [Key]
        public Guid CityId { get; set; } = Guid.NewGuid();

        [ForeignKey("Country")]
        public Guid CountryId { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [StringLength(100)]
        public string? StateProvince { get; set; }

        public virtual Country Country { get; set; }

        public virtual ICollection<Branch> Branches { get; set; } = new List<Branch>();
    }
}
