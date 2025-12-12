import { apiClient, type ApiResponse } from "./http";

export interface LoginRequest {
  name: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface UserRole {
  id: number;
  name: string;
  description?: string;
}

export interface CurrentUserResponse {
  id: number;
  name: string;
  password?: string;
  phone: string;
  role?: UserRole;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
    "/auth/login",
    payload,
  );

  if (data.code !== 0 || !data.data) {
    throw new Error(data.msg || "登录失败，请稍后重试");
  }

  return data.data;
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const { data } = await apiClient.get<ApiResponse<CurrentUserResponse>>(
    "/auth/me",
  );

  if (data.code !== 0 || !data.data) {
    throw new Error(data.msg || "用户信息获取失败，请稍后重试");
  }

  return data.data;
}
