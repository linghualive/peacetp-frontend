import {
  apiClient,
  type ApiActionResult,
  type ApiResponse,
} from "@/app/api/http";

export interface Role {
  id: number;
  name: string;
  description?: string | null;
}

export interface RolePageExtra {
  page: number;
  size: number;
  total: number;
}

export interface RolePageResult {
  list: Role[];
  extra: RolePageExtra;
}

export interface RolePagePayload {
  page: number;
  size: number;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
}

export interface UpdateRolePayload extends CreateRolePayload {
  id: number;
}

const ensureSuccess = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 || response.data === undefined || response.data === null) {
    throw new Error(response.msg || "角色接口调用失败，请稍后再试");
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

export async function pageRoles(payload: RolePagePayload): Promise<RolePageResult> {
  const { data } = await apiClient.post<ApiResponse<RolePageResult>>("/roles/page", payload);
  return ensureSuccess(data);
}

export async function createRole(payload: CreateRolePayload): Promise<ApiActionResult<Role>> {
  const { data } = await apiClient.post<ApiResponse<Role>>("/roles", payload);
  return ensureSuccessWithMsg(data);
}

export async function updateRole(payload: UpdateRolePayload): Promise<ApiActionResult<Role>> {
  const { data } = await apiClient.put<ApiResponse<Role>>("/roles", payload);
  return ensureSuccessWithMsg(data);
}

export async function deleteRole(id: number): Promise<ApiActionResult<number>> {
  const { data } = await apiClient.delete<ApiResponse<{ deleted: number }>>(`/roles/${id}`);
  const result = ensureSuccessWithMsg(data);
  return {
    data: result.data.deleted,
    msg: result.msg,
  };
}

export async function getRole(id: number): Promise<Role> {
  const { data } = await apiClient.get<ApiResponse<Role>>(`/roles/${id}`);
  return ensureSuccess(data);
}
