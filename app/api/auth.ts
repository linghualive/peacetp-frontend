import { apiClient, type ApiResponse } from "./http";

export interface LoginRequest {
  name: string;
  password: string;
}

export interface LoginResponse {
  token: string;
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
