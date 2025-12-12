import {
  apiClient,
  type ApiActionResult,
  type ApiResponse,
} from "@/app/api/http";

export interface DeviceType {
  id: number;
  name: string;
  description?: string | null;
  argTemplate?: string | null;
}

export interface DeviceTypePageExtra {
  page: number;
  size: number;
  total: number;
}

export interface DeviceTypePageResult {
  list: DeviceType[];
  extra: DeviceTypePageExtra;
}

export interface DeviceTypePagePayload {
  page: number;
  size: number;
}

export interface CreateDeviceTypePayload {
  name: string;
  description?: string;
  argTemplate?: string;
}

export interface UpdateDeviceTypePayload extends CreateDeviceTypePayload {
  id: number;
}

interface DeviceTypeResponsePayload {
  id: number;
  name: string;
  description?: string | null;
  arg_template?: string | null;
}

interface DeviceTypePageResponsePayload {
  list: DeviceTypeResponsePayload[];
  extra: DeviceTypePageExtra;
}

interface DeleteDeviceTypeResponsePayload {
  deleted: number;
}

const ensureSuccess = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 || response.data === undefined || response.data === null) {
    throw new Error(response.msg || "设备类型接口调用失败，请稍后再试");
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

const mapDeviceType = (payload: DeviceTypeResponsePayload): DeviceType => ({
  id: payload.id,
  name: payload.name,
  description: payload.description ?? null,
  argTemplate: payload.arg_template ?? null,
});

const toRequestPayload = (payload: CreateDeviceTypePayload) => ({
  name: payload.name,
  description: payload.description,
  arg_template: payload.argTemplate,
});

export async function pageDeviceTypes(payload: DeviceTypePagePayload): Promise<DeviceTypePageResult> {
  const { data } = await apiClient.post<ApiResponse<DeviceTypePageResponsePayload>>(
    "/device-types/page",
    payload,
  );
  const result = ensureSuccess(data);
  return {
    list: result.list.map(mapDeviceType),
    extra: result.extra,
  };
}

export async function createDeviceType(
  payload: CreateDeviceTypePayload,
): Promise<ApiActionResult<DeviceType>> {
  const requestPayload = toRequestPayload(payload);
  const { data } = await apiClient.post<ApiResponse<DeviceTypeResponsePayload>>(
    "/device-types",
    requestPayload,
  );
  const result = ensureSuccessWithMsg(data);
  return {
    data: mapDeviceType(result.data),
    msg: result.msg,
  };
}

export async function updateDeviceType(
  payload: UpdateDeviceTypePayload,
): Promise<ApiActionResult<DeviceType>> {
  const requestPayload = {
    id: payload.id,
    ...toRequestPayload(payload),
  };
  const { data } = await apiClient.put<ApiResponse<DeviceTypeResponsePayload>>(
    "/device-types",
    requestPayload,
  );
  const result = ensureSuccessWithMsg(data);
  return {
    data: mapDeviceType(result.data),
    msg: result.msg,
  };
}

export async function deleteDeviceType(id: number): Promise<ApiActionResult<number>> {
  const { data } = await apiClient.delete<ApiResponse<DeleteDeviceTypeResponsePayload>>(
    `/device-types/${id}`,
  );
  const result = ensureSuccessWithMsg(data);
  return {
    data: result.data.deleted,
    msg: result.msg,
  };
}

export async function getDeviceType(id: number): Promise<DeviceType> {
  const { data } = await apiClient.get<ApiResponse<DeviceTypeResponsePayload>>(`/device-types/${id}`);
  return mapDeviceType(ensureSuccess(data));
}
