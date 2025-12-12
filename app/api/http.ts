import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

import { emitAuthExpired } from "../lib/auth-events";
import { clearToken, getToken } from "../tool/token";
import { clearUserProfile } from "../tool/user-profile";

export interface ApiResponse<T> {
  code: number;
  data: T;
  msg: string;
}

export interface ApiActionResult<T> {
  data: T;
  msg: string;
}

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  timeout: 15000,
});

const isDev = process.env.NODE_ENV === "development";
// Keep resolved promises around slightly longer in dev to bridge React StrictMode's double-mount sequence.
const DEDUPLICATION_WINDOW_MS = isDev ? 1200 : 50;

type PendingRequest = Promise<AxiosResponse<unknown>>;
const pendingRequests = new Map<string, PendingRequest>();

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const serializeValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof URLSearchParams !== "undefined" && value instanceof URLSearchParams) {
    return value.toString();
  }
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    const entries: Record<string, string> = {};
    value.forEach((formValue, key) => {
      entries[key] = typeof formValue === "string" ? formValue : "[binary]";
    });
    return serializeValue(entries);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeValue(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${serializeValue(value[key])}`)
      .join(",")}}`;
  }
  return String(value);
};

const buildDedupeKey = (config: AxiosRequestConfig): string | null => {
  if (!config.url) {
    return null;
  }
  const method = (config.method ?? "get").toLowerCase();
  const baseURL = config.baseURL ?? "";
  const paramsKey = serializeValue(config.params);
  const dataKey =
    typeof config.data === "string" ? config.data : serializeValue(config.data);
  return [baseURL, method, config.url, paramsKey, dataKey].join("|");
};

let hasShownUnauthorizedDialog = false;

const handleUnauthorized = (message?: string) => {
  if (typeof window === "undefined" || hasShownUnauthorizedDialog) {
    return;
  }

  hasShownUnauthorizedDialog = true;
  clearToken();
  clearUserProfile();

  emitAuthExpired({
    message: message || "用户未登录或登录已过期，即将跳转到登录页。",
  });

  window.setTimeout(() => {
    window.location.replace("/");
  }, 0);
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
      handleUnauthorized(payload.msg);
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
      handleUnauthorized(error.response?.data?.msg);
      return Promise.reject(new Error("登录状态已失效，请重新登录"));
    }

    const apiMessage = error.response?.data?.msg;
    const message = apiMessage ?? error.message ?? "请求失败，请稍后再试";
    return Promise.reject(new Error(message));
  }
);

const rawRequest = apiClient.request.bind(apiClient);

apiClient.request = function dedupedRequest<T = unknown, R = AxiosResponse<T>, D = unknown>(
  config: AxiosRequestConfig<D>
): Promise<R> {
  const key = buildDedupeKey(config);
  if (!key) {
    return rawRequest<T, R, D>(config);
  }

  const existingRequest = pendingRequests.get(key) as Promise<R> | undefined;
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = rawRequest<T, R, D>(config).finally(() => {
    setTimeout(() => pendingRequests.delete(key), DEDUPLICATION_WINDOW_MS);
  });
  pendingRequests.set(key, requestPromise as PendingRequest);
  return requestPromise;
};

export { apiClient };
