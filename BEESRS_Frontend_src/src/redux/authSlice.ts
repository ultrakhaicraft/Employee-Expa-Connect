import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface DecodedToken {
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": string;
  employee_id: string;
  department: string;
  email_verified: string;
  jti: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  roleName: string | null;
  isAuthenticated: boolean;
  decodedToken: DecodedToken | null;
  userProfile: {
    firstName: string;
    lastName: string;
    fullName: string;
    profilePictureUrl: string | null;
  } | null;
}

interface LoginPayload {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  roleName: string;
  decodedToken: DecodedToken;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  roleName: null,
  isAuthenticated: false,
  decodedToken: null,
  userProfile: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<LoginPayload>) {
      const payload = action.payload;
      state.accessToken = payload.accessToken;
      state.refreshToken = payload.refreshToken;
      state.expiresAt = payload.expiresAt;
      state.roleName = payload.roleName;
      state.decodedToken = payload.decodedToken;
      state.isAuthenticated = true;
    },
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.roleName = null;
      state.decodedToken = null;
      state.isAuthenticated = false;
      state.userProfile = null;
      
      // Clear refreshToken from localStorage
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      localStorage.removeItem('timezone');
    },
    updateUserProfile(state, action: PayloadAction<{
      firstName: string;
      lastName: string;
      fullName: string;
      profilePictureUrl: string | null;
    }>) {
      state.userProfile = action.payload;
    },
  },
});

export const { loginSuccess, logout, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
