using Application.Interfaces.ThirdParty;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Infrastructure.Models.Common;
using Microsoft.AspNetCore.Http;

namespace Application.Helper
{
	/// <summary>
	/// Technically it's a service but will DI as singleton helper
	/// </summary>
	public class CloudinaryHelper : ICloudinaryHelper
	{
		private readonly Cloudinary _cloudinary;

		public CloudinaryHelper(Cloudinary cloudinary)
		{
			_cloudinary = cloudinary;
		}

		public async Task<UploadResultDto> UploadSingleImageAsync(IFormFile file, string folderTag)
		{
			try
			{

				//Generate unique file name
				var fileName =  Guid.NewGuid().ToString() + System.IO.Path.GetExtension(file.FileName);

				//Start upload

				using var stream = file.OpenReadStream();

				var UploadParams = new ImageUploadParams()
				{
					File = new FileDescription(fileName, stream),
					Folder = folderTag //Add folder tag to organize files in Cloudinary
				};

				

				var uploadResult = await _cloudinary.UploadAsync(UploadParams);
				if (uploadResult.StatusCode != System.Net.HttpStatusCode.OK && uploadResult.StatusCode != System.Net.HttpStatusCode.Created)
				{
					return new UploadResultDto
					{
						IsSuccess = false,
						ErrorMessage = uploadResult.Error?.Message ?? "Unknown error occurred during file upload"
					};
				}

				return new UploadResultDto
				{
					FileUrl = uploadResult.SecureUrl.AbsoluteUri,
					FileName = fileName,
					FileSize = file.Length,
					IsSuccess = true,
				};
			}
			catch (Exception e)
			{

				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return new UploadResultDto
				{
					IsSuccess = false,
					ErrorMessage = e.Message
				};
			}


		}

		public async Task<DeletionResult> DeleteImageAsync(string existingAvatarUrl,string folderTag)
		{
			// ✅ Step 2: Extract publicId from the Cloudinary URL
			// Example: ".../UserAvatar/bx3jisj6i7vyaaqsz85b.png"
			var fileName = Path.GetFileNameWithoutExtension(existingAvatarUrl); // bx3jisj6i7vyaaqsz85b
			var publicId = $"{folderTag}/{fileName}";

			// ✅ Delete the old avatar from Cloudinary
			var deletionParams = new DeletionParams(publicId)
			{
				ResourceType = ResourceType.Image
			};

			var deletionResult = await _cloudinary.DestroyAsync(deletionParams);
			
			return deletionResult;
		}

		public async Task<UploadResultDto> UploadImageFromBytesAsync(byte[] imageBytes, string fileName, string folderTag)
		{
			try
			{
				using var stream = new System.IO.MemoryStream(imageBytes);

				var UploadParams = new ImageUploadParams()
				{
					File = new FileDescription(fileName, stream),
					Folder = folderTag
				};

				var uploadResult = await _cloudinary.UploadAsync(UploadParams);
				if (uploadResult.StatusCode != System.Net.HttpStatusCode.OK && uploadResult.StatusCode != System.Net.HttpStatusCode.Created)
				{
					return new UploadResultDto
					{
						IsSuccess = false,
						ErrorMessage = uploadResult.Error?.Message ?? "Unknown error occurred during file upload"
					};
				}

				return new UploadResultDto
				{
					FileUrl = uploadResult.SecureUrl.AbsoluteUri,
					FileName = fileName,
					FileSize = imageBytes.Length,
					IsSuccess = true,
				};
			}
			catch (Exception e)
			{
				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return new UploadResultDto
				{
					IsSuccess = false,
					ErrorMessage = e.Message
				};
			}
		}

		public async Task<UploadResultDto> UploadVideoAsync(IFormFile file, string folderTag)
		{
			try
			{
				// Generate unique file name
				var fileName = Guid.NewGuid().ToString() + System.IO.Path.GetExtension(file.FileName);

				// Start upload
				using var stream = file.OpenReadStream();

				var uploadParams = new VideoUploadParams()
				{
					File = new FileDescription(fileName, stream),
					Folder = folderTag
				};

				var uploadResult = await _cloudinary.UploadAsync(uploadParams);
				if (uploadResult.StatusCode != System.Net.HttpStatusCode.OK && uploadResult.StatusCode != System.Net.HttpStatusCode.Created)
				{
					return new UploadResultDto
					{
						IsSuccess = false,
						ErrorMessage = uploadResult.Error?.Message ?? "Unknown error occurred during video upload"
					};
				}

				return new UploadResultDto
				{
					FileUrl = uploadResult.SecureUrl.AbsoluteUri,
					FileName = fileName,
					FileSize = file.Length,
					IsSuccess = true,
				};
			}
			catch (Exception e)
			{
				Console.WriteLine(e.Message);
				Console.WriteLine(e.StackTrace);
				return new UploadResultDto
				{
					IsSuccess = false,
					ErrorMessage = e.Message
				};
			}
		}

	}
}
