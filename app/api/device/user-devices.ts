import {
  apiClient,
  type ApiActionResult,
  type ApiResponse,
} from "@/app/api/http";

export interface UserSummary {
  id: number;
  name: string;
  phone?: string | null;
}

export interface DeviceTypeSummary {
  id: number;
  name: string;
}

export interface DeviceDetail {
  id: number;
  machineCode: string;
  name: string;
  deviceType: DeviceTypeSummary;
  args?: Record<string, string> | null;
  warnMethod?: Record<string, string> | null;
}

export interface BindingDeviceSummary {
  id: number;
  name: string;
  deviceType: DeviceTypeSummary;
}

export interface UserDeviceBinding {
  id: number;
  userId: number;
  deviceId: number;
}

export interface BindingPageItem {
  id: number;
  user: UserSummary;
  device: BindingDeviceSummary;
}

export interface BindingPageExtra {
  page: number;
  size: number;
  total: number;
}

export interface BindingPageResult {
  list: BindingPageItem[];
  extra: BindingPageExtra;
}

export interface BindingPageQuery {
  userId?: number;
  deviceId?: number;
}

export interface BindingPagePayload {
  page: number;
  size: number;
  query?: BindingPageQuery;
}

export interface BindUserDevicePayload {
  userId: number;
  deviceId: number;
}

interface UserSummaryPayload {
  id: number;
  name: string;
  phone?: string | null;
}

interface DeviceTypeSummaryPayload {
  id: number;
  name: string;
}

interface DeviceDetailPayload {
  id: number;
  machine_code: string;
  name: string;
  device_type: DeviceTypeSummaryPayload;
  args?: Record<string, string> | null;
  warn_method?: Record<string, string> | null;
}

interface BindingDevicePayload {
  id: number;
  name: string;
  device_type: DeviceTypeSummaryPayload;
}

interface BindingPageItemPayload {
  id: number;
  user: UserSummaryPayload;
  device: BindingDevicePayload;
}

interface BindingPageResponsePayload {
  list: BindingPageItemPayload[];
  extra: BindingPageExtra;
}

interface BindingResponsePayload {
  id: number;
  user_id: number;
  device_id: number;
}

interface DeleteResponsePayload {
  deleted: number;
}

const ensureSuccess = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 || response.data === undefined || response.data === null) {
    throw new Error(response.msg || "用户设备绑定接口调用失败，请稍后再试");
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

const mapUserSummary = (payload: UserSummaryPayload): UserSummary => ({
  id: payload.id,
  name: payload.name,
  phone: payload.phone ?? null,
});

const mapDeviceTypeSummary = (payload: DeviceTypeSummaryPayload): DeviceTypeSummary => ({
  id: payload.id,
  name: payload.name,
});

const mapBindingDevice = (payload: BindingDevicePayload): BindingDeviceSummary => ({
  id: payload.id,
  name: payload.name,
  deviceType: mapDeviceTypeSummary(payload.device_type),
});

const mapDeviceDetail = (payload: DeviceDetailPayload): DeviceDetail => ({
  id: payload.id,
  machineCode: payload.machine_code,
  name: payload.name,
  deviceType: mapDeviceTypeSummary(payload.device_type),
  args: payload.args ?? null,
  warnMethod: payload.warn_method ?? null,
});

const mapBindingResponse = (payload: BindingResponsePayload): UserDeviceBinding => ({
  id: payload.id,
  userId: payload.user_id,
  deviceId: payload.device_id,
});

export async function pageUserDeviceBindings(
  payload: BindingPagePayload,
): Promise<BindingPageResult> {
  const body = {
    page: payload.page,
    size: payload.size,
    ...(payload.query
      ? {
          query: {
            user_id: payload.query.userId,
            device_id: payload.query.deviceId,
          },
        }
      : {}),
  };

  const { data } = await apiClient.post<ApiResponse<BindingPageResponsePayload>>(
    "/user-devices/page",
    body,
  );
  const result = ensureSuccess(data);
  return {
    list: result.list.map((item) => ({
      id: item.id,
      user: mapUserSummary(item.user),
      device: mapBindingDevice(item.device),
    })),
    extra: result.extra,
  };
}

export async function listDevicesByUser(userId: number): Promise<DeviceDetail[]> {
  const { data } = await apiClient.get<ApiResponse<DeviceDetailPayload[]>>(
    "/user-devices/devices",
    {
      params: { user_id: userId },
    },
  );
  const result = ensureSuccess(data);
  return result.map(mapDeviceDetail);
}

export async function listUsersByDevice(deviceId: number): Promise<UserSummary[]> {
  const { data } = await apiClient.get<ApiResponse<UserSummaryPayload[]>>("/user-devices/users", {
    params: { device_id: deviceId },
  });
  const result = ensureSuccess(data);
  return result.map(mapUserSummary);
}

export async function bindUserDevice(
  payload: BindUserDevicePayload,
): Promise<ApiActionResult<UserDeviceBinding>> {
  const body = {
    user_id: payload.userId,
    device_id: payload.deviceId,
  };
  const { data } = await apiClient.post<ApiResponse<BindingResponsePayload>>(
    "/user-devices",
    body,
  );
  const result = ensureSuccessWithMsg(data);
  return {
    data: mapBindingResponse(result.data),
    msg: result.msg,
  };
}

export async function unbindUserDevice(bindingId: number): Promise<ApiActionResult<number>> {
  const { data } = await apiClient.delete<ApiResponse<DeleteResponsePayload>>("/user-devices", {
    params: { id: bindingId },
  });
  const result = ensureSuccessWithMsg(data);
  return {
    data: result.data.deleted,
    msg: result.msg,
  };
}
