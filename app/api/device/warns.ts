import {
  apiClient,
  type ApiActionResult,
  type ApiResponse,
} from "@/app/api/http";

export type WarnLevel = "LOW" | "MEDIUM" | "HIGH";
export type WarnStatus = "WARNING" | "HANDLED" | "IGNORED";

export interface Warn {
  id: number;
  deviceId: number;
  level: WarnLevel;
  status: WarnStatus;
  lastUserId: number;
  argsSnapshot?: Record<string, string> | null;
  warnDescription: string;
}

export interface WarnPageExtra {
  page: number;
  size: number;
  total: number;
}

export interface WarnPageResult {
  list: Warn[];
  extra: WarnPageExtra;
}

export interface WarnQueryPayload {
  level?: WarnLevel;
  status?: WarnStatus;
}

export interface WarnPagePayload {
  page: number;
  size: number;
  query?: WarnQueryPayload;
}

export interface CreateWarnPayload {
  deviceId: number;
  level: WarnLevel;
  status: WarnStatus;
  lastUserId: number;
  argsSnapshot?: Record<string, string>;
  warnDescription: string;
}

export interface UpdateWarnPayload extends CreateWarnPayload {
  id: number;
}

interface WarnResponsePayload {
  id: number;
  device_id: number;
  level: WarnLevel;
  status: WarnStatus;
  last: number;
  args_snapshot?: Record<string, string> | null;
  warn_description: string;
}

interface WarnPageResponsePayload {
  list: WarnResponsePayload[];
  extra: WarnPageExtra;
}

interface DeleteWarnResponsePayload {
  deleted: number;
}

const ensureSuccess = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 || response.data === undefined || response.data === null) {
    throw new Error(response.msg || "设备预警接口调用失败，请稍后再试");
  }
  return response.data;
};

const ensureSuccessWithMsg = <T>(response: ApiResponse<T>): ApiActionResult<T> => {
  const data = ensureSuccess(response);
  return {
    data,
    msg: response.msg,
  };
};

const mapWarn = (payload: WarnResponsePayload): Warn => ({
  id: payload.id,
  deviceId: payload.device_id,
  level: payload.level,
  status: payload.status,
  lastUserId: payload.last,
  argsSnapshot: payload.args_snapshot ?? null,
  warnDescription: payload.warn_description,
});

export async function pageWarns(payload: WarnPagePayload): Promise<WarnPageResult> {
  const body = {
    page: payload.page,
    size: payload.size,
    ...(payload.query
      ? {
          query: {
            level: payload.query.level,
            status: payload.query.status,
          },
        }
      : {}),
  };

  const { data } = await apiClient.post<ApiResponse<WarnPageResponsePayload>>(
    "/warns/page",
    body,
  );
  const result = ensureSuccess(data);
  return {
    list: result.list.map(mapWarn),
    extra: result.extra,
  };
}

const toRequestBody = (payload: CreateWarnPayload) => ({
  device_id: payload.deviceId,
  level: payload.level,
  status: payload.status,
  last: payload.lastUserId,
  args_snapshot: payload.argsSnapshot,
  warn_description: payload.warnDescription,
});

export async function createWarn(payload: CreateWarnPayload): Promise<ApiActionResult<Warn>> {
  const body = toRequestBody(payload);
  const { data } = await apiClient.post<ApiResponse<WarnResponsePayload>>("/warns", body);
  const result = ensureSuccessWithMsg(data);
  return {
    data: mapWarn(result.data),
    msg: result.msg,
  };
}

export async function updateWarn(payload: UpdateWarnPayload): Promise<ApiActionResult<Warn>> {
  const body = {
    id: payload.id,
    ...toRequestBody(payload),
  };
  const { data } = await apiClient.put<ApiResponse<WarnResponsePayload>>("/warns", body);
  const result = ensureSuccessWithMsg(data);
  return {
    data: mapWarn(result.data),
    msg: result.msg,
  };
}

export async function deleteWarn(id: number): Promise<ApiActionResult<number>> {
  const { data } = await apiClient.delete<ApiResponse<DeleteWarnResponsePayload>>(
    `/warns/${id}`,
  );
  const result = ensureSuccessWithMsg(data);
  return {
    data: result.data.deleted,
    msg: result.msg,
  };
}

export async function getWarn(id: number): Promise<Warn> {
  const { data } = await apiClient.get<ApiResponse<WarnResponsePayload>>(`/warns/${id}`);
  return mapWarn(ensureSuccess(data));
}
