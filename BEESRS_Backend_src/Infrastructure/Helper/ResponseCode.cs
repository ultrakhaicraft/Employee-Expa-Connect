using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Helper.Enum
{
	public enum ResponseCode
	{
		Success = 200,
		NotFound = 404,
		BadRequest = 400,
		InternalServerError = 500,
		Unauthorized = 401,
		Forbidden = 403,
		Conflict = 409
	}
}
