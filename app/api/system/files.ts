import {
  apiClient,
  type ApiActionResult,
  type ApiResponse,
} from "@/app/api/http";

export type FileType = "image" | "video";

export interface FileResource {
  id: number;
  name: string;
  file_url: string;
  type: FileType;
  description?: string | null;
}

export interface FileSearchExtra {
  page: number;
  size: number;
  total: number;
}

export interface FileSearchResult {
  list: FileResource[];
  extra: FileSearchExtra;
}

export interface FileSearchPayload {
  page: number;
  size: number;
  name?: string;
  type?: FileType;
}

export interface UploadFilePayload {
  name: string;
  type: FileType;
  description?: string;
  file: File;
}

export interface UpdateFilePayload extends UploadFilePayload {
  id: number;
}

const ensureSuccess = <T>(response: ApiResponse<T>): T => {
  if (response.code !== 0 || response.data === undefined || response.data === null) {
    throw new Error(response.msg || "文件接口调用失败，请稍后再试");
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

const buildSearchBody = (payload: FileSearchPayload) => {
  const query: Record<string, unknown> = {};
  if (payload.name) {
    query.name = payload.name;
  }
  if (payload.type) {
    query.type = payload.type;
  }
  return {
    page: payload.page,
    size: payload.size,
    ...(Object.keys(query).length > 0 ? { query } : {}),
  };
};

const toFormData = (payload: UploadFilePayload | UpdateFilePayload): FormData => {
  const formData = new FormData();
  if ("id" in payload) {
    formData.append("id", String(payload.id));
  }
  formData.append("name", payload.name);
  formData.append("type", payload.type);
  if (payload.description) {
    formData.append("description", payload.description);
  }
  formData.append("file", payload.file);
  return formData;
};

export async function searchFiles(payload: FileSearchPayload): Promise<FileSearchResult> {
  const body = buildSearchBody(payload);
  const { data } = await apiClient.post<ApiResponse<FileSearchResult>>("/files/search", body);
  return ensureSuccess(data);
}

export async function uploadFileResource(
  payload: UploadFilePayload,
): Promise<ApiActionResult<FileResource>> {
  const formData = toFormData(payload);
  const { data } = await apiClient.post<ApiResponse<FileResource>>("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return ensureSuccessWithMsg(data);
}

export async function updateFileResource(
  payload: UpdateFilePayload,
): Promise<ApiActionResult<FileResource>> {
  const formData = toFormData(payload);
  const { data } = await apiClient.post<ApiResponse<FileResource>>("/files/update", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return ensureSuccessWithMsg(data);
}

export async function deleteFileResource(id: number): Promise<ApiActionResult<number>> {
  const { data } = await apiClient.delete<ApiResponse<{ deleted: number }>>("/files", {
    params: { id },
  });
  const result = ensureSuccessWithMsg(data);
  return {
    data: result.data.deleted,
    msg: result.msg,
  };
}
