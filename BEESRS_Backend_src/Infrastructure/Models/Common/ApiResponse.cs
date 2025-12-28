using Infrastructure.Helper.Enum;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Models.Common
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int StatusCode { get; set; } = 500; // Default to Internal Server Error
		public T? Data { get; set; }
        public List<string> Errors { get; set; } = new();

        public static ApiResponse<T> SuccessResult(T data, string message = "Success")
        {
            return new ApiResponse<T>
            {
                Success = true,
                Message = message,
                StatusCode = (int) ResponseCode.Success,   
				Data = data
            };
        }

        public static ApiResponse<T> ErrorResult(string message, List<string>? errors = null)
        {
            return new ApiResponse<T>
            {
                Success = false,
				Message = message,
                Errors = errors ?? new List<string>()
            };
        }

        //Including an option to add status code
        
		public static ApiResponse<T> ErrorResultWithCode
            (string message, int? errorStatusCode, List<string>? errors = null)
		{
			return new ApiResponse<T>
			{
				Success = false,
				StatusCode =errorStatusCode.GetValueOrDefault(),
				Message = message,
				Errors = errors ?? new List<string>()
			};
		}
        
	}
}
