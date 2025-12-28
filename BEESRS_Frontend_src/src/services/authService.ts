import apiClient, { formatErrorMessage } from "../utils/axios";

export const login = async (email: string, password: string) => {
  try {
    const response = await apiClient.post("/api/Auth/login", { email, password });
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to login");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const refreshToken = async (refreshTokenValue: string) => {
  try {
    const response = await apiClient.post(
      "/api/Auth/refresh-token",
      JSON.stringify(refreshTokenValue),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to refresh token");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const register = async (userData: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  jobTitle?: string; // Optional - backend will use Employee's jobTitle
  phoneNumber: string;
}) => {
  try {
    const response = await apiClient.post("/api/Auth/register", userData);
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Registration failed. Please try again.");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const verifyEmail = async (email: string, otp: string) => {
  try {
    const response = await apiClient.post("/api/Auth/verify-email", { email, otpCode: otp });
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    const errorMessage = formatErrorMessage(error, "Failed to verify email");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};

export const resendOtp = async (email: string, purpose: string) => {
  try {
    console.log("Calling resend OTP API with:", {
      url: "/api/Auth/resend-otp",
      data: { email, purpose }
    });
    
    const response = await apiClient.post("/api/Auth/resend-otp", {
      email,
      purpose
    });
    
    console.log("API Response:", response);
    
    if (!response || !response.data) {
      throw new Error("Invalid response from the server");
    }
    return response.data;
  } catch (error: any) {
    console.error("Resend OTP API error:", error);
    console.error("Error response:", error.response?.data);
    const errorMessage = formatErrorMessage(error, "Failed to resend OTP");
    const customError = new Error(errorMessage);
    (customError as any).response = error.response;
    throw customError;
  }
};