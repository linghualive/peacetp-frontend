import {
  apiClient,
  type ApiActionResult,
  type ApiResponse,
} from "@/app/api/http";

export interface RoleSummary {
  id: number;
  name: string;
  description?: string | null;
}

export interface UserListItem {
  id: number;
  name: string;
  phone?: string | null;
  role: RoleSummary;
}

export interface UserDetail extends UserListItem {
  password: string;
  wechatId?: string | null;
}

export interface UserPageExtra {
  page: number;
  size: number;
  total: number;
}

export interface UserPageResult {
  list: UserListItem[];
  extra: UserPageExtra;
}

export interface UserQueryPayload {
  name?: string;
  phone?: string;
  roleId?: number;
}

export interface UserPagePayload {
  page: number;
  size: number;
  query?: UserQueryPayload;
}

export interface CreateUserPayload {
  name: string;
  password: string;
  phone?: string;
  wechatId?: string;
  roleId: number;
}

export interface UpdateUserPayload extends CreateUserPayload {
  id: number;
}

const ensureSuccess = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 || response.data === undefined || response.data === null) {
    throw new Error(response.msg || "用户接口调用失败，请稍后再试");
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

export async function pageUsers(payload: UserPagePayload): Promise<UserPageResult> {
  const { data } = await apiClient.post<ApiResponse<UserPageResult>>("/users/page", payload);
  return ensureSuccess(data);
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<ApiActionResult<UserDetail>> {
  const { data } = await apiClient.post<ApiResponse<UserDetail>>("/users", payload);
  return ensureSuccessWithMsg(data);
}

export async function updateUser(
  payload: UpdateUserPayload,
): Promise<ApiActionResult<UserDetail>> {
  const { data } = await apiClient.put<ApiResponse<UserDetail>>("/users", payload);
  return ensureSuccessWithMsg(data);
}

export async function deleteUser(id: number): Promise<ApiActionResult<number>> {
  const { data } = await apiClient.delete<ApiResponse<{ deleted: number }>>(`/users/${id}`);
  const result = ensureSuccessWithMsg(data);
  return {
    data: result.data.deleted,
    msg: result.msg,
  };
}

export async function getUser(id: number): Promise<UserDetail> {
  const { data } = await apiClient.get<ApiResponse<UserDetail>>(`/users/${id}`);
  return ensureSuccess(data);
}
