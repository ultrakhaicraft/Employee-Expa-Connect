using CloudinaryDotNet.Actions;
using Infrastructure.Models.Common;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.ThirdParty
{
	public interface ICloudinaryHelper
	{
		Task<DeletionResult> DeleteImageAsync(string existingAvatarUrl, string folderTag);
		Task<UploadResultDto> UploadSingleImageAsync(IFormFile file, string folderTag);
		Task<UploadResultDto> UploadImageFromBytesAsync(byte[] imageBytes, string fileName, string folderTag);
		Task<UploadResultDto> UploadVideoAsync(IFormFile file, string folderTag);
	}
}
