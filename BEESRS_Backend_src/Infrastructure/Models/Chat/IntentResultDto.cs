using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Chat
{
    public class IntentResultDto
    {
        public string Intent { get; set; }
        public double Confidence { get; set; }
        public string Reasoning { get; set; }
        public Dictionary<string, string> Slots { get; set; }
    }
}
