import apiClient, { formatErrorMessage } from "../utils/axios";
import { uploadMultipleToCloudinary } from "./cloudinaryService";
import type { CloudinaryUploadResult } from "./cloudinaryService";

export const ViewProfile = async () => {
    try {
      const response = await apiClient.get("/api/User/profile");
      if (!response || response.data === undefined || response.data === null) {
        return null;
      }
      return response.data;
    } catch (error: any) {
      console.warn('ViewProfile error:', error.response?.status, error.message);
      return null;
    }
  };

export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get("/api/User/profile");
    if (!response) {
      return null;
    }
    // API returns { success, data: { ...userInfo, profile: {...} } }
    const data = response.data?.data || response.data || null;
    return data;
  } catch (error: any) {
    console.warn('getCurrentUser error:', error.response?.status, error.message);
    return null;
  }
};

export const UpdateAvatarProfile = async (userId: string, imageFile: File) => {
    try {
      // Create FormData for multipart/form-data
      const formData = new FormData();
      formData.append('imageFile', imageFile);

      // Send file directly to backend API as multipart/form-data
      const response = await apiClient.patch(`/api/User/profiles/${userId}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (!response || !response.data) {
        throw new Error("Invalid response from the server");
      }
      return response.data;
    } catch (error: any) {
      // Extract backend error message
      const errorMessage = formatErrorMessage(error, "Failed to update avatar");
      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      throw customError;
    }
  };

export const CreateProfile = async (profileData: {
  userId: string;
  homeCountry: string;
  currentLocationCity: string;
  currentLocationCountry: string;
  timezone: string;
  dateFormat: string;
  bio: string;
}) => {
    try {
      const response = await apiClient.post("/api/User/profiles", profileData);
      if (!response || !response.data) {
        throw new Error("Invalid response from the server");
      }
      return response.data;
    } catch (error: any) {
      const errorMessage = formatErrorMessage(error, "Failed to create profile");
      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      throw customError;
    }
  };

export const UpdateProfile = async (userId: string, profileData: {
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
  phoneNumber: string;
  homeCountry: string;
  currentLocationCity: string;
  currentLocationCountry: string;
  timezone: string;
  bio: string;
}) => {
  try {
    const normalize = (v: unknown) => {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        return trimmed.length === 0 ? null : trimmed;
      }
      return v ?? null;
    };

    const payload = {
      // top-level fields (as required by the documented request body)
      email: normalize(profileData.email),
      firstName: normalize(profileData.firstName),
      lastName: normalize(profileData.lastName),
      department: normalize(profileData.department),
      jobTitle: normalize(profileData.jobTitle),
      phoneNumber: normalize(profileData.phoneNumber),
      homeCountry: normalize(profileData.homeCountry),
      currentLocationCity: normalize(profileData.currentLocationCity),
      currentLocationCountry: normalize(profileData.currentLocationCountry),
      timezone: normalize(profileData.timezone),
      bio: normalize(profileData.bio),
      // also include nested profile in case backend expects it inside "profile"
      profile: {
        homeCountry: normalize(profileData.homeCountry),
        currentLocationCity: normalize(profileData.currentLocationCity),
        currentLocationCountry: normalize(profileData.currentLocationCountry),
        timezone: normalize(profileData.timezone),
        bio: normalize(profileData.bio),
      },
    } as const;

    const response = await apiClient.put(`/api/User/update-profile/${userId}`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to update profile");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export interface UserPreference {
  preferenceId: string;
  userId: string;
  cuisinePreferences: string;
  budgetPreference: number;
  distanceRadius: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferencePayload {
  cuisinePreferences: string;
  budgetPreference: number;
  distanceRadius: number;
}

export const GetUserPreferences = async (): Promise<UserPreference | null> => {
  try {
    const response = await apiClient.get("/api/UserPreference/get-user-preference");
    if (!response || !response.data) {
      return null;
    }
    return response.data as UserPreference;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    const errorMessage = formatErrorMessage(error, "Failed to get user preferences");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};



export const CreateUserPreference = async (preferencesData: UserPreferencePayload) => {
  try {
    const response = await apiClient.post("/api/UserPreference/create-user-preference", preferencesData);
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to create user preference");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const UpdateUserPreference = async (preferencesData: UserPreferencePayload) => {
  try {
    const response = await apiClient.put(`/api/UserPreference/update-user-preference`, preferencesData);
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to update user preference");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const DeleteUserPreference = async (preferenceId: string) => {
  try {
    const response = await apiClient.delete(`/api/UserPreference/${preferenceId}`);
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to delete user preference");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const ViewAllUserProfiles = async () => {
  try {
    const response = await apiClient.get("/api/Friendships/people-profile-you-may-know");
    return response.data ?? { data: { items: [] } };
  } catch (error: any) {
    // Return empty data structure for any error to avoid toast errors
    console.warn('ViewAllUserProfiles error:', error.response?.status, error.message);
    return { data: { items: [] } };
  }
};

export const searchUsers = async (query: string) => {
  try {
    const response = await apiClient.get(`/api/User/search?query=${encodeURIComponent(query)}`);
    // Handle ApiResponse format
    if (response.data?.data) {
      return response.data.data;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error: any) {
    console.warn('searchUsers error:', error.response?.status, error.message);
    return [];
  }
};

export const ViewOtherUserProfile = async (userId: string) => {
  try {
    const response = await apiClient.get(`/api/User/profiles/other/${userId}`);
    return response.data ?? null;
  } catch (error: any) {
    console.warn('ViewOtherUserProfile error:', error.response?.status, error.message);
    return null;
  }
};

export const ViewOtherPlaceCreated = async (userId: string, page: number = 1, pageSize: number = 50) => {
  try {
    const response = await apiClient.post('/Place/get-all-created-place-of', {
      page,
      pageSize,
      userId
    });
    return response.data ?? { page, pageSize, totalItems: 0, items: [] };
  } catch (error: any) {
    console.warn('ViewOtherPlaceCreated error:', error.response?.status, error.message);
    return { page, pageSize, totalItems: 0, items: [] };
  }
};

export const ResetPassword = async (token: string, email: string, newPassword: string, confirmPassword: string) => {
  try {
    const response = await apiClient.post("/api/Auth/reset-password", {
      token,
      email,
      newPassword,
      confirmPassword
    });
    
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to reset password");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const response = await apiClient.post("/api/Auth/forgot-password", { email });
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to send password reset email");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  try {
    const response = await apiClient.post("/api/Auth/change-password", {
      userId,
      currentPassword,
      newPassword
    });
    
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to change password");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const ViewCategory = async () => {
  try {
    const response = await apiClient.get("/Place/get-all-category");
    if (!response || response.data === undefined || response.data === null) {
      return [];
    }
    return response.data;
  } catch (error: any) {
    console.warn('ViewCategory error:', error.response?.status, error.message);
    return [];
  }
};

export const CreateNewPlace = async (placeData: {
  name: string;
  description: string;
  categoryId: number;
  googlePlaceId?: string;
  latitude: number;
  longitude: number;
  addressLine1: string;
  openTime: string;
  closeTime: string;
  city: string;
  stateProvince: string;
  phoneNumber: string;
  websiteUrl: string;
  email: string;
  bestTimeToVisit: string;
  busyTime: string;
  suitableFor: string;
  imageUrlsList: {
    imageUrl: string;
    altText: string;
  }[];
  tags: number[];
}) => {
  try {
    const response = await apiClient.post("/Place/create-new", placeData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to create place");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const UpdatePlace = async (placeData: {
  placeId: string;
  name: string;
  description: string;
  categoryId: number;
  googlePlaceId?: string;
  latitude: number;
  longitude: number;
  addressLine1: string;
  openTime: string;
  closeTime: string;
  city: string;
  stateProvince: string;
  phoneNumber: string;
  websiteUrl: string;
  email: string;
  bestTimeToVisit: string;
  busyTime: string;
  suitableFor: string;
  imageUrlsList: {
    imageUrl: string;
    altText: string;
  }[];
  tags: number[];
}) => {
  try {
    const response = await apiClient.put("/Place/update-place", placeData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to update place");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const GetAllTags = async () => {
  try {
    const response = await apiClient.get("/Place/get-all-tag");
    return response.data ?? [];
  } catch (error: any) {
    console.warn('GetAllTags error:', error.response?.status, error.message);
    return [];
  }
};

export const GetTagsOfPlace = async (placeId: string) => {
  try {
    const response = await apiClient.get(`/Place/get-tags-of?placeId=${placeId}`);
    return response.data ?? [];
  } catch (error: any) {
    console.warn('GetTagsOfPlace error:', error.response?.status, error.message);
    return [];
  }
};

export const AddPlaceImg = async (imageData: {
  placeId: string;
  imageUrlsList: {
    imageUrl: string;
    altText: string;
  }[];
}) => {
  try {
    const requestData = {
      placeId: imageData.placeId,
      imageUrlsList: imageData.imageUrlsList
    };
    
    const response = await apiClient.post("/Place/add-image", requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to add place image");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

/**
 * Upload images to Cloudinary and then add to place
 * @param placeId - ID of the place
 * @param files - Array of files to upload
 * @param altTexts - Array of alt texts for images
 * @returns Promise<CloudinaryUploadResult[]>
 */
export const UploadPlaceImages = async (
  placeId: string,
  files: File[],
  altTexts: string[] = []
): Promise<CloudinaryUploadResult[]> => {
  try {
    // Upload files to Cloudinary
    const uploadOptions = {
      folder: 'places'
    };

    const cloudinaryResults = await uploadMultipleToCloudinary(files, uploadOptions);

    // Prepare image data for API
    const imageUrlsList = cloudinaryResults.map((result, index) => ({
      imageUrl: result.secure_url,
      altText: altTexts[index] || files[index].name.split('.')[0]
    }));

    // Add images to place via API
    await AddPlaceImg({
      placeId,
      imageUrlsList
    });

    return cloudinaryResults;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to upload place images");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

/**
 * Upload arbitrary image files to Cloudinary and return an array suitable for imageUrlsList.
 * This is used when creating a new place with images in a single request.
 */
export const UploadFilesToCloudinary = async (
  files: File[],
  altTexts: string[] = []
): Promise<{ imageUrl: string; altText: string }[]> => {
  try {
    if (!files || files.length === 0) return [];

    const uploadOptions = { folder: 'places' };
    const cloudinaryResults = await uploadMultipleToCloudinary(files, uploadOptions);

    return cloudinaryResults.map((result, index) => ({
      imageUrl: result.secure_url,
      altText: altTexts[index] || files[index].name.split('.')[0]
    }));
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to upload files to Cloudinary");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const UserViewPlaceCreated = async (requestData: {
  page: number;
  pageSize: number;
  search?: string;
  roleId?: number;
  isActive?: boolean;
}) => {
  try {
    const response = await apiClient.post("/Place/get-all-created-place", requestData);
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    // Check if it's a 404 "No places found" - return empty data instead of throwing
    if (error.response?.status === 404 || 
        error.response?.data?.message?.includes('No places found') ||
        error.message?.includes('No places found')) {
      // Return empty data structure instead of throwing error
      return { 
        page: requestData.page,
        pageSize: requestData.pageSize,
        totalItems: 0,
        items: []
      };
    }
    // For other errors, return empty data
    console.warn('UserViewPlaceCreated error:', error.response?.status, error.message);
    return { 
      page: requestData.page,
      pageSize: requestData.pageSize,
      totalItems: 0,
      items: []
    };
  }
};

export const ViewDetailPlace  = async (requestData: {
  placeId: string;
}) => {
  try {
    // GET method với query parameter
    const response = await apiClient.get(`/Place/get-by-id?placeId=${requestData.placeId}`);
    if (!response || response.data === undefined || response.data === null) {
      return null;
    }
    return response.data;
  } catch (error: any) {
    console.warn('ViewDetailPlace error:', error.response?.status, error.message);
    return null;
  }
};

export const SearchPlace = async (requestData:{
  name: string;
  userLat: number;
  userLng: number;
  page: number;
  pageSize: number;
}) => {
  try {
    const response = await apiClient.post(`/Place/search`, requestData);
    return response.data ?? { page: requestData.page, pageSize: requestData.pageSize, totalItems: 0, items: [] };
  } catch (error: any) {
    console.warn('SearchPlace error:', error.response?.status, error.message);
    return { page: requestData.page, pageSize: requestData.pageSize, totalItems: 0, items: [] };
  }
};

export const SearchHistory = async (requestData:{
  searchQuery: string;
  latitude: number;
  longitude: number;
  clickedPlaceId: string | null;
}) => {
  try {
    const response = await apiClient.post(`/api/SearchHistory`, requestData);
    return response.data ?? null;
  } catch (error: any) {
    console.warn('SearchHistory error:', error.response?.status, error.message);
    return null;
  }
};

export const GetAllSearchHistory = async () => {
  try {
    const response = await apiClient.get(`/api/SearchHistory`);
    if (!response || response.data === undefined || response.data === null) {
      return [];
    }
    return response.data;
  } catch (error: any) {
    console.warn('GetAllSearchHistory error:', error.response?.status, error.message);
    return [];
  }
};

export const DeleteSearchHistory = async (searchId: string) => {
  try {
    const response = await apiClient.delete(`/api/SearchHistory/${searchId}`);
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const DeleteAllSearchHistory = async () => {
  try {
    const response = await apiClient.delete(`/api/SearchHistory/all`);
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const DeletePlaceImage = async (imageId: string) => {
  try {
    const response = await apiClient.delete(`/Place/remove-image?imageId=${imageId}`);
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to delete place image");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const CheckIfReviewPlace = async (placeId: string) => {
  try {
    const response = await apiClient.post(`/PlaceReviews/check-if-reviewed?placeId=${placeId}`);
    // API returns boolean directly (true if reviewed, false if not reviewed)
    return response.data;
  } catch (error) {
    // If error (e.g., 404), assume not reviewed
    console.warn(`Failed to check review status for place ${placeId}:`, error);
    return false;
  }
};

export const CreateReviewPlace = async (reviewData: {
  placeId: string;
  overallRating: number;
  foodQualityRating: number;
  serviceRating: number;
  atmosphereRating: number;
  priceLevelRating: number;
  reviewText: string;
  visitDate: string;
  visitType: string;
  reviewImagesList: string[];
}) => {
  try {
    const response = await apiClient.post(`/PlaceReviews/create`, reviewData);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to create review");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const ViewAllReviewByPlaceId = async (requestData: {
  placeId: string;
  page?: number;
  pageSize?: number;
}) => {
  const page = requestData.page || 1;
  const pageSize = requestData.pageSize || 10;
  try {
    const response = await apiClient.get(`/PlaceReviews/get-by-place-id?placeId=${requestData.placeId}&page=${page}&pageSize=${pageSize}`);
    if (!response || response.data === undefined || response.data === null) {
      return {
        page,
        pageSize,
        totalItems: 0,
        items: [],
      };
    }
    return response.data;
  } catch (error: any) {
    console.warn('ViewAllReviewByPlaceId error:', error.response?.status, error.message);
    return {
      page,
      pageSize,
      totalItems: 0,
      items: [],
    };
  }
};

export const UpdateReviewPlace = async (reviewData: {
  placeId: string;
  overallRating: number;
  foodQualityRating: number;
  serviceRating: number;
  atmosphereRating: number;
  priceLevelRating: number;
  reviewText: string;
  visitDate: string;
  visitType: string;
  reviewImagesList: string[];
  reviewId: string;
}) => {
  try {
    const response = await apiClient.put(`/PlaceReviews/update`, reviewData);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to update review");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const DeleteReviewPlace = async (reviewId: string) => {
  try {
    const response = await apiClient.delete(`/PlaceReviews/delete?reviewId=${reviewId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to delete review");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const ReportReviewPlace = async (reportData: {
  reviewId: string;
  reason: string;
}) => {
  try {
    const response = await apiClient.post(`/PlaceReviews/report`, reportData);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to report review");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const HomePageApi = async (
  page: number = 1,
  pageSize: number = 9999,
  categoryId?: number | string,
  branchId?: string
) => {
  try {
    const params: Record<string, any> = {
      Page: page,
      PageSize: pageSize
    };

    if (categoryId) {
      params.CategoryId = categoryId;
    }
    // Backend expects BrandId for branch filtering
    if (branchId) {
      params.BrandId = branchId;
    }

    const response = await apiClient.get(`/Place/get-places-for-home`, {
      params
    });
    return response.data ?? { items: [] };
  } catch (error: any) {
    console.warn('HomePageApi error:', error.response?.status, error.message);
    return { items: [] };
  }
};

 export const GetAllBranchesForHomePage = async () => {
  try {
    const response = await apiClient.get(`/Place/get-all-branch`);
    return response.data ?? [];
  } catch (error: any) {
    console.warn('GetAllBranchesForHomePage error:', error.response?.status, error.message);
    return [];
  }
};


//Friendship 
export const ViewAllPeople = async () => {
  try {
    const response = await apiClient.get(`/api/Friendships/people-you-may-know`);
    return response.data ?? [];
  } catch (error: any) {
    // Return empty array for any error to avoid toast errors
    console.warn('ViewAllPeople error:', error.response?.status, error.message);
    return [];
  }
};

export const ViewAllFriendRequest = async () => {
  try {
    const response = await apiClient.get(`/api/Friendships`);
    return response.data ?? [];
  } catch (error: any) {
    // Return empty array for any error to avoid toast errors
    console.warn('ViewAllFriendRequest error:', error.response?.status, error.message);
    return [];
  }
};

export const SendFriendRequest = async (targetUserId: string) => {
  try {
    const response = await apiClient.post(`/api/Friendships/add-friend?targetUserId=${targetUserId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to send friend request");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const AcceptFriendRequest = async (friendshipId: string) => {
  try {
    const response = await apiClient.post(`/api/Friendships/accept-request/${friendshipId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to accept friend request");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const RejectFriendRequest = async (friendshipId: string) => {
  try {
    const response = await apiClient.post(`/api/Friendships/decline-request/${friendshipId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to reject friend request");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const DeleteFriend = async (userId: string) => {
  try {
    const response = await apiClient.delete(`/api/Friendships/remove-friend/${userId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to delete friend");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const ViewFriends = async (page: number = 1, pageSize: number = 100) => {
  try {
    const response = await apiClient.get(`/api/Friendships/friends`, {
      params: { page, pageSize }
    });

    // Return raw backend payload so callers can handle pagination structure
    // Backend typically returns: { page, pageSize, totalItems, items: [...] }
    return response.data ?? {
      page,
      pageSize,
      totalItems: 0,
      items: [],
    };
  } catch (error: any) {
    // Return empty data for any error to avoid toast errors
    console.warn('ViewFriends error:', error.response?.status, error.message);
    return {
      page,
      pageSize,
      totalItems: 0,
      items: [],
    };
  }
};

export const LikePlace = async (placeId: string) => {
  try {
    const response = await apiClient.post(`/Place/like-place?placeId=${placeId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to like place");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const UnlikePlace = async (placeId: string) => {
  try {
    const response = await apiClient.post(`/Place/unlike-place?placeId=${placeId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to unlike place");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const ViewAllLikePlace = async () => {
  try {
    const response = await apiClient.get(`/Place/get-all-liked-place`);
    return response.data ?? [];
  } catch (error: any) {
    console.warn('ViewAllLikePlace error:', error.response?.status, error.message);
    return [];
  }
};

export const ViewPlacesOnMap = async (Data: {
  priceLevel: number | null;
  minAverageRating: number;
  openNow: boolean;
  categoryId: number | null;
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}) => {
  try {
    const endpoint = import.meta.env.VITE_PLACES_ON_MAP_ENDPOINT || `/Place/get-list`;
    const response = await apiClient.post(endpoint, Data);
    return response.data ?? [];
  } catch (error: any) {
    console.warn('ViewPlacesOnMap error:', error.response?.status, error.message);
    return [];
  }
};

export const ReportPlace = async (placeId: string, reason: string) => {
  try {
    const payload = {
      placeId,
      reason
    }
    const response = await apiClient.post(`/api/PlaceReports/report-place`, payload);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to report place");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const SavePlaces = async (placeId: string) => {
  try {
    const response = await apiClient.post(`/api/SavedPlace/add-to-saved-places?placeId=${placeId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to save place");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const UnsavePlaces = async (placeId: string) => {
  try {
    const response = await apiClient.delete(`/api/SavedPlace/remove-from-saved-places?placeId=${placeId}`);
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to unsave place");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const GetAllSavedPlaces = async () => {
  try {
    const response = await apiClient.get(`/api/SavedPlace/get-saved-places`);
    return response.data ?? [];
  } catch (error: any) {
    console.warn('GetAllSavedPlaces error:', error.response?.status, error.message);
    return [];
  }
};
