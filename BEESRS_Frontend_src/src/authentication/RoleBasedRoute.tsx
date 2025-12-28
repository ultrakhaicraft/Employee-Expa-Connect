import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

interface DecodedToken {
  RoleId?: number | string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
  [key: string]: unknown; // Cho phép token có thêm các trường khác
}

interface RoleBasedRouteProps {
  element: React.ReactNode;           // Component cần render
  requiredRole: Array<number | string>;         // Danh sách role cho phép
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ element, requiredRole }) => {
  // Ưu tiên lấy từ Redux (app đang lưu accessToken ở Redux)
  const accessTokenFromRedux = useSelector((state: RootState) => state.auth.accessToken);
  const decodedFromRedux = useSelector((state: RootState) => state.auth.decodedToken as DecodedToken | null);
  const token = accessTokenFromRedux ?? localStorage.getItem("access_token") ?? localStorage.getItem("accessToken");

  if (!token) {
    localStorage.removeItem("access_token");
    return <Navigate to="/login" replace />;
  }

  let roleValue: string | undefined;
  let roleNameFromStorage: string | null = null;
  try {
    const decodedToken = decodedFromRedux ?? jwtDecode<DecodedToken>(token);
    // Try modern ASP.NET claim first
    const claimRole = decodedToken["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    if (claimRole) {
      roleValue = String(claimRole);
    } else if (decodedToken.RoleId !== undefined) {
      roleValue = String(decodedToken.RoleId);
    } else {
      // Fallback to roleName in localStorage if provided (might be like "user", "admin")
      const roleName = localStorage.getItem("roleName");
      roleValue = roleName ? String(roleName) : undefined;
    }
    roleNameFromStorage = localStorage.getItem("roleName");
  } catch (error) {
    // Token invalid - clear and force login
    localStorage.removeItem("access_token");
    return <Navigate to="/login" replace />;
  }

  // Normalize: compare against multiple possible sources and case-insensitive
  const allowedNormalized = requiredRole.map(r => String(r).toLowerCase());
  const candidates = [
    roleValue,
    roleNameFromStorage ?? undefined,
  ]
    .filter(Boolean)
    .map(v => String(v).toLowerCase());

  const isAllowed = candidates.some(c => allowedNormalized.includes(c));

  if (!isAllowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return element;
};

export default RoleBasedRoute;
