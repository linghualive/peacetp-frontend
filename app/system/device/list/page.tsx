"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Cpu,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createDevice,
  deleteDevice,
  pageDevices,
  updateDevice,
  type Device,
} from "@/app/api/device/devices";
import { pageDeviceTypes, type DeviceType } from "@/app/api/device/types";
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

import { SystemPageShell } from "../../../components/system-page-shell";

type DrawerMode = "create" | "edit";

type KeyValueEntry = {
  id: string;
  key: string;
  value: string;
};

type DrawerState =
  | {
      mode: DrawerMode;
      id?: number;
      machineCode: string;
      name: string;
      deviceTypeId: number | null;
      argsEntries: KeyValueEntry[];
      warnEntries: KeyValueEntry[];
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

type FilterFormState = {
  name: string;
  machineCode: string;
  deviceTypeId: string;
};

const DEFAULT_PAGE_SIZE = 10;

const createEntry = (key = "", value = ""): KeyValueEntry => ({
  id: `${Date.now()}-${Math.random()}`,
  key,
  value,
});

const areEntriesEqual = (a: KeyValueEntry[], b: KeyValueEntry[]) => {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((entry, index) => {
    const target = b[index];
    return entry.key === target.key && entry.value === target.value;
  });
};

const splitArgTemplate = (template?: string | null) =>
  template
    ? template
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const syncEntriesWithTemplate = (
  entries: KeyValueEntry[],
  templateKeys: string[],
): KeyValueEntry[] => {
  if (!templateKeys.length) {
    return entries.length > 0 ? entries : [createEntry()];
  }

  const valueMap = new Map<string, string>();
  entries.forEach((entry) => {
    const key = entry.key.trim();
    if (key) {
      valueMap.set(key, entry.value);
    }
  });

  const populated = templateKeys.map((key) =>
    createEntry(key, valueMap.get(key) ?? ""),
  );

  entries.forEach((entry) => {
    const trimmedKey = entry.key.trim();
    if (!trimmedKey || templateKeys.includes(trimmedKey)) {
      return;
    }
    populated.push(createEntry(entry.key, entry.value));
  });

  return populated.length > 0 ? populated : [createEntry()];
};

const recordToEntries = (record?: Record<string, string> | null): KeyValueEntry[] => {
  const list = Object.entries(record ?? {});
  if (list.length === 0) {
    return [createEntry()];
  }
  return list.map(([key, value]) => createEntry(key, value));
};

const entriesToRecord = (entries: KeyValueEntry[]): Record<string, string> | undefined => {
  const result: Record<string, string> = {};
  entries.forEach((entry) => {
    const key = entry.key.trim();
    if (!key) {
      return;
    }
    result[key] = entry.value.trim();
  });
  return Object.keys(result).length > 0 ? result : undefined;
};

const getWarnMethodsText = (warnMethod?: Record<string, string> | null) => {
  const entries = Object.entries(warnMethod ?? {});
  if (!entries.length) {
    return "未配置";
  }
  return entries
    .map(([key, value]) => `${key}：${value || "—"}`)
    .join("，");
};

export default function DeviceListPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [queryState, setQueryState] = useState({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    filters: {
      name: "",
      machineCode: "",
      deviceTypeId: null as number | null,
    },
  });
  const [filterForm, setFilterForm] = useState<FilterFormState>({
    name: "",
    machineCode: "",
    deviceTypeId: "all",
  });
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
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [isDeviceTypeLoading, setIsDeviceTypeLoading] = useState(true);
  const [deviceTypeError, setDeviceTypeError] = useState<string | null>(null);

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

  const loadDeviceTypes = useCallback(async () => {
    setIsDeviceTypeLoading(true);
    setDeviceTypeError(null);
    try {
      const result = await pageDeviceTypes({ page: 0, size: 100 });
      setDeviceTypes(result.list);
    } catch (error) {
      const message = error instanceof Error ? error.message : "设备类型加载失败，请稍后再试";
      setDeviceTypeError(message);
      pushNotification({
        type: "error",
        title: "类型加载失败",
        description: message,
      });
    } finally {
      setIsDeviceTypeLoading(false);
    }
  }, [pushNotification]);

  useEffect(() => {
    void loadDeviceTypes();
  }, [loadDeviceTypes]);

  useEffect(() => {
    let ignore = false;
    setIsTableLoading(true);
    setTableError(null);

    const load = async () => {
      try {
        const result = await pageDevices({
          page: queryState.page,
          size: queryState.size,
          query: {
            name: queryState.filters.name || undefined,
            machineCode: queryState.filters.machineCode || undefined,
            deviceTypeId: queryState.filters.deviceTypeId ?? undefined,
          },
        });
        if (ignore) {
          return;
        }
        setDevices(result.list);
        setPagination(result.extra);
        setLastSyncedAt(Date.now());
      } catch (error) {
        if (ignore) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "设备列表加载失败，请稍后再试";
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

  const deviceTypeCoverage = useMemo(() => {
    const typeIds = new Set<number>();
    devices.forEach((device) => typeIds.add(device.deviceType.id));
    return typeIds.size;
  }, [devices]);

  const deviceTypeMap = useMemo(() => {
    const map = new Map<number, DeviceType>();
    deviceTypes.forEach((type) => map.set(type.id, type));
    return map;
  }, [deviceTypes]);

  const lastSyncedText = useMemo(() => {
    if (!lastSyncedAt) {
      return "尚未同步";
    }
    return new Date(lastSyncedAt).toLocaleString();
  }, [lastSyncedAt]);

  const currentTemplateKeys = useMemo(() => {
    if (!drawerState?.deviceTypeId) {
      return [] as string[];
    }
    const type = deviceTypeMap.get(drawerState.deviceTypeId);
    return splitArgTemplate(type?.argTemplate);
  }, [deviceTypeMap, drawerState?.deviceTypeId]);
  const currentTemplateSignature = currentTemplateKeys.join("|");

  useEffect(() => {
    if (!drawerState?.deviceTypeId || !currentTemplateKeys.length) {
      return;
    }
    setDrawerState((prev) => {
      if (!prev || prev.deviceTypeId !== drawerState.deviceTypeId) {
        return prev;
      }
      const synced = syncEntriesWithTemplate(prev.argsEntries, currentTemplateKeys);
      if (areEntriesEqual(prev.argsEntries, synced)) {
        return prev;
      }
      return {
        ...prev,
        argsEntries: synced,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerState?.deviceTypeId, currentTemplateSignature]);

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
      machineCode: "",
      name: "",
      deviceTypeId: null,
      argsEntries: [createEntry()],
      warnEntries: [createEntry("phone", "")],
    });
  };

  const openEditDrawer = (device: Device) => {
    setDrawerError(null);
    setDrawerState({
      mode: "edit",
      id: device.id,
      machineCode: device.machineCode,
      name: device.name,
      deviceTypeId: device.deviceType.id,
      argsEntries: recordToEntries(device.args),
      warnEntries: recordToEntries(device.warnMethod),
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

  const handleDeviceTypeChange = (value: string) => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      const nextTypeId = value === "none" ? null : Number(value);
      const templateKeys = nextTypeId ? splitArgTemplate(deviceTypeMap.get(nextTypeId)?.argTemplate) : [];
      return {
        ...prev,
        deviceTypeId: nextTypeId,
        argsEntries: syncEntriesWithTemplate(prev.argsEntries, templateKeys),
      };
    });
  };

  const updateEntryList = (
    list: KeyValueEntry[],
    entryId: string,
    field: "key" | "value",
    value: string,
  ) => {
    return list.map((entry) => {
      if (entry.id === entryId) {
        return {
          ...entry,
          [field]: value,
        };
      }
      return entry;
    });
  };

  const handleEntryChange = (
    listKey: "argsEntries" | "warnEntries",
    entryId: string,
    field: "key" | "value",
    value: string,
  ) => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        [listKey]: updateEntryList(prev[listKey], entryId, field, value),
      };
    });
  };

  const addEntry = (listKey: "argsEntries" | "warnEntries") => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        [listKey]: [...prev[listKey], createEntry()],
      };
    });
  };

  const removeEntry = (listKey: "argsEntries" | "warnEntries", entryId: string) => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      const nextList = prev[listKey].filter((entry) => entry.id !== entryId);
      return {
        ...prev,
        [listKey]: nextList.length > 0 ? nextList : [createEntry()],
      };
    });
  };

  const handleDrawerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!drawerState) {
      return;
    }
    const trimmedMachineCode = drawerState.machineCode.trim();
    const trimmedName = drawerState.name.trim();

    if (!trimmedMachineCode) {
      setDrawerError("机器码不能为空。");
      return;
    }
    if (!trimmedName) {
      setDrawerError("设备名称不能为空。");
      return;
    }
    if (!drawerState.deviceTypeId) {
      setDrawerError("请选择设备类型。");
      return;
    }

    const argsPayload = entriesToRecord(drawerState.argsEntries);
    const warnPayload = entriesToRecord(drawerState.warnEntries);

    setIsSubmitting(true);
    setDrawerError(null);

    try {
      if (drawerState.mode === "create") {
        await createDevice({
          machineCode: trimmedMachineCode,
          name: trimmedName,
          deviceTypeId: drawerState.deviceTypeId,
          args: argsPayload,
          warnMethod: warnPayload,
        });
        pushNotification({
          type: "success",
          title: "创建成功",
          description: "新设备已加入列表。",
        });
      } else {
        await updateDevice({
          id: drawerState.id!,
          machineCode: trimmedMachineCode,
          name: trimmedName,
          deviceTypeId: drawerState.deviceTypeId,
          args: argsPayload,
          warnMethod: warnPayload,
        });
        pushNotification({
          type: "success",
          title: "更新成功",
          description: "设备信息已保存。",
        });
      }
      closeDrawer();
      refreshTable();
    } catch (error) {
      const message = error instanceof Error ? error.message : "设备保存失败，请稍后再试";
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

  const handleDeleteRequest = (device: Device) => {
    setConfirmState({ id: device.id, name: device.name });
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
      await deleteDevice(confirmState.id);
      pushNotification({
        type: "success",
        title: "删除成功",
        description: `设备「${confirmState.name}」已删除。`,
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
    ? `确定要删除设备「${confirmState.name}」吗？删除后将无法恢复。`
    : "";

  const applyFilters = () => {
    setQueryState((prev) => ({
      ...prev,
      page: 0,
      filters: {
        name: filterForm.name.trim(),
        machineCode: filterForm.machineCode.trim(),
        deviceTypeId:
          filterForm.deviceTypeId === "all" ? null : Number(filterForm.deviceTypeId),
      },
    }));
  };

  const resetFilters = () => {
    setFilterForm({
      name: "",
      machineCode: "",
      deviceTypeId: "all",
    });
    setQueryState((prev) => ({
      ...prev,
      page: 0,
      filters: {
        name: "",
        machineCode: "",
        deviceTypeId: null,
      },
    }));
  };

  const renderArgsBadges = (args?: Record<string, string> | null) => {
    const entries = Object.entries(args ?? {});
    if (!entries.length) {
      return <span className="text-xs text-zinc-400">暂无上报参数</span>;
    }
    return (
      <div className="flex flex-wrap gap-2">
        {entries.map(([key, value]) => (
          <span
            key={key}
            className="rounded-full bg-zinc-50 px-3 py-1 text-xs text-zinc-600 ring-1 ring-zinc-100"
          >
            {key}：{value || "—"}
          </span>
        ))}
      </div>
    );
  };

  const isShellLoading = isTableLoading && devices.length === 0;

  const deviceTypeOptions = useMemo(() => {
    if (!deviceTypes.length && drawerState?.deviceTypeId) {
      // 在类型列表尚未加载成功时，保证当前选中的类型可见
      return [
        {
          id: drawerState.deviceTypeId,
          name: `类型 #${drawerState.deviceTypeId}`,
          description: "",
          argTemplate: "",
        },
      ];
    }
    return deviceTypes;
  }, [deviceTypes, drawerState?.deviceTypeId]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <Search className="size-4" />
            条件筛选
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="filter-name">设备名称</Label>
              <Input
                id="filter-name"
                value={filterForm.name}
                onChange={(event) =>
                  setFilterForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="例如 血压仪"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-machine-code">机器码</Label>
              <Input
                id="filter-machine-code"
                value={filterForm.machineCode}
                onChange={(event) =>
                  setFilterForm((prev) => ({ ...prev, machineCode: event.target.value }))
                }
                placeholder="例如 MC-001"
              />
            </div>
            <div className="space-y-2">
              <Label>设备类型</Label>
              <Select
                value={filterForm.deviceTypeId}
                onValueChange={(value) =>
                  setFilterForm((prev) => ({ ...prev, deviceTypeId: value }))
                }
                disabled={isDeviceTypeLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {deviceTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {deviceTypeError && (
                <p className="text-xs text-amber-600">{deviceTypeError}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              <Search className="size-4" />
              应用筛选
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={resetFilters}>
              重置
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">设备列表</h3>
            <p className="text-sm text-zinc-500">点击表格行即可查看设备详情并进行编辑。</p>
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
              新建设备
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
                <th className="px-4 py-3 font-medium">设备信息</th>
                <th className="px-4 py-3 font-medium">类型</th>
                <th className="px-4 py-3 font-medium">实时参数</th>
                <th className="px-4 py-3 font-medium">预警方式</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isTableLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`device-skeleton-${index}`}>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-48 rounded-xl" />
                        <Skeleton className="mt-2 h-3 w-32 rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-32 rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-full rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-3/4 rounded-xl" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Skeleton className="ml-auto h-8 w-28 rounded-full" />
                      </td>
                    </tr>
                  ))
                : devices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                        暂无设备记录，点击「新建设备」即可开始。
                      </td>
                    </tr>
                  )}

              {!isTableLoading &&
                devices.map((device) => (
                  <tr
                    key={device.id}
                    className="cursor-pointer bg-white transition hover:bg-zinc-50"
                    onClick={() => openEditDrawer(device)}
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-zinc-900">{device.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">ID：{device.id}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        机器码：{device.machineCode}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-zinc-800">{device.deviceType.name}</p>
                      <p className="text-xs text-zinc-400">{device.deviceType.description || "—"}</p>
                    </td>
                    <td className="px-4 py-4">{renderArgsBadges(device.args)}</td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-600">{getWarnMethodsText(device.warnMethod)}</p>
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
                            openEditDrawer(device);
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
                            handleDeleteRequest(device);
                          }}
                          disabled={isConfirmLoading && confirmState?.id === device.id}
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
            共 <span className="font-semibold text-zinc-900">{pagination.total}</span>{" "}
            台设备，每页 {pagination.size} 台。
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
                queryState.page + 1 >= totalPages || isTableLoading || devices.length === 0
              }
            >
              下一页
            </Button>
          </div>
        </div>
      </section>

      <Sheet open={Boolean(drawerState)} onOpenChange={handleDrawerOpenChange}>
        <SheetContent side="right" className="sm:max-w-[72rem] lg:max-w-[90rem]">
          {drawerState && (
            <form className="flex h-full flex-col gap-6" onSubmit={handleDrawerSubmit}>
              <SheetHeader>
                <SheetTitle>
                  {drawerState.mode === "create"
                    ? "新建设备"
                    : `编辑设备：${drawerState.name}`}
                </SheetTitle>
                <SheetDescription>配置设备基础信息、类型、实时参数与预警方式。</SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="device-machine-code-input">机器码</Label>
                    <Input
                      id="device-machine-code-input"
                      value={drawerState.machineCode}
                      onChange={(event) =>
                        setDrawerState((prev) =>
                          prev
                            ? {
                                ...prev,
                                machineCode: event.target.value,
                              }
                            : prev,
                        )
                      }
                      placeholder="例如 MC-20241018"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="device-name-input">设备名称</Label>
                    <Input
                      id="device-name-input"
                      value={drawerState.name}
                      onChange={(event) =>
                        setDrawerState((prev) =>
                          prev
                            ? {
                                ...prev,
                                name: event.target.value,
                              }
                            : prev,
                        )
                      }
                      placeholder="例如 智能血压仪"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>设备类型</Label>
                  <Select
                    value={
                      drawerState.deviceTypeId ? String(drawerState.deviceTypeId) : "none"
                    }
                    onValueChange={handleDeviceTypeChange}
                    disabled={isDeviceTypeLoading && deviceTypes.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择设备类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" disabled>
                        请选择设备类型
                      </SelectItem>
                      {deviceTypeOptions.map((type) => (
                        <SelectItem key={type.id} value={String(type.id)}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {deviceTypeError && (
                    <p className="text-xs text-amber-600">{deviceTypeError}</p>
                  )}
                </div>

                <section className="rounded-2xl border border-dashed border-zinc-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">实时参数</p>
                      <p className="text-xs text-zinc-500">
                        key 应与参数模板的 value 一致，例如 BloodPressure
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => addEntry("argsEntries")}
                    >
                      <Plus className="size-4" />
                      新增参数
                    </Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {drawerState.argsEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="grid gap-3 rounded-2xl border border-zinc-100 p-4 sm:grid-cols-[1fr_1fr_auto]"
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`arg-key-${entry.id}`}>参数 Key</Label>
                          <Input
                            id={`arg-key-${entry.id}`}
                            value={entry.key}
                            onChange={(event) =>
                              handleEntryChange("argsEntries", entry.id, "key", event.target.value)
                            }
                            placeholder="例如 BloodPressure"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`arg-value-${entry.id}`}>参数值</Label>
                          <Input
                            id={`arg-value-${entry.id}`}
                            value={entry.value}
                            onChange={(event) =>
                              handleEntryChange(
                                "argsEntries",
                                entry.id,
                                "value",
                                event.target.value,
                              )
                            }
                            placeholder="例如 120/80"
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-zinc-500 hover:text-rose-500"
                            onClick={() => removeEntry("argsEntries", entry.id)}
                          >
                            <Trash2 className="size-4" />
                            移除
                          </Button>
                        </div>
                        {index === drawerState.argsEntries.length - 1 && (
                          <div className="sm:col-span-3 text-xs text-zinc-400">
                            留空的行不会传给后端。
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-dashed border-zinc-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">预警方式</p>
                      <p className="text-xs text-zinc-500">自由定义 key/value，例如 phone、email。</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => addEntry("warnEntries")}
                    >
                      <Plus className="size-4" />
                      新增方式
                    </Button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {drawerState.warnEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid gap-3 rounded-2xl border border-zinc-100 p-4 sm:grid-cols-[1fr_1fr_auto]"
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`warn-key-${entry.id}`}>方式 Key</Label>
                          <Input
                            id={`warn-key-${entry.id}`}
                            value={entry.key}
                            onChange={(event) =>
                              handleEntryChange("warnEntries", entry.id, "key", event.target.value)
                            }
                            placeholder="例如 phone / email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`warn-value-${entry.id}`}>说明</Label>
                          <Input
                            id={`warn-value-${entry.id}`}
                            value={entry.value}
                            onChange={(event) =>
                              handleEntryChange(
                                "warnEntries",
                                entry.id,
                                "value",
                                event.target.value,
                              )
                            }
                            placeholder="13800000000 / alert@example.com"
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-zinc-500 hover:text-rose-500"
                            onClick={() => removeEntry("warnEntries", entry.id)}
                          >
                            <Trash2 className="size-4" />
                            移除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

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
            <DialogTitle>删除设备</DialogTitle>
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
