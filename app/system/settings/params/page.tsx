"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, RefreshCw, Search, Trash2, X } from "lucide-react";

import {
  createParamGroup,
  deleteParamGroup,
  deleteParamValue,
  searchParams,
  updateParamGroup,
  type ParamGroup,
} from "@/app/api/system/params";
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
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Skeleton } from "@/app/components/ui/skeleton";

type QueryState = {
  page: number;
  size: number;
  key: string;
};

type ParamValueForm = {
  id?: number;
  value: string;
  description?: string;
};

type DrawerState =
  | {
      mode: "create" | "edit";
      key: string;
      values: ParamValueForm[];
    }
  | null;

type ConfirmPayload =
  | {
      type: "group";
      key: string;
    }
  | {
      type: "value";
      id: number;
      label?: string;
    };

type NotificationItem = {
  id: number;
  type: "success" | "error";
  title: string;
  description: string;
};

const DEFAULT_PAGE_SIZE = 10;

export default function SettingsParamsPage() {
  const [queryState, setQueryState] = useState<QueryState>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    key: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [groups, setGroups] = useState<ParamGroup[]>([]);
  const [tableError, setTableError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deletingValueId, setDeletingValueId] = useState<number | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmPayload | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationTimers = useRef<Record<number, number>>({});

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
        const result = await searchParams({
          page: queryState.page,
          size: queryState.size,
          key: queryState.key || undefined,
        });
        if (ignore) {
          return;
        }
        setGroups(result.list);
        setPagination(result.extra);
      } catch (error) {
        if (ignore) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "参数配置加载失败，请稍后重试";
        setTableError(message);
        pushNotification({
          type: "error",
          title: "数据加载失败",
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

  const totalPages = useMemo(() => {
    if (!pagination.total) {
      return 1;
    }
    return Math.max(1, Math.ceil(pagination.total / pagination.size));
  }, [pagination.total, pagination.size]);

  const confirmTitle =
    confirmState?.type === "group"
      ? "删除参数组"
      : confirmState?.type === "value"
        ? "删除参数值"
        : "";

  const confirmDescription = (() => {
    if (!confirmState) {
      return "";
    }
    if (confirmState.type === "group") {
      return `删除后 key「${confirmState.key}」下的所有 value 将不可恢复。`;
    }
    return `删除后 value「${confirmState.label ?? confirmState.id}」将不可恢复。`;
  })();

  const refreshTable = () => {
    setQueryState((prev) => ({ ...prev }));
  };

  const openCreateDrawer = () => {
    setDrawerError(null);
    setDrawerState({
      mode: "create",
      key: "",
      values: [
        { value: "", description: "" },
        { value: "", description: "" },
      ],
    });
  };

  const openEditDrawer = (group: ParamGroup) => {
    setDrawerError(null);
    setDrawerState({
      mode: "edit",
      key: group.key,
      values: group.values.map((item) => ({
        id: item.id,
        value: item.value,
        description: item.description ?? "",
      })),
    });
  };

  const closeDrawer = () => {
    setDrawerError(null);
    setDrawerState(null);
    setIsSubmitting(false);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    setQueryState((prev) => ({
      ...prev,
      page: 0,
      key: trimmed,
    }));
    setSearchInput(trimmed);
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

  const handleDeleteGroup = (key: string) => {
    setConfirmState({ type: "group", key });
  };

  const performDeleteGroup = async (key: string) => {
    setDeletingKey(key);
    try {
      await deleteParamGroup(key);
      pushNotification({
        type: "success",
        title: "删除成功",
        description: `已删除 key 为「${key}」的全部参数值。`,
      });
      if (drawerState?.key === key) {
        closeDrawer();
      }
      refreshTable();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败，请稍后再试";
      pushNotification({
        type: "error",
        title: "删除失败",
        description: message,
      });
    } finally {
      setDeletingKey(null);
    }
  };

  const handleRemoveValue = (index: number) => {
    if (!drawerState) {
      return;
    }
    const target = drawerState.values[index];
    if (!target) {
      return;
    }

    // 新增行直接移除即可。
    if (!target.id) {
      setDrawerState((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          values: prev.values.filter((_, idx) => idx !== index),
        };
      });
      return;
    }

    setConfirmState({
      type: "value",
      id: target.id,
      label: target.value,
    });
  };

  const performDeleteValue = async (valueId: number) => {
    setDeletingValueId(valueId);
    setDrawerError(null);

    try {
      await deleteParamValue(valueId);
      setDrawerState((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          values: prev.values.filter((item) => item.id !== valueId),
        };
      });
      refreshTable();
      pushNotification({
        type: "success",
        title: "删除成功",
        description: "参数值已删除。",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "删除参数值失败，请稍后重试";
      pushNotification({
        type: "error",
        title: "删除失败",
        description: message,
      });
    } finally {
      setDeletingValueId(null);
    }
  };

  const handleAddValue = () => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        values: [...prev.values, { value: "", description: "" }],
      };
    });
  };

  const handleValueChange = (
    index: number,
    field: keyof Omit<ParamValueForm, "id">,
    value: string,
  ) => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      const nextValues = prev.values.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      );
      return {
        ...prev,
        values: nextValues,
      };
    });
  };

  const handleKeyChange = (value: string) => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        key: value,
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!drawerState) {
      return;
    }

    const trimmedKey = drawerState.key.trim();
    const normalizedValues = drawerState.values
      .map((item) => ({
        ...item,
        value: item.value.trim(),
        description: item.description?.trim() ?? "",
      }))
      .filter((item) => item.value.length > 0);

    if (!trimmedKey) {
      setDrawerError("参数 key 不能为空。");
      return;
    }

    if (normalizedValues.length === 0) {
      setDrawerError("至少需要保留一个参数值。");
      return;
    }

    setIsSubmitting(true);
    setDrawerError(null);

    try {
      if (drawerState.mode === "create") {
        await createParamGroup({
          key: trimmedKey,
          values: normalizedValues.map((item) => ({
            value: item.value,
            description: item.description || undefined,
          })),
        });
        pushNotification({
          type: "success",
          title: "创建成功",
          description: "参数配置已创建。",
        });
      } else {
        const existingValues = normalizedValues.filter((item) => item.id);
        const newValues = normalizedValues.filter((item) => !item.id);

        const requests: Array<Promise<unknown>> = [];
        if (existingValues.length > 0) {
          requests.push(
            updateParamGroup({
              key: trimmedKey,
              values: existingValues.map((item) => ({
                id: item.id!,
                value: item.value,
                description: item.description || undefined,
              })),
            }),
          );
        }
        if (newValues.length > 0) {
          requests.push(
            createParamGroup({
              key: trimmedKey,
              values: newValues.map((item) => ({
                value: item.value,
                description: item.description || undefined,
              })),
            }),
          );
        }

        await Promise.all(requests);
        pushNotification({
          type: "success",
          title: "更新成功",
          description: "参数配置已更新。",
        });
      }

      closeDrawer();
      refreshTable();
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败，请稍后再试";
      pushNotification({
        type: "error",
        title: "保存失败",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open) {
      closeDrawer();
    }
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
      if (confirmState.type === "group") {
        await performDeleteGroup(confirmState.key);
      } else {
        await performDeleteValue(confirmState.id);
      }
      setConfirmState(null);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      Object.values(notificationTimers.current).forEach((timer) => {
        window.clearTimeout(timer);
      });
      notificationTimers.current = {};
    };
  }, []);

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
              <Plus className="size-4" />
              新增参数组
            </Button>
          </div>
        </div>
        <form
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-200/80 bg-zinc-50/50 p-4 sm:flex-row sm:items-center"
          onSubmit={handleSearchSubmit}
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor="param-key-search">按 key 筛选</Label>
            <div className="flex gap-3">
              <Input
                id="param-key-search"
                placeholder="例如 device_arg"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                autoComplete="off"
              />
              <Button type="submit" variant="secondary" className="shrink-0">
                <Search className="size-4" />
                查询
              </Button>
            </div>
          </div>
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
                <th className="px-4 py-3 font-medium">参数 key</th>
                <th className="px-4 py-3 font-medium">参数值 / 描述</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isTableLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`params-skeleton-${index}`}>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-28 rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Skeleton className="h-6 w-32 rounded-full" />
                          <Skeleton className="h-6 w-28 rounded-full" />
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Skeleton className="ml-auto h-8 w-20 rounded-full" />
                      </td>
                    </tr>
                  ))
                : groups.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-10 text-center text-sm text-zinc-500"
                      >
                        {queryState.key
                          ? `没有找到 key 包含“${queryState.key}”的参数配置。`
                          : "暂无参数配置，点击右上角按钮即可创建。"}
                      </td>
                    </tr>
                  )}

              {!isTableLoading &&
                groups.map((group) => (
                  <tr
                    key={group.key}
                    className="cursor-pointer bg-white transition hover:bg-zinc-50"
                    onClick={() => openEditDrawer(group)}
                  >
                    <td className="px-4 py-5 align-top">
                      <p className="font-medium text-zinc-900">{group.key}</p>
                      <p className="text-xs text-zinc-500">
                        点击行即可查看/编辑参数详情
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-wrap gap-2">
                        {group.values.map((value) => (
                          <span
                            key={value.id}
                            className="rounded-full border border-zinc-200/80 bg-zinc-50 px-3 py-1 text-xs text-zinc-700"
                          >
                            <span className="font-medium">{value.value}</span>
                            {value.description ? (
                              <span className="text-zinc-400"> · {value.description}</span>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-rose-500 hover:text-rose-600"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteGroup(group.key);
                        }}
                        disabled={deletingKey === group.key}
                      >
                        <Trash2 className="size-4" />
                        删除
                      </Button>
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
            组参数，每页 {pagination.size} 组。
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
                queryState.page + 1 >= totalPages || isTableLoading || groups.length === 0
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
                  {drawerState.mode === "create" ? "新增参数组" : "编辑参数组"}
                </SheetTitle>
                <SheetDescription>
                  参数组由一个 key 与多个 value 组成，可在此一次性维护全部参数值。
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="param-key-input">参数 key</Label>
                  <Input
                    id="param-key-input"
                    value={drawerState.key}
                    onChange={(event) => handleKeyChange(event.target.value)}
                    placeholder="例如 device_arg"
                    autoComplete="off"
                  />
                  <p className="text-xs text-zinc-500">
                    key 决定参数组，更新时可重命名，提交后所有 value 将归属于新的 key。
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-800">参数值</p>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddValue}>
                      <Plus className="size-4" />
                      新增 value
                    </Button>
                  </div>

                  {drawerState.values.map((value, index) => (
                    <div
                      key={value.id ?? `new-${index}`}
                      className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`param-value-${index}`}>Value</Label>
                          <Input
                            id={`param-value-${index}`}
                            value={value.value}
                            onChange={(event) =>
                              handleValueChange(index, "value", event.target.value)
                            }
                            placeholder="例如 BloodPressure"
                            autoComplete="off"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`param-desc-${index}`}>描述（可选）</Label>
                          <Input
                            id={`param-desc-${index}`}
                            value={value.description ?? ""}
                            onChange={(event) =>
                              handleValueChange(index, "description", event.target.value)
                            }
                            placeholder="例如 血压"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                        {value.id ? (
                          <span>记录 ID：{value.id}</span>
                        ) : (
                          <span>提交后将自动创建 ID</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:text-rose-600"
                          onClick={() => handleRemoveValue(index)}
                          disabled={value.id ? deletingValueId === value.id : false}
                        >
                          <Trash2 className="size-4" />
                          移除
                        </Button>
                      </div>
                    </div>
                  ))}
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
                  {isSubmitting ? "保存中..." : "保存配置"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(confirmState)} onOpenChange={handleConfirmOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            {confirmDescription ? (
              <DialogDescription>{confirmDescription}</DialogDescription>
            ) : null}
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
