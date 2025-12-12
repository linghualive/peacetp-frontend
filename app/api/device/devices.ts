import { apiClient, type ApiResponse } from "@/app/api/http";

export interface DeviceTypeInfo {
  id: number;
  name: string;
  description?: string | null;
  argTemplate?: string | null;
}

export interface Device {
  id: number;
  machineCode: string;
  name: string;
  deviceType: DeviceTypeInfo;
  args?: Record<string, string> | null;
  warnMethod?: Record<string, string> | null;
}

export interface DevicePageExtra {
  page: number;
  size: number;
  total: number;
}

export interface DevicePageResult {
  list: Device[];
  extra: DevicePageExtra;
}

export interface DeviceQuery {
  name?: string;
  deviceTypeId?: number;
  machineCode?: string;
}

export interface DevicePagePayload {
  page: number;
  size: number;
  query?: DeviceQuery;
}

export interface CreateDevicePayload {
  machineCode: string;
  name: string;
  deviceTypeId: number;
  args?: Record<string, string>;
  warnMethod?: Record<string, string>;
}

export interface UpdateDevicePayload extends CreateDevicePayload {
  id: number;
}

interface DeviceResponsePayload {
  id: number;
  machine_code: string;
  name: string;
  device_type: {
    id: number;
    name: string;
    description?: string | null;
    arg_template?: string | null;
  };
  args?: Record<string, string> | null;
  warn_method?: Record<string, string> | null;
}

interface DevicePageResponsePayload {
  list: DeviceResponsePayload[];
  extra: DevicePageExtra;
}

interface DeleteDeviceResponsePayload {
  deleted: number;
}

const ensureSuccess = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 || response.data === undefined || response.data === null) {
    throw new Error(response.msg || "设备接口调用失败，请稍后再试");
  }
  return response.data;
};

const mapDevice = (payload: DeviceResponsePayload): Device => ({
  id: payload.id,
  machineCode: payload.machine_code,
  name: payload.name,
  deviceType: {
    id: payload.device_type.id,
    name: payload.device_type.name,
    description: payload.device_type.description ?? null,
    argTemplate: payload.device_type.arg_template ?? null,
  },
  args: payload.args ?? null,
  warnMethod: payload.warn_method ?? null,
});

const toDeviceRequestBody = (payload: CreateDevicePayload) => ({
  machine_code: payload.machineCode,
  name: payload.name,
  device_type_id: payload.deviceTypeId,
  args: payload.args,
  warn_method: payload.warnMethod,
});

export async function pageDevices(payload: DevicePagePayload): Promise<DevicePageResult> {
  const body = {
    page: payload.page,
    size: payload.size,
    ...(payload.query
      ? {
          query: {
            name: payload.query.name,
            device_type_id: payload.query.deviceTypeId,
            machine_code: payload.query.machineCode,
          },
        }
      : {}),
  };

  const { data } = await apiClient.post<ApiResponse<DevicePageResponsePayload>>(
    "/devices/page",
    body,
  );
  const result = ensureSuccess(data);
  return {
    list: result.list.map(mapDevice),
    extra: result.extra,
  };
}

export async function createDevice(payload: CreateDevicePayload): Promise<Device> {
  const requestBody = toDeviceRequestBody(payload);
  const { data } = await apiClient.post<ApiResponse<DeviceResponsePayload>>(
    "/devices",
    requestBody,
  );
  return mapDevice(ensureSuccess(data));
}

export async function updateDevice(payload: UpdateDevicePayload): Promise<Device> {
  const requestBody = {
    id: payload.id,
    ...toDeviceRequestBody(payload),
  };
  const { data } = await apiClient.put<ApiResponse<DeviceResponsePayload>>("/devices", requestBody);
  return mapDevice(ensureSuccess(data));
}

export async function deleteDevice(id: number): Promise<number> {
  const { data } = await apiClient.delete<ApiResponse<DeleteDeviceResponsePayload>>(
    `/devices/${id}`,
  );
  const result = ensureSuccess(data);
  return result.deleted;
}

export async function getDevice(id: number): Promise<Device> {
  const { data } = await apiClient.get<ApiResponse<DeviceResponsePayload>>(`/devices/${id}`);
  return mapDevice(ensureSuccess(data));
}
