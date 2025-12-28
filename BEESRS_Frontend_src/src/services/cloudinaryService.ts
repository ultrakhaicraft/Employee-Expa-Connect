import { Cloudinary } from 'cloudinary-core';

// Cấu hình Cloudinary từ environment variables
const cloudinaryConfig = {
  cloud_name: import.meta.env.VITE_CLOUDINARY_CLOUDNAME,
  api_key: import.meta.env.VITE_CLOUDINARY_APIKEY,
  api_secret: import.meta.env.VITE_CLOUDINARY_APISECRET,
};

// Khởi tạo Cloudinary instance
const cloudinary = new Cloudinary(cloudinaryConfig);

// Interface cho kết quả upload
export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

// Interface cho options upload
export interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
}

/**
 * Upload file lên Cloudinary sử dụng unsigned upload
 * @param file - File cần upload
 * @param options - Tùy chọn upload
 * @returns Promise<CloudinaryUploadResult>
 */
export const uploadToCloudinary = async (
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      throw new Error('Only image and video files are allowed');
    }

    // Validate file size (max 10MB for images, 100MB for videos)
    const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for videos, 10MB for images
    if (file.size > maxSize) {
      throw new Error(file.type.startsWith('video/') ? 'Video size must be less than 100MB' : 'Image size must be less than 10MB');
    }

    // Validate Cloudinary config
    if (!validateCloudinaryConfig()) {
      throw new Error('Cloudinary configuration is invalid. Please check your environment variables.');
    }

    // Tạo FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'places_upload_preset');
    formData.append('cloud_name', cloudinaryConfig.cloud_name);

    // Thêm các options
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.public_id) {
      formData.append('public_id', options.public_id);
    }

    // Upload lên Cloudinary (sử dụng endpoint phù hợp cho image hoặc video)
    const endpoint = file.type.startsWith('video/') ? 'video' : 'image';
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/${endpoint}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary upload error:', errorData);
      
      // Extract backend error message
      const errorMessage = errorData.error?.message || 'Upload failed. Please check your Cloudinary configuration.';
      
      // Xử lý các lỗi cụ thể
      if (errorData.error?.message?.includes('Upload preset not found')) {
        throw new Error('Upload preset "places_upload_preset" not found. Please create it in Cloudinary Dashboard with "Unsigned" mode.');
      } else if (errorData.error?.message?.includes('Invalid cloud name')) {
        throw new Error('Invalid Cloudinary cloud name. Please check VITE_CLOUDINARY_CLOUDNAME in your .env file.');
      } else if (errorData.error?.message?.includes('Invalid API key')) {
        throw new Error('Invalid Cloudinary API key. Please check VITE_CLOUDINARY_APIKEY in your .env file.');
      } else {
        throw new Error(errorMessage);
      }
    }

    const result = await response.json();
    
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple files lên Cloudinary
 * @param files - Array of files
 * @param options - Tùy chọn upload
 * @returns Promise<CloudinaryUploadResult[]>
 */
export const uploadMultipleToCloudinary = async (
  files: File[],
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult[]> => {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, options));
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error: any) {
    console.error('Multiple upload error:', error);
    // Re-throw with proper error message
    const errorMessage = error.message || 'Failed to upload multiple files to Cloudinary';
    const customError = new Error(errorMessage);
    throw customError;
  }
};

/**
 * Tạo URL ảnh với transformations
 * @param publicId - Public ID của ảnh
 * @param transformations - Cloudinary transformations
 * @returns string - URL với transformations
 */
export const getCloudinaryImageUrl = (
  publicId: string,
  transformations: any = {}
): string => {
  return cloudinary.url(publicId, transformations);
};

/**
 * Xóa ảnh khỏi Cloudinary (cần API secret)
 * @param publicId - Public ID của ảnh cần xóa
 * @returns Promise<boolean>
 */
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: cloudinaryConfig.api_key,
          api_secret: cloudinaryConfig.api_secret,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Failed to delete image from Cloudinary';
      throw new Error(errorMessage);
    }

    return true;
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    // Re-throw with proper error message
    const errorMessage = error.message || 'Failed to delete image from Cloudinary';
    const customError = new Error(errorMessage);
    throw customError;
  }
};

/**
 * Validate Cloudinary configuration
 * @returns boolean
 */
export const validateCloudinaryConfig = (): boolean => {
  return !!(
    cloudinaryConfig.cloud_name &&
    cloudinaryConfig.api_key &&
    cloudinaryConfig.api_secret
  );
};

// Export cloudinary instance để sử dụng trong các component khác
export { cloudinary };
export default cloudinary;

// Tạo service object để sử dụng trong components
export const cloudinaryService = {
  uploadFile: uploadToCloudinary,
  uploadMultipleFiles: uploadMultipleToCloudinary,
  getImageUrl: getCloudinaryImageUrl,
  deleteImage: deleteFromCloudinary,
  validateConfig: validateCloudinaryConfig,
};