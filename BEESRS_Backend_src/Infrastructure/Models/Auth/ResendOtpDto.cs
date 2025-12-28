using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Auth
{
    public class ResendOtpDto
    {
        public string Email { get; set; } = default!;
        public string Purpose { get; set; } = "email_verify";
    }
}
