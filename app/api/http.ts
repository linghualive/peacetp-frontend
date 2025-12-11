import axios, { type AxiosError } from "axios";

import { getToken } from "../tool/token";

export interface ApiResponse<T> {
  code: number;
  data: T;
  msg: string;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  timeout: 15000,
});

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
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const apiMessage = error.response?.data?.msg;
    const message = apiMessage ?? error.message ?? "请求失败，请稍后再试";
    return Promise.reject(new Error(message));
  },
);

export { apiClient };
