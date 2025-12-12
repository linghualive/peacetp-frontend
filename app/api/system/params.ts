import {
  apiClient,
  type ApiActionResult,
  type ApiResponse,
} from "@/app/api/http";

export interface ParamValue {
  id: number;
  value: string;
  description?: string | null;
}

export interface ParamGroup {
  key: string;
  values: ParamValue[];
}

export interface ParamPageExtra {
  page: number;
  size: number;
  total: number;
}

export interface ParamSearchResult {
  list: ParamGroup[];
  extra: ParamPageExtra;
}

export interface ParamSearchPayload {
  page: number;
  size: number;
  key?: string;
}

export interface ParamValueCreateInput {
  value: string;
  description?: string;
}

export interface ParamValueUpdateInput {
  id: number;
  value: string;
  description?: string;
}

export interface ParamGroupCreatePayload {
  key: string;
  values: ParamValueCreateInput[];
}

export interface ParamGroupUpdatePayload {
  key: string;
  values: ParamValueUpdateInput[];
}

const ensureSuccess = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 || response.data === undefined || response.data === null) {
    throw new Error(response.msg || "参数接口调用失败，请稍后再试");
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

export async function searchParams(payload: ParamSearchPayload): Promise<ParamSearchResult> {
  const body = {
    page: payload.page,
    size: payload.size,
    ...(payload.key ? { query: { key: payload.key } } : {}),
  };

  const { data } = await apiClient.post<ApiResponse<ParamSearchResult>>("/params/search", body);
  return ensureSuccess(data);
}

export async function createParamGroup(
  payload: ParamGroupCreatePayload,
): Promise<ApiActionResult<ParamGroup>> {
  const { data } = await apiClient.post<ApiResponse<ParamGroup>>("/params/", payload);
  return ensureSuccessWithMsg(data);
}

export async function updateParamGroup(
  payload: ParamGroupUpdatePayload,
): Promise<ApiActionResult<ParamGroup>> {
  const { data } = await apiClient.put<ApiResponse<ParamGroup>>("/params/", payload);
  return ensureSuccessWithMsg(data);
}

export async function deleteParamGroup(key: string): Promise<ApiActionResult<number>> {
  const { data } = await apiClient.delete<ApiResponse<{ deleted: number }>>(
    `/params/key/${encodeURIComponent(key)}`,
  );
  const result = ensureSuccessWithMsg(data);
  return {
    data: result.data.deleted,
    msg: result.msg,
  };
}

export async function deleteParamValue(id: number): Promise<ApiActionResult<number>> {
  const { data } = await apiClient.delete<ApiResponse<{ deleted: number }>>(
    `/params/${id}`,
  );
  const result = ensureSuccessWithMsg(data);
  return {
    data: result.data.deleted,
    msg: result.msg,
  };
}

export async function getParamGroupByKey(key: string): Promise<ParamGroup> {
  const { data } = await apiClient.get<ApiResponse<ParamGroup>>(
    `/params/key/${encodeURIComponent(key)}`,
  );
  return ensureSuccess(data);
}
