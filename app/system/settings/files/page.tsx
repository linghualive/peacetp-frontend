"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";

import {
  deleteFileResource,
  searchFiles,
  updateFileResource,
  uploadFileResource,
  type FileResource,
  type FileType,
} from "@/app/api/system/files";
import Image from "next/image";

import { apiClient } from "@/app/api/http";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Skeleton } from "@/app/components/ui/skeleton";

type SearchFormState = {
  name: string;
  type: "all" | FileType;
};

type QueryState = {
  page: number;
  size: number;
  name?: string;
  type?: FileType;
};

type DrawerState =
  | {
      mode: "create" | "edit";
      id?: number;
      name: string;
      description: string;
      type: FileType;
      file: File | null;
      fileLabel: string;
      previewUrl?: string;
    }
  | null;

type ConfirmPayload = {
  id: number;
  name: string;
};

type NotificationItem = {
  id: number;
  type: "success" | "error";
  title: string;
  description: string;
};

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_TYPE: FileType = "image";
const PREVIEWABLE_TYPES: FileType[] = ["image", "video"];

export default function SettingsFilesPage() {
  const [searchForm, setSearchForm] = useState<SearchFormState>({
    name: "",
    type: "all",
  });
  const [queryState, setQueryState] = useState<QueryState>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
  });
  const [files, setFiles] = useState<FileResource[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmPayload | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationTimers = useRef<Record<number, number>>({});
  const [fileInputKey, setFileInputKey] = useState(() => Date.now());
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const previewCacheRef = useRef<Record<number, string>>({});
  const [mediaPreviewDialog, setMediaPreviewDialog] = useState<{
    name: string;
    url: string;
    type: FileType;
  } | null>(null);

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    const timer = notificationTimers.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete notificationTimers.current[id];
    }
  }, []);

  const pushNotification = useCallback(
    (payload: Omit<NotificationItem, "id">) => {
      const id = Date.now() + Math.random();
      setNotifications((prev) => [...prev, { ...payload, id }]);
      const timer = window.setTimeout(() => {
        dismissNotification(id);
      }, 2000);
      notificationTimers.current[id] = timer;
    },
    [dismissNotification],
  );

  useEffect(() => {
    let ignore = false;
    setIsTableLoading(true);
    setTableError(null);

    const load = async () => {
      try {
        const result = await searchFiles({
          page: queryState.page,
          size: queryState.size,
          name: queryState.name,
          type: queryState.type,
        });
        if (ignore) {
          return;
        }
        setFiles(result.list);
        setPagination(result.extra);
      } catch (error) {
        if (ignore) {
          return;
        }
        const message = error instanceof Error ? error.message : "文件列表加载失败，请稍后重试";
        setTableError(message);
        pushNotification({
          type: "error",
          title: "加载失败",
          description: message,
        });
      } finally {
        if (!ignore) {
          setIsTableLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [queryState, pushNotification]);

  useEffect(() => {
    return () => {
      Object.values(notificationTimers.current).forEach((timer) => window.clearTimeout(timer));
      notificationTimers.current = {};
      Object.values(previewCacheRef.current).forEach((url) => URL.revokeObjectURL(url));
      previewCacheRef.current = {};
    };
  }, []);

  const fetchPreview = useCallback(
    async (id: number, url: string, name: string) => {
      if (previewCacheRef.current[id]) {
        setPreviewUrls((prev) => ({ ...prev, [id]: previewCacheRef.current[id] }));
        return previewCacheRef.current[id];
      }

      try {
        const response = await apiClient.get<Blob>(url, { responseType: "blob" });
        const objectUrl = URL.createObjectURL(response.data);
        previewCacheRef.current[id] = objectUrl;
        setPreviewUrls((prev) => ({ ...prev, [id]: objectUrl }));
        return objectUrl;
      } catch (error) {
        const message = error instanceof Error ? error.message : "预览加载失败";
        pushNotification({
          type: "error",
          title: "预览失败",
          description: `${name}: ${message}`,
        });
        return null;
      }
    },
    [pushNotification],
  );

  const totalPages = useMemo(() => {
    if (!pagination.total) {
      return 1;
    }
    return Math.max(1, Math.ceil(pagination.total / pagination.size));
  }, [pagination.size, pagination.total]);

  useEffect(() => {
    const previewableFiles = files.filter((file) => PREVIEWABLE_TYPES.includes(file.type));
    const activeIds = new Set(previewableFiles.map((file) => file.id));

    Object.entries(previewCacheRef.current).forEach(([key, url]) => {
      const id = Number(key);
      if (!activeIds.has(id)) {
        URL.revokeObjectURL(url);
        delete previewCacheRef.current[id];
        setPreviewUrls((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    });

    previewableFiles.forEach((file) => {
      void fetchPreview(file.id, file.file_url, file.name);
    });
  }, [files, fetchPreview]);

  useEffect(() => {
    if (
      drawerState?.mode === "edit" &&
      drawerState.id &&
      drawerState.previewUrl &&
      PREVIEWABLE_TYPES.includes(drawerState.type)
    ) {
      void fetchPreview(drawerState.id, drawerState.previewUrl, drawerState.name);
    }
  }, [drawerState, fetchPreview]);

  const refreshTable = () => {
    setQueryState((prev) => ({ ...prev }));
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = searchForm.name.trim();
    setQueryState({
      page: 0,
      size: DEFAULT_PAGE_SIZE,
      name: trimmedName || undefined,
      type: searchForm.type === "all" ? undefined : searchForm.type,
    });
  };

  const handlePageChange = (direction: "prev" | "next") => {
    setQueryState((prev) => {
      const nextPage =
        direction === "prev" ? Math.max(0, prev.page - 1) : Math.min(totalPages - 1, prev.page + 1);
      if (nextPage === prev.page) {
        return prev;
      }
      return {
        ...prev,
        page: nextPage,
      };
    });
  };

  const openCreateDrawer = () => {
    setDrawerError(null);
    setFileInputKey(Date.now());
    setDrawerState({
      mode: "create",
      name: "",
      description: "",
      type: DEFAULT_TYPE,
      file: null,
      fileLabel: "",
    });
  };

  const openEditDrawer = (file: FileResource) => {
    setDrawerError(null);
    setFileInputKey(Date.now());
    setDrawerState({
      mode: "edit",
      id: file.id,
      name: file.name,
      description: file.description ?? "",
      type: file.type,
      file: null,
      fileLabel: "",
      previewUrl: file.file_url,
    });
  };

  const closeDrawer = () => {
    setDrawerError(null);
    setDrawerState(null);
    setIsSubmitting(false);
    setFileInputKey(Date.now());
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open) {
      closeDrawer();
    }
  };

  const handleValueChange = (field: "name" | "description" | "type", value: string) => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      if (field === "type" && value !== "image" && value !== "video") {
        return prev;
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        file,
        fileLabel: file?.name ?? "",
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!drawerState) {
      return;
    }
    const trimmedName = drawerState.name.trim();
    const trimmedDescription = drawerState.description.trim();

    if (!trimmedName) {
      setDrawerError("文件名称不能为空。");
      return;
    }

    if (!drawerState.file) {
      setDrawerError("请上传文件资源。");
      return;
    }

    setIsSubmitting(true);
    setDrawerError(null);

    try {
      if (drawerState.mode === "create") {
        await uploadFileResource({
          name: trimmedName,
          type: drawerState.type,
          description: trimmedDescription || undefined,
          file: drawerState.file,
        });
        pushNotification({
          type: "success",
          title: "上传成功",
          description: "文件已上传至资源库。",
        });
      } else {
        await updateFileResource({
          id: drawerState.id!,
          name: trimmedName,
          type: drawerState.type,
          description: trimmedDescription || undefined,
          file: drawerState.file,
        });
        pushNotification({
          type: "success",
          title: "更新成功",
          description: "文件已更新并替换旧资源。",
        });
      }

      closeDrawer();
      refreshTable();
    } catch (error) {
      const message = error instanceof Error ? error.message : "文件保存失败，请稍后重试";
      setDrawerError(message);
      pushNotification({
        type: "error",
        title: "保存失败",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = (file: FileResource) => {
    setConfirmState({ id: file.id, name: file.name });
  };

  const handleConfirmOpenChange = (open: boolean) => {
    if (!open && !isConfirmLoading) {
      setConfirmState(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) {
      return;
    }
    setIsConfirmLoading(true);
    try {
      await deleteFileResource(confirmState.id);
      pushNotification({
        type: "success",
        title: "删除成功",
        description: `已删除文件「${confirmState.name}」。`,
      });
      refreshTable();
      if (drawerState?.id === confirmState.id) {
        closeDrawer();
      }
      setConfirmState(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "文件删除失败，请稍后重试";
      pushNotification({
        type: "error",
        title: "删除失败",
        description: message,
      });
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const confirmDescription = confirmState
    ? `确定要删除文件「${confirmState.name}」吗？删除后无法恢复。`
    : "";
  const currentDrawerPreview =
    drawerState?.mode === "edit" && drawerState.id ? previewUrls[drawerState.id] : undefined;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshTable}
              disabled={isTableLoading}
            >
              <RefreshCw className="size-4" />
              刷新
            </Button>
            <Button type="button" size="sm" onClick={openCreateDrawer}>
              <Upload className="size-4" />
              上传文件
            </Button>
          </div>
        </div>
        <form
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-200/80 bg-zinc-50/50 p-4 lg:flex-row lg:items-end"
          onSubmit={handleSearchSubmit}
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor="file-search-name">文件名称</Label>
            <Input
              id="file-search-name"
              placeholder="输入名称关键字"
              value={searchForm.name}
              onChange={(event) =>
                setSearchForm((prev) => ({ ...prev, name: event.target.value }))
              }
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="file-search-type">文件类型</Label>
            <Select
              value={searchForm.type}
              onValueChange={(value) =>
                setSearchForm((prev) => ({
                  ...prev,
                  type: value === "all" ? "all" : (value as FileType),
                }))
              }
            >
              <SelectTrigger id="file-search-type">
                <SelectValue placeholder="选择文件类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="image">图片</SelectItem>
                <SelectItem value="video">视频</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="secondary" className="lg:ml-auto">
            <Search className="size-4" />
            查询
          </Button>
        </form>
      </section>

      <section
        className="rounded-2xl border bg-white p-6 shadow-sm"
        aria-busy={isTableLoading}
      >
        {tableError && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {tableError}
          </p>
        )}
        <div className="overflow-hidden rounded-2xl border border-zinc-100">
          <table className="min-w-full divide-y divide-zinc-100 text-left text-sm">
            <thead className="bg-zinc-50/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">文件信息</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">预览</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isTableLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`file-skeleton-${index}`}>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-40 rounded-xl" />
                        <Skeleton className="mt-2 h-3 w-60 rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-16 w-28 rounded-2xl" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Skeleton className="ml-auto h-8 w-24 rounded-full" />
                      </td>
                    </tr>
                  ))
                : files.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-sm text-zinc-500">
                        暂无文件记录，点击右上角上传按钮新增资源。
                      </td>
                    </tr>
                  )}

              {!isTableLoading &&
                files.map((file) => (
                  <tr
                    key={file.id}
                    className="cursor-pointer bg-white transition hover:bg-zinc-50"
                    onClick={() => openEditDrawer(file)}
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="font-medium text-zinc-900">{file.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {file.description || "暂无描述，点击行即可编辑详情。"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${
                          file.type === "image"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-indigo-50 text-indigo-600"
                        }`}
                      >
                        {file.type === "image" ? "图片" : "视频"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {file.type === "image" ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="group flex flex-col items-start text-left"
                            aria-label={`预览${file.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              const previewUrl = previewUrls[file.id];
                              if (!previewUrl) {
                                return;
                              }
                              setMediaPreviewDialog({
                                name: file.name,
                                url: previewUrl,
                                type: "image",
                              });
                            }}
                          >
                            <div className="relative h-16 w-24 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 transition group-hover:border-primary/40">
                              {previewUrls[file.id] ? (
                                <Image
                                  src={previewUrls[file.id]}
                                  alt={file.name}
                                  fill
                                  sizes="96px"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <Skeleton className="h-full w-full rounded-none" />
                              )}
                            </div>
                            <span className="mt-1 text-xs text-primary">
                              {previewUrls[file.id] ? "点击缩略图查看大图" : "预览加载中..."}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="group flex flex-col items-start text-left"
                            aria-label={`预览${file.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              const previewUrl = previewUrls[file.id];
                              if (!previewUrl) {
                                return;
                              }
                              setMediaPreviewDialog({
                                name: file.name,
                                url: previewUrl,
                                type: "video",
                              });
                            }}
                          >
                            <div className="relative h-16 w-28 overflow-hidden rounded-2xl border border-zinc-100 bg-black/5 transition group-hover:border-primary/40">
                              {previewUrls[file.id] ? (
                                <video
                                  src={previewUrls[file.id]}
                                  className="h-full w-full object-cover"
                                  muted
                                  loop
                                  playsInline
                                  autoPlay
                                  preload="metadata"
                                />
                              ) : (
                                <Skeleton className="h-full w-full rounded-none" />
                              )}
                            </div>
                            <span className="mt-1 text-xs text-primary">
                              {previewUrls[file.id] ? "点击缩略图播放视频" : "预览加载中..."}
                            </span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-zinc-600"
                          onClick={(event) => {
                            event.stopPropagation();
                            window.open(file.file_url, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <Download className="size-4" />
                          下载
                        </Button> */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:text-rose-600"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteRequest(file);
                          }}
                          disabled={isConfirmLoading && confirmState?.id === file.id}
                        >
                          <Trash2 className="size-4" />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            共{" "}
            <span className="font-semibold text-zinc-900">{pagination.total}</span>{" "}
            个文件资源，每页 {pagination.size} 个。
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange("prev")}
              disabled={queryState.page === 0 || isTableLoading}
            >
              上一页
            </Button>
            <span className="text-xs text-zinc-500">
              第 {queryState.page + 1} / {totalPages} 页
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange("next")}
              disabled={
                queryState.page + 1 >= totalPages || isTableLoading || files.length === 0
              }
            >
              下一页
            </Button>
          </div>
        </div>
      </section>

      <Sheet open={Boolean(drawerState)} onOpenChange={handleDrawerOpenChange}>
        <SheetContent side="right" className="sm:max-w-2xl">
          {drawerState && (
            <form className="flex h-full flex-col gap-6" onSubmit={handleSubmit}>
              <SheetHeader>
                <SheetTitle>
                  {drawerState.mode === "create" ? "上传文件" : "编辑文件"}
                </SheetTitle>
                <SheetDescription>
                  支持上传图片与视频，更新时需重新选择文件，提交后立即生效。
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="file-name-input">文件名称</Label>
                  <Input
                    id="file-name-input"
                    value={drawerState.name}
                    onChange={(event) => handleValueChange("name", event.target.value)}
                    placeholder="例如 首页 Banner"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-type-select">文件类型</Label>
                  <Select
                    value={drawerState.type}
                    onValueChange={(value) => handleValueChange("type", value)}
                  >
                    <SelectTrigger id="file-type-select">
                      <SelectValue placeholder="选择文件类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">图片</SelectItem>
                      <SelectItem value="video">视频</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-description-input">描述（可选）</Label>
                  <textarea
                    id="file-description-input"
                    value={drawerState.description}
                    onChange={(event) => handleValueChange("description", event.target.value)}
                    placeholder="补充该文件的用途或备注信息"
                    className="min-h-[96px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {drawerState.mode === "edit" && drawerState.previewUrl && (
                  <div className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 text-sm text-zinc-500">
                    <p className="font-medium text-zinc-800">当前文件</p>
                    {drawerState.type === "image" ? (
                      <button
                        type="button"
                        className={`flex flex-col items-start gap-2 text-left text-xs ${
                          currentDrawerPreview ? "text-zinc-500" : "cursor-not-allowed opacity-60"
                        }`}
                        onClick={() => {
                          if (currentDrawerPreview) {
                            setMediaPreviewDialog({
                              name: drawerState.name,
                              url: currentDrawerPreview,
                              type: "image",
                            });
                          }
                        }}
                      >
                        <div className="relative h-40 w-full overflow-hidden rounded-2xl border border-zinc-100 bg-white">
                          {currentDrawerPreview ? (
                            <Image
                              src={currentDrawerPreview}
                              alt={drawerState.name}
                              fill
                              sizes="320px"
                              className="object-contain bg-zinc-100"
                              unoptimized
                            />
                          ) : (
                            <Skeleton className="h-full w-full rounded-none" />
                          )}
                        </div>
                        <span className="text-xs text-primary">
                          {currentDrawerPreview ? "点击放大预览" : "预览加载中..."}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`flex flex-col items-start gap-2 text-left text-xs ${
                          currentDrawerPreview ? "text-zinc-500" : "cursor-not-allowed opacity-60"
                        }`}
                        onClick={() => {
                          if (currentDrawerPreview) {
                            setMediaPreviewDialog({
                              name: drawerState.name,
                              url: currentDrawerPreview,
                              type: "video",
                            });
                          }
                        }}
                      >
                        <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-zinc-100 bg-black/5">
                          {currentDrawerPreview ? (
                            <video
                              src={currentDrawerPreview}
                              className="h-full w-full object-contain bg-black"
                              controls
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <Skeleton className="h-full w-full rounded-none" />
                          )}
                        </div>
                        <span className="text-xs text-primary">
                          {currentDrawerPreview ? "点击播放预览" : "预览加载中..."}
                        </span>
                      </button>
                    )}
                    <p className="text-xs text-zinc-400">更新时需重新上传新的文件。</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="file-upload-input">
                    {drawerState.mode === "create" ? "选择文件" : "重新上传文件"}
                  </Label>
                  <input
                    key={fileInputKey}
                    id="file-upload-input"
                    type="file"
                    accept={drawerState.type === "image" ? "image/*" : "video/*"}
                    onChange={handleFileChange}
                    className="w-full rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-600 file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:border-primary/60"
                  />
                  <p className="text-xs text-zinc-500">
                    支持 {drawerState.type === "image" ? "PNG/JPG 等图片格式" : "MP4 等视频格式"}；
                    单个文件建议不超过 20MB。
                  </p>
                  {drawerState.fileLabel && (
                    <p className="text-xs text-zinc-500">已选择：{drawerState.fileLabel}</p>
                  )}
                </div>

                {drawerError && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {drawerError}
                  </p>
                )}
              </div>

              <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="secondary">
                    取消
                  </Button>
                </SheetClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "保存中..." : drawerState.mode === "create" ? "上传文件" : "保存修改"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(confirmState)} onOpenChange={handleConfirmOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除文件</DialogTitle>
            {confirmDescription && <DialogDescription>{confirmDescription}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={isConfirmLoading}
              onClick={() => setConfirmState(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isConfirmLoading}
              onClick={handleConfirmAction}
            >
              {isConfirmLoading ? "处理中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(mediaPreviewDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setMediaPreviewDialog(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{mediaPreviewDialog?.name ?? "文件预览"}</DialogTitle>
          </DialogHeader>
          {mediaPreviewDialog &&
            (mediaPreviewDialog.type === "image" ? (
              <div className="relative h-[60vh] w-full overflow-hidden rounded-2xl bg-black/5">
                <Image
                  src={mediaPreviewDialog.url}
                  alt={mediaPreviewDialog.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-2xl bg-black">
                <video
                  src={mediaPreviewDialog.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full"
                />
              </div>
            ))}
        </DialogContent>
      </Dialog>

      <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-3">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto w-full max-w-md">
            <Alert
              variant={notification.type === "success" ? "success" : "destructive"}
              className="shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <AlertTitle>{notification.title}</AlertTitle>
                  <AlertDescription>{notification.description}</AlertDescription>
                </div>
                <button
                  type="button"
                  className="text-xs text-zinc-400 transition hover:text-zinc-600"
                  aria-label="关闭通知"
                  onClick={() => dismissNotification(notification.id)}
                >
                  <X className="size-4" />
                </button>
              </div>
            </Alert>
          </div>
        ))}
      </div>
    </div>
  );
}
