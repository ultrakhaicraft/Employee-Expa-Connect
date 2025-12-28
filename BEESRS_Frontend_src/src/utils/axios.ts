import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { store } from "../redux/store";
import type { RootState } from "../redux/store";
import { loginSuccess, logout } from "../redux/authSlice";
import { decodeJWT } from "./jwt";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 100000,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 100000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<void> | null = null;

const isTokenExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return true;
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return true;
  return Date.now() >= expiresTime;
};

const ensureFreshToken = async () => {
  const state = store.getState() as RootState;
  const currentAuth = state.auth;
  
  // Get refreshToken from localStorage (primary source) or Redux state (fallback)
  const refreshToken = localStorage.getItem('refreshToken') || currentAuth?.refreshToken;
  const expiresAt = currentAuth?.expiresAt || localStorage.getItem('expiresAt');
  
  if (!refreshToken || !expiresAt) {
    return;
  }

  if (!isTokenExpired(expiresAt) && refreshPromise === null) {
    return;
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/api/Auth/refresh-token", JSON.stringify(refreshToken))
      .then((response) => {
        // API response structure: { success, message, statusCode, data: { accessToken, refreshToken, expiresAt, roleName, timezone } }
        const apiResponse = response?.data;
        
        if (!apiResponse || !apiResponse.success || !apiResponse.data) {
          throw new Error(apiResponse?.message || "Invalid refresh-token response");
        }

        const data = apiResponse.data;
        const nextAccessToken = data.accessToken;
        const nextRefreshToken = data.refreshToken ?? refreshToken;
        const nextExpiresAt = data.expiresAt ?? expiresAt;
        const nextRoleName =
          data.roleName ??
          currentAuth?.roleName ??
          localStorage.getItem('roleName') ??
          currentAuth?.decodedToken?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
          "User";

        const decodedToken = nextAccessToken ? decodeJWT(nextAccessToken) : null;
        if (!nextAccessToken || !decodedToken) {
          throw new Error("Invalid refresh-token response: missing accessToken or failed to decode");
        }

        // Save refreshToken to localStorage
        localStorage.setItem('refreshToken', nextRefreshToken);
        localStorage.setItem('expiresAt', nextExpiresAt);
        if (nextRoleName) {
          localStorage.setItem('roleName', nextRoleName);
        }
        // Save timezone if available
        const nextTimezone = data.timezone;
        if (nextTimezone) {
          localStorage.setItem('timezone', nextTimezone);
        }

        store.dispatch(
          loginSuccess({
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
            expiresAt: nextExpiresAt,
            roleName: nextRoleName,
            decodedToken,
          })
        );
      })
      .catch((error) => {
        console.error("Refresh token error:", error);
        // Clear localStorage on refresh failure
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('expiresAt');
        localStorage.removeItem('timezone');
        store.dispatch(logout());
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    await ensureFreshToken();
    const appState = store.getState() as RootState;
    const accessToken = appState?.auth?.accessToken;
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response error interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - try to refresh token and retry request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check for refreshToken in localStorage (primary) or Redux state (fallback)
      const refreshToken = localStorage.getItem('refreshToken');
      const state = store.getState() as RootState;
      const refreshTokenFromState = state.auth?.refreshToken;

      // Only retry if we have a refresh token
      if (refreshToken || refreshTokenFromState) {
        try {
          // Refresh the token
          await ensureFreshToken();

          // Get the new token
          const newState = store.getState() as RootState;
          const newAccessToken = newState.auth?.accessToken;

          if (newAccessToken) {
            // Update the authorization header and retry the request
            originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, clear localStorage and logout user
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('expiresAt');
          localStorage.removeItem('timezone');
          store.dispatch(logout());
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout user
        store.dispatch(logout());
      }
    }

    try {
      // Handle SSL certificate errors for localhost development
      if (error.code === 'ERR_CERT_AUTHORITY_INVALID' || 
          error.code === 'ERR_SSL_PROTOCOL_ERROR' ||
          error.message?.includes('certificate') ||
          error.message?.includes('SSL')) {
        const event = new CustomEvent("app:toast", {
          detail: { 
            title: "SSL Certificate Error", 
            description: "Please accept the SSL certificate in your browser for localhost:7118", 
            variant: "destructive" 
          },
        })
        window.dispatchEvent(event)
        return Promise.reject(new Error("SSL Certificate Error: Please accept the certificate in your browser"))
      }
      
      // Only show error toasts for non-GET requests (POST, PUT, DELETE, PATCH)
      // But exclude certain POST requests that are read-only operations
      const method = error.config?.method?.toUpperCase()
      const url = error.config?.url || ''
      
      // List of read-only POST endpoints that should not show error toasts
      const readOnlyPostEndpoints = [
        '/Place/get-all-created-place',
        '/PlaceReviews/check-if-reviewed',
        '/PlaceReviews/get-by-place-id',
        '/Place/search',
        '/api/SearchHistory'
      ]
      
      const isReadOnlyPost = readOnlyPostEndpoints.some(endpoint => url.includes(endpoint))
      
      if (method && method !== 'GET' && !isReadOnlyPost) {
        // Import formatErrorMessage function (defined below)
        const formatErrorMsg = (err: any, defaultMsg: string = "Something went wrong"): string => {
          if (err?.response?.data?.message) return err.response.data.message;
          if (err?.response?.data?.errors) {
            const apiErrors = err.response.data.errors;
            // If errors is a string, surface it directly (e.g. moderation/safety messages)
            if (typeof apiErrors === 'string') {
              return apiErrors;
            }
            if (typeof apiErrors === 'object') {
            const errorMessages: string[] = [];
              Object.keys(apiErrors).forEach((field) => {
                const fieldErrors = apiErrors[field];
              if (Array.isArray(fieldErrors)) {
                fieldErrors.forEach((msg: string) => errorMessages.push(`${field}: ${msg}`));
              } else if (typeof fieldErrors === 'string') {
                errorMessages.push(`${field}: ${fieldErrors}`);
              }
            });
            if (errorMessages.length > 0) return errorMessages.join('\n');
            }
          }
          if (err?.response?.data?.title) return err.response.data.title;
          return err?.message || defaultMsg;
        };
        const message = formatErrorMsg(error, "Something went wrong");
        // Fire-and-forget toast if provider exists in tree; this hook won't work here directly.
        // Instead, dispatch a DOM event listened by a small bridge in app entry.
        const event = new CustomEvent("app:toast", {
          detail: { title: "Error", description: message, variant: "destructive" },
        })
        window.dispatchEvent(event)
      }
    } catch {}
    return Promise.reject(error)
  }
)

/**
 * Format error message from API response
 * Handles both simple message and validation errors object
 * @param error - The error object from axios
 * @param defaultMessage - Default message if no error found
 * @returns Formatted error message string
 */
export const formatErrorMessage = (error: any, defaultMessage: string = "An error occurred"): string => {
  // First check for simple message
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // Check for validation errors object
  if (error?.response?.data?.errors) {
    const apiErrors = error.response.data.errors;

    // If errors is a string, surface it directly (e.g. safety/moderation messages)
    if (typeof apiErrors === 'string') {
      return apiErrors;
    }

    if (typeof apiErrors === 'object') {
    const errorMessages: string[] = [];

    // Format errors object into readable messages
      Object.keys(apiErrors).forEach((field) => {
        const fieldErrors = apiErrors[field];
      if (Array.isArray(fieldErrors)) {
        fieldErrors.forEach((msg: string) => {
          errorMessages.push(`${field}: ${msg}`);
        });
      } else if (typeof fieldErrors === 'string') {
        errorMessages.push(`${field}: ${fieldErrors}`);
      }
    });

    if (errorMessages.length > 0) {
      return errorMessages.join('\n');
      }
    }
  }

  // Check for title (from RFC 9110 format)
  if (error?.response?.data?.title) {
    return error.response.data.title;
  }

  // Fallback to error message or default
  return error?.message || defaultMessage;
};

export default apiClient;
