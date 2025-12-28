using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Country
    {
        [Key]
        public Guid CountryId { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(100)]
        public string Name { get; set; }

        [Required]
        [StringLength(3)]
        public string IsoCode { get; set; }

        [Required]
        [StringLength(50)]
        public string Currency { get; set; }

        [Required]
        [StringLength(50)]
        public string TimeZone { get; set; }

        public virtual ICollection<City> Cities { get; set; } = new List<City>();
        public virtual ICollection<Branch> Branches { get; set; } = new List<Branch>();
    }
}
