using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.ThirdParty
{
    public interface IContentSafetyService
    {
        Task<bool> CheckTextSafetyAsync(string text);
    }
}
