import { apiClient, type ApiResponse } from "@/app/api/http";

export interface RoleUserCount {
  roleId: number;
  roleName: string;
  userCount: number;
}

export interface OverviewStats {
  totalUsers: number;
  totalRoles: number;
  totalDevices: number;
  totalDeviceTypes: number;
  totalUserDeviceBindings: number;
  totalWarns: number;
  activeWarns: number;
  usersByRole: RoleUserCount[];
}

export interface DeviceTypeDistributionItem {
  deviceTypeId: number;
  name: string;
  description?: string | null;
  argTemplate?: string | null;
  deviceCount: number;
}

export interface DeviceTypeBreakdownResponse {
  items: DeviceTypeDistributionItem[];
}

export interface WarnSummaryResponse {
  totalWarns: number;
  statusDistribution: Record<string, number>;
  levelDistribution: Record<string, number>;
}

const ensureSuccess = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 || response.data === undefined || response.data === null) {
    throw new Error(response.msg || "统计数据获取失败，请稍后重试");
  }
  return response.data;
};

export async function getOverviewStats(): Promise<OverviewStats> {
  const { data } = await apiClient.get<ApiResponse<OverviewStats>>("/statistics/overview");
  return ensureSuccess(data);
}

export async function getDeviceTypeBreakdown(): Promise<DeviceTypeBreakdownResponse> {
  const { data } = await apiClient.get<ApiResponse<DeviceTypeBreakdownResponse>>(
    "/statistics/devices/by-type",
  );
  return ensureSuccess(data);
}

export async function getWarnSummary(): Promise<WarnSummaryResponse> {
  const { data } = await apiClient.get<ApiResponse<WarnSummaryResponse>>(
    "/statistics/warns/summary",
  );
  return ensureSuccess(data);
}
