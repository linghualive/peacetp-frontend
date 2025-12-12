"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Code, Cpu, PencilLine, Plus, RefreshCw, Trash2, X } from "lucide-react";

import {
  createDeviceType,
  deleteDeviceType,
  pageDeviceTypes,
  updateDeviceType,
  type DeviceType,
} from "@/app/api/device/types";
import { getParamGroupByKey, type ParamValue } from "@/app/api/system/params";
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

import { SystemPageShell } from "../../../components/system-page-shell";

const PARAM_GROUP_KEY = "device_arg";

const splitArgTemplate = (template?: string | null) =>
  template
    ? template
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const joinArgTemplate = (values: string[]) => values.join(",");

type DrawerState =
  | {
      mode: "create" | "edit";
      id?: number;
      name: string;
      description: string;
      argTemplate: string;
    }
  | null;

type ConfirmState = {
  id: number;
  name: string;
} | null;

type NotificationItem = {
  id: number;
  type: "success" | "error";
  title: string;
  description: string;
};

const DEFAULT_PAGE_SIZE = 10;

export default function DeviceTypePage() {
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [queryState, setQueryState] = useState({ page: 0, size: DEFAULT_PAGE_SIZE });
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
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationTimers = useRef<Record<number, number>>({});
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [paramOptions, setParamOptions] = useState<ParamValue[]>([]);
  const [isParamLoading, setIsParamLoading] = useState(true);
  const [paramError, setParamError] = useState<string | null>(null);

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
      }, 2200);
      notificationTimers.current[id] = timer;
    },
    [dismissNotification],
  );

  const loadParamOptions = useCallback(async () => {
    setIsParamLoading(true);
    setParamError(null);

    try {
      const group = await getParamGroupByKey(PARAM_GROUP_KEY);
      setParamOptions(group.values);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "参数列表加载失败，请稍后再试";
      setParamError(message);
      pushNotification({
        type: "error",
        title: "参数加载失败",
        description: message,
      });
    } finally {
      setIsParamLoading(false);
    }
  }, [pushNotification]);

  useEffect(() => {
    void loadParamOptions();
  }, [loadParamOptions]);

  useEffect(() => {
    let ignore = false;
    setIsTableLoading(true);
    setTableError(null);

    const load = async () => {
      try {
        const result = await pageDeviceTypes({
          page: queryState.page,
          size: queryState.size,
        });
        if (ignore) {
          return;
        }
        setDeviceTypes(result.list);
        setPagination(result.extra);
        setLastSyncedAt(Date.now());
      } catch (error) {
        if (ignore) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "设备类型列表加载失败，请稍后再试";
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

    void load();

    return () => {
      ignore = true;
    };
  }, [queryState, pushNotification]);

  useEffect(() => {
    return () => {
      Object.values(notificationTimers.current).forEach((timer) => window.clearTimeout(timer));
      notificationTimers.current = {};
    };
  }, []);

  const totalPages = useMemo(() => {
    if (!pagination.total) {
      return 1;
    }
    return Math.max(1, Math.ceil(pagination.total / pagination.size));
  }, [pagination.size, pagination.total]);

  const typesWithoutTemplate = useMemo(
    () =>
      deviceTypes.filter(
        (item) => !item.argTemplate || item.argTemplate.trim().length === 0,
      ).length,
    [deviceTypes],
  );

  const lastSyncedText = useMemo(() => {
    if (!lastSyncedAt) {
      return "尚未同步";
    }
    return new Date(lastSyncedAt).toLocaleString();
  }, [lastSyncedAt]);

  const paramOptionMap = useMemo(() => {
    const map = new Map<string, ParamValue>();
    paramOptions.forEach((item) => {
      map.set(item.value, item);
    });
    return map;
  }, [paramOptions]);

  const selectedArgValues = useMemo(
    () => splitArgTemplate(drawerState?.argTemplate ?? ""),
    [drawerState?.argTemplate],
  );

  const refreshTable = () => {
    setQueryState((prev) => ({ ...prev }));
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
    setDrawerState({
      mode: "create",
      name: "",
      description: "",
      argTemplate: "",
    });
  };

  const openEditDrawer = (deviceType: DeviceType) => {
    setDrawerError(null);
    setDrawerState({
      mode: "edit",
      id: deviceType.id,
      name: deviceType.name,
      description: deviceType.description ?? "",
      argTemplate: deviceType.argTemplate ?? "",
    });
  };

  const closeDrawer = () => {
    setDrawerError(null);
    setDrawerState(null);
    setIsSubmitting(false);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open) {
      closeDrawer();
    }
  };

  const handleValueChange = (field: "name" | "description", value: string) => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const toggleArgTemplateValue = (value: string) => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      const currentValues = splitArgTemplate(prev.argTemplate);
      const exists = currentValues.includes(value);
      const nextValues = exists
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return {
        ...prev,
        argTemplate: joinArgTemplate(nextValues),
      };
    });
  };

  const handleDrawerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!drawerState) {
      return;
    }
    const trimmedName = drawerState.name.trim();
    const trimmedDescription = drawerState.description.trim();
    const trimmedArgTemplate = drawerState.argTemplate.trim();

    if (!trimmedName) {
      setDrawerError("设备类型名称不能为空。");
      return;
    }

    setIsSubmitting(true);
    setDrawerError(null);

    try {
      if (drawerState.mode === "create") {
        await createDeviceType({
          name: trimmedName,
          description: trimmedDescription || undefined,
          argTemplate: trimmedArgTemplate || undefined,
        });
        pushNotification({
          type: "success",
          title: "创建成功",
          description: "新设备类型已加入选择列表。",
        });
      } else {
        await updateDeviceType({
          id: drawerState.id!,
          name: trimmedName,
          description: trimmedDescription || undefined,
          argTemplate: trimmedArgTemplate || undefined,
        });
        pushNotification({
          type: "success",
          title: "更新成功",
          description: "设备类型信息已保存。",
        });
      }
      closeDrawer();
      refreshTable();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "设备类型保存失败，请稍后再试";
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

  const handleDeleteRequest = (deviceType: DeviceType) => {
    setConfirmState({ id: deviceType.id, name: deviceType.name });
  };

  const handleConfirmOpenChange = (open: boolean) => {
    if (!open && !isConfirmLoading) {
      setConfirmState(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmState) {
      return;
    }
    setIsConfirmLoading(true);
    try {
      await deleteDeviceType(confirmState.id);
      pushNotification({
        type: "success",
        title: "删除成功",
        description: `设备类型「${confirmState.name}」已删除。`,
      });
      refreshTable();
      if (drawerState?.id === confirmState.id) {
        closeDrawer();
      }
      setConfirmState(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败，请稍后再试";
      pushNotification({
        type: "error",
        title: "操作失败",
        description: message,
      });
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const confirmDescription = confirmState
    ? `确定要删除设备类型「${confirmState.name}」吗？若仍有设备引用该类型会导致后续录入失败，请谨慎操作。`
    : "";

  const renderArgTemplateTag = (template?: string | null) => {
    const tokens = splitArgTemplate(template);
    if (tokens.length === 0) {
      return <span className="text-xs text-zinc-400">未配置参数模板</span>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {tokens.map((token, index) => (
          <span
            key={`${token}-${index}`}
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600"
          >
            {paramOptionMap.get(token)?.description
              ? `${paramOptionMap.get(token)?.description} (${token})`
              : token}
          </span>
        ))}
      </div>
    );
  };

  const isSkeletonVisible = isTableLoading && deviceTypes.length === 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">设备类型列表</h3>
            <p className="text-sm text-zinc-500">
              点击某一行即可快速查看与编辑对应的类型信息。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={refreshTable}
              disabled={isTableLoading}
            >
              <RefreshCw className="size-4" />
              刷新
            </Button>
            <Button type="button" size="sm" onClick={openCreateDrawer}>
              <Plus className="size-4" />
              新建设备类型
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm" aria-busy={isTableLoading}>
        {tableError && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {tableError}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-zinc-100">
          <table className="min-w-full divide-y divide-zinc-100 text-left text-sm">
            <thead className="bg-zinc-50/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">类型信息</th>
                <th className="px-4 py-3 font-medium">参数模板</th>
                <th className="px-4 py-3 font-medium">描述</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isTableLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`device-type-skeleton-${index}`}>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-48 rounded-xl" />
                        <Skeleton className="mt-2 h-3 w-32 rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-full rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-5/6 rounded-xl" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Skeleton className="ml-auto h-8 w-28 rounded-full" />
                      </td>
                    </tr>
                  ))
                : deviceTypes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-500">
                        暂无设备类型数据，点击右上角「新建设备类型」即可创建。
                      </td>
                    </tr>
                  )}

              {!isTableLoading &&
                deviceTypes.map((deviceType) => (
                  <tr
                    key={deviceType.id}
                    className="cursor-pointer bg-white transition hover:bg-zinc-50"
                    onClick={() => openEditDrawer(deviceType)}
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-zinc-900">{deviceType.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">ID：{deviceType.id}</p>
                    </td>
                    <td className="px-4 py-4">{renderArgTemplateTag(deviceType.argTemplate)}</td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-600">
                        {deviceType.description || "暂无描述，点击此行完善信息。"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-zinc-600 hover:text-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDrawer(deviceType);
                          }}
                        >
                          <PencilLine className="size-4" />
                          编辑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-rose-500 hover:text-rose-600"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteRequest(deviceType);
                          }}
                          disabled={isConfirmLoading && confirmState?.id === deviceType.id}
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
            个类型，每页 {pagination.size} 个。
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
                queryState.page + 1 >= totalPages || isTableLoading || deviceTypes.length === 0
              }
            >
              下一页
            </Button>
          </div>
        </div>
      </section>

      <Sheet open={Boolean(drawerState)} onOpenChange={handleDrawerOpenChange}>
        <SheetContent side="right" className="sm:max-w-xl">
          {drawerState && (
            <form className="flex h-full flex-col gap-6" onSubmit={handleDrawerSubmit}>
              <SheetHeader>
                <SheetTitle>
                  {drawerState.mode === "create"
                    ? "新建设备类型"
                    : `编辑设备类型：${drawerState.name}`}
                </SheetTitle>
                <SheetDescription>
                  配置类型名称、参数模板与描述信息，保存后即可用于设备录入。
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="device-type-name-input">类型名称</Label>
                  <Input
                    id="device-type-name-input"
                    value={drawerState.name}
                    onChange={(event) => handleValueChange("name", event.target.value)}
                    placeholder="例如 血压检测仪"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label>参数模板</Label>
                  {isParamLoading ? (
                    <div className="space-y-3 rounded-2xl border border-dashed border-zinc-200 p-4">
                      <Skeleton className="h-4 w-32 rounded-xl" />
                      <Skeleton className="h-8 w-full rounded-xl" />
                      <Skeleton className="h-8 w-5/6 rounded-xl" />
                    </div>
                  ) : paramError ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                      <p>{paramError}</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                        onClick={loadParamOptions}
                      >
                        重新加载
                      </Button>
                    </div>
                  ) : paramOptions.length === 0 ? (
                    <p className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                      暂无可用参数，请先在系统参数中维护 key 为「device_arg」的取值。
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {paramOptions.map((option) => {
                          const isSelected = selectedArgValues.includes(option.value);
                          const label = option.description
                            ? `${option.description} (${option.value})`
                            : option.value;
                          return (
                            <Button
                              key={option.id}
                              type="button"
                              size="sm"
                              variant={isSelected ? "default" : "secondary"}
                              className="h-auto rounded-full px-3 py-1 text-xs shadow-none"
                              aria-pressed={isSelected}
                              onClick={() => toggleArgTemplateValue(option.value)}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-zinc-500">
                        选择后会按英文逗号拼接传给后端，可再次点击按钮取消选择。
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedArgValues.length === 0 ? (
                          <span className="text-xs text-zinc-400">尚未选择任何参数。</span>
                        ) : (
                          selectedArgValues.map((value) => {
                            const option = paramOptionMap.get(value);
                            const label = option?.description
                              ? `${option.description} (${value})`
                              : value;
                            return (
                              <button
                                key={value}
                                type="button"
                                className="group flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary"
                                aria-label={`移除 ${label}`}
                                onClick={() => toggleArgTemplateValue(value)}
                              >
                                {label}
                                <X className="size-3 text-primary/70 group-hover:text-primary" />
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-type-description-input">描述</Label>
                  <textarea
                    id="device-type-description-input"
                    value={drawerState.description}
                    onChange={(event) => handleValueChange("description", event.target.value)}
                    placeholder="补充设备类型的使用说明、适配型号等信息"
                    className="min-h-[140px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {drawerError && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {drawerError}
                  </p>
                )}
              </div>

              <SheetFooter>
                <SheetClose asChild>
                  <Button type="button" variant="secondary" disabled={isSubmitting}>
                    取消
                  </Button>
                </SheetClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "保存中..."
                    : drawerState.mode === "create"
                      ? "创建"
                      : "保存修改"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(confirmState)} onOpenChange={handleConfirmOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除设备类型</DialogTitle>
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
              onClick={handleConfirmDelete}
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
