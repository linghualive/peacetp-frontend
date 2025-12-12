import axios, { type AxiosError } from "axios";

import { clearToken, getToken } from "../tool/token";
import { clearUserProfile } from "../tool/user-profile";

export interface ApiResponse<T> {
  code: number;
  data: T;
  msg: string;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  timeout: 15000,
});

let hasShownUnauthorizedDialog = false;

const handleUnauthorized = () => {
  if (typeof window === "undefined" || hasShownUnauthorizedDialog) {
    return;
  }

  hasShownUnauthorizedDialog = true;
  clearToken();
  clearUserProfile();

  window.alert("用户未登录或登录已过期，即将跳转到登录页");
  window.location.href = "/";
};

apiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authentication = token;
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse<unknown> | undefined;
    if (payload?.code === 401) {
      handleUnauthorized();
      return Promise.reject(
        new Error(payload.msg || "登录状态已失效，请重新登录")
      );
    }
    return response;
  },
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status;
    const responseCode = error.response?.data?.code;

    if (status === 401 || responseCode === 401) {
      handleUnauthorized();
      return Promise.reject(new Error("登录状态已失效，请重新登录"));
    }

    const apiMessage = error.response?.data?.msg;
    const message = apiMessage ?? error.message ?? "请求失败，请稍后再试";
    return Promise.reject(new Error(message));
  }
);

export { apiClient };
