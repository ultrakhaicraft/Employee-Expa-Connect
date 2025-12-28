using Infrastructure.Models.Chat;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IIntentDetectionService
    {
        Task<IntentResultDto> DetectIntentAsync(string message);
    }
}
