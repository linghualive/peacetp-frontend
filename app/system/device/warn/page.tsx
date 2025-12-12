"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Filter,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import {
  createWarn,
  deleteWarn,
  pageWarns,
  updateWarn,
  type Warn,
  type WarnLevel,
  type WarnStatus,
} from "@/app/api/device/warns";
import { pageDevices, type Device } from "@/app/api/device/devices";
import { pageUsers, type UserListItem } from "@/app/api/identity/users";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
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
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { Skeleton } from "@/app/components/ui/skeleton";

type FilterFormState = {
  level: "all" | WarnLevel;
  status: "all" | WarnStatus;
};

type QueryState = {
  page: number;
  size: number;
  level: "all" | WarnLevel;
  status: "all" | WarnStatus;
};

type KeyValueEntry = {
  id: string;
  key: string;
  value: string;
};

type DrawerState =
  | {
      mode: "create";
      deviceId: string;
      level: WarnLevel | "";
      status: WarnStatus | "";
      lastUserId: string;
      warnDescription: string;
      argsEntries: KeyValueEntry[];
    }
  | {
      mode: "edit";
      id: number;
      deviceId: string;
      level: WarnLevel | "";
      status: WarnStatus | "";
      lastUserId: string;
      warnDescription: string;
      argsEntries: KeyValueEntry[];
    }
  | null;

type ConfirmState = {
  id: number;
  description: string;
} | null;

type NotificationItem = {
  id: number;
  type: "success" | "error";
  title: string;
  description: string;
};

const DEFAULT_PAGE_SIZE = 10;
const OPTION_PAGE_SIZE = 100;

const LEVEL_OPTIONS: { value: WarnLevel; label: string }[] = [
  { value: "LOW", label: "低级" },
  { value: "MEDIUM", label: "中级" },
  { value: "HIGH", label: "高级" },
];

const STATUS_OPTIONS: { value: WarnStatus; label: string }[] = [
  { value: "WARNING", label: "告警中" },
  { value: "HANDLED", label: "已处理" },
  { value: "IGNORED", label: "已忽略" },
];

const LEVEL_META: Record<
  WarnLevel,
  {
    label: string;
    className: string;
  }
> = {
  LOW: { label: "低级", className: "bg-emerald-50 text-emerald-700" },
  MEDIUM: { label: "中级", className: "bg-amber-50 text-amber-700" },
  HIGH: { label: "高级", className: "bg-rose-50 text-rose-700" },
};

const STATUS_META: Record<
  WarnStatus,
  {
    label: string;
    className: string;
  }
> = {
  WARNING: { label: "告警中", className: "bg-orange-50 text-orange-700" },
  HANDLED: { label: "已处理", className: "bg-emerald-50 text-emerald-700" },
  IGNORED: { label: "已忽略", className: "bg-zinc-100 text-zinc-600" },
};

const createEntry = (key = "", value = ""): KeyValueEntry => ({
  id: `${Date.now()}-${Math.random()}`,
  key,
  value,
});

const recordToEntries = (record?: Record<string, string> | null): KeyValueEntry[] => {
  const list = Object.entries(record ?? {});
  if (!list.length) {
    return [createEntry()];
  }
  return list.map(([key, value]) => createEntry(key, value));
};

const entriesToRecord = (entries: KeyValueEntry[]): Record<string, string> | undefined => {
  const result: Record<string, string> = {};
  entries.forEach((entry) => {
    const trimmedKey = entry.key.trim();
    if (!trimmedKey) {
      return;
    }
    result[trimmedKey] = entry.value.trim();
  });
  return Object.keys(result).length > 0 ? result : undefined;
};

const syncEntriesWithKeys = (
  entries: KeyValueEntry[],
  keys: string[],
): KeyValueEntry[] => {
  const valueMap = new Map<string, string>();
  entries.forEach((entry) => {
    const trimmedKey = entry.key.trim();
    if (trimmedKey) {
      valueMap.set(trimmedKey, entry.value);
    }
  });
  if (!keys.length) {
    return entries.length ? entries : [createEntry()];
  }
  return keys.map((key) => createEntry(key, valueMap.get(key) ?? ""));
};

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

const renderArgsPreview = (args?: Record<string, string> | null) => {
  const pairs = Object.entries(args ?? {});
  if (!pairs.length) {
    return <span className="text-xs text-zinc-400">暂无快照</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {pairs.slice(0, 4).map(([key, value]) => (
        <span key={key} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
          {key}：{value || "—"}
        </span>
      ))}
      {pairs.length > 4 && (
        <span className="text-xs text-zinc-400">+{pairs.length - 4}</span>
      )}
    </div>
  );
};

export default function DeviceWarnPage() {
  const [warns, setWarns] = useState<Warn[]>([]);
  const [queryState, setQueryState] = useState<QueryState>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    level: "all",
    status: "all",
  });
  const [filterForm, setFilterForm] = useState<FilterFormState>({
    level: "all",
    status: "all",
  });
  const [pagination, setPagination] = useState({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [tableError, setTableError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  const [deviceOptions, setDeviceOptions] = useState<Device[]>([]);
  const [isDeviceOptionsLoading, setIsDeviceOptionsLoading] = useState(true);
  const [deviceOptionsError, setDeviceOptionsError] = useState<string | null>(null);

  const [userOptions, setUserOptions] = useState<UserListItem[]>([]);
  const [isUserOptionsLoading, setIsUserOptionsLoading] = useState(true);
  const [userOptionsError, setUserOptionsError] = useState<string | null>(null);

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
      const timer = window.setTimeout(() => dismissNotification(id), 2400);
      notificationTimers.current[id] = timer;
    },
    [dismissNotification],
  );

  useEffect(
    () => () => {
      Object.values(notificationTimers.current).forEach((timer) => window.clearTimeout(timer));
      notificationTimers.current = {};
    },
    [],
  );

  const loadDeviceOptions = useCallback(async () => {
    setIsDeviceOptionsLoading(true);
    setDeviceOptionsError(null);
    try {
      const result = await pageDevices({ page: 0, size: OPTION_PAGE_SIZE });
      setDeviceOptions(result.list);
    } catch (error) {
      const message = error instanceof Error ? error.message : "设备选项加载失败，请稍后重试";
      setDeviceOptionsError(message);
      pushNotification({
        type: "error",
        title: "设备加载失败",
        description: message,
      });
    } finally {
      setIsDeviceOptionsLoading(false);
    }
  }, [pushNotification]);

  const loadUserOptions = useCallback(async () => {
    setIsUserOptionsLoading(true);
    setUserOptionsError(null);
    try {
      const result = await pageUsers({ page: 0, size: OPTION_PAGE_SIZE });
      setUserOptions(result.list);
    } catch (error) {
      const message = error instanceof Error ? error.message : "用户选项加载失败，请稍后重试";
      setUserOptionsError(message);
      pushNotification({
        type: "error",
        title: "用户加载失败",
        description: message,
      });
    } finally {
      setIsUserOptionsLoading(false);
    }
  }, [pushNotification]);

  useEffect(() => {
    void loadDeviceOptions();
    void loadUserOptions();
  }, [loadDeviceOptions, loadUserOptions]);

  useEffect(() => {
    let ignore = false;
    setIsTableLoading(true);
    setTableError(null);

    const load = async () => {
      try {
        const query: Record<string, WarnLevel | WarnStatus> = {};
        if (queryState.level !== "all") {
          query.level = queryState.level;
        }
        if (queryState.status !== "all") {
          query.status = queryState.status;
        }
        const payload = {
          page: queryState.page,
          size: queryState.size,
          ...(Object.keys(query).length ? { query } : {}),
        };
        const result = await pageWarns(payload);
        if (ignore) {
          return;
        }
        setWarns(result.list);
        setPagination(result.extra);
        setLastSyncedAt(Date.now());
      } catch (error) {
        if (ignore) {
          return;
        }
        const message = error instanceof Error ? error.message : "预警列表加载失败，请稍后再试";
        setTableError(message);
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
  }, [queryState, reloadKey]);

  const totalPages = useMemo(() => {
    if (!pagination.total) {
      return 1;
    }
    return Math.max(1, Math.ceil(pagination.total / pagination.size));
  }, [pagination.size, pagination.total]);

  const summary = useMemo(() => {
    const highLevel = warns.filter((warn) => warn.level === "HIGH").length;
    const pending = warns.filter((warn) => warn.status === "WARNING").length;
    return {
      total: pagination.total,
      highLevel,
      pending,
    };
  }, [warns, pagination.total]);

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQueryState((prev) => ({
      ...prev,
      page: 0,
      level: filterForm.level,
      status: filterForm.status,
    }));
  };

  const handleResetFilters = () => {
    setFilterForm({ level: "all", status: "all" });
    setQueryState((prev) => ({
      ...prev,
      page: 0,
      level: "all",
      status: "all",
    }));
  };

  const handlePageChange = (direction: "prev" | "next") => {
    setQueryState((prev) => {
      const nextPage =
        direction === "prev" ? Math.max(0, prev.page - 1) : prev.page + 1;
      return { ...prev, page: nextPage };
    });
  };

  const refreshTable = () => {
    setReloadKey((prev) => prev + 1);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open) {
      setDrawerState(null);
      setDrawerError(null);
      setIsSubmitting(false);
    }
  };

  const openCreateDrawer = () => {
    setDrawerState({
      mode: "create",
      deviceId: "",
      level: "",
      status: "WARNING",
      lastUserId: "",
      warnDescription: "",
      argsEntries: [createEntry()],
    });
    setDrawerError(null);
  };

  const openEditDrawer = (warn: Warn) => {
    setDrawerState({
      mode: "edit",
      id: warn.id,
      deviceId: String(warn.deviceId),
      level: warn.level,
      status: warn.status,
      lastUserId: String(warn.lastUserId),
      warnDescription: warn.warnDescription,
      argsEntries: recordToEntries(warn.argsSnapshot),
    });
    setDrawerError(null);
  };

  const handleAddEntry = () => {
    setDrawerState((prev) =>
      prev
        ? {
            ...prev,
            argsEntries: [...prev.argsEntries, createEntry()],
          }
        : prev,
    );
  };

  const handleEntryChange = (
    entryId: string,
    field: "key" | "value",
    value: string,
  ) => {
    setDrawerState((prev) =>
      prev
        ? {
            ...prev,
            argsEntries: prev.argsEntries.map((entry) =>
              entry.id === entryId ? { ...entry, [field]: value } : entry,
            ),
          }
        : prev,
    );
  };

  const handleRemoveEntry = (entryId: string) => {
    setDrawerState((prev) =>
      prev
        ? {
            ...prev,
            argsEntries:
              prev.argsEntries.length === 1
                ? [createEntry()]
                : prev.argsEntries.filter((entry) => entry.id !== entryId),
          }
        : prev,
    );
  };

  const handleDrawerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!drawerState) {
      return;
    }
    if (
      !drawerState.deviceId ||
      !drawerState.level ||
      !drawerState.status ||
      !drawerState.lastUserId ||
      !drawerState.warnDescription.trim()
    ) {
      setDrawerError("请完整填写设备、等级、状态、处理人和描述信息。");
      return;
    }

    const deviceId = Number(drawerState.deviceId);
    const lastUserId = Number(drawerState.lastUserId);
    if (!Number.isInteger(deviceId) || !Number.isInteger(lastUserId)) {
      setDrawerError("请选择有效的设备和处理人。");
      return;
    }

    const argsSnapshot = entriesToRecord(drawerState.argsEntries);

    setIsSubmitting(true);
    setDrawerError(null);

    try {
      if (drawerState.mode === "create") {
        await createWarn({
          deviceId,
          level: drawerState.level,
          status: drawerState.status,
          lastUserId,
          warnDescription: drawerState.warnDescription.trim(),
          ...(argsSnapshot ? { argsSnapshot } : {}),
        });
        pushNotification({
          type: "success",
          title: "创建成功",
          description: "已记录新的设备预警。",
        });
      } else {
        await updateWarn({
          id: drawerState.id,
          deviceId,
          level: drawerState.level,
          status: drawerState.status,
          lastUserId,
          warnDescription: drawerState.warnDescription.trim(),
          ...(argsSnapshot ? { argsSnapshot } : {}),
        });
        pushNotification({
          type: "success",
          title: "更新成功",
          description: "预警信息已更新。",
        });
      }
      setDrawerState(null);
      refreshTable();
    } catch (error) {
      const message = error instanceof Error ? error.message : "提交失败，请稍后再试";
      setDrawerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openConfirmDelete = (warn: Warn) => {
    setConfirmState({
      id: warn.id,
      description: warn.warnDescription,
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmState) {
      return;
    }
    setIsConfirmLoading(true);
    try {
      await deleteWarn(confirmState.id);
      pushNotification({
        type: "success",
        title: "删除成功",
        description: "预警记录已删除。",
      });
      setConfirmState(null);
      refreshTable();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败，请稍后再试";
      pushNotification({
        type: "error",
        title: "删除失败",
        description: message,
      });
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleMarkHandled = async (warn: Warn) => {
    if (warn.status === "HANDLED") {
      return;
    }
    setStatusUpdatingId(warn.id);
    try {
      await updateWarn({
        id: warn.id,
        deviceId: warn.deviceId,
        level: warn.level,
        status: "HANDLED",
        lastUserId: warn.lastUserId,
        warnDescription: warn.warnDescription,
        ...(warn.argsSnapshot ? { argsSnapshot: warn.argsSnapshot } : {}),
      });
      pushNotification({
        type: "success",
        title: "已标记处理",
        description: `预警 #${warn.id} 已标记为处理完成。`,
      });
      refreshTable();
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新失败，请稍后再试";
      pushNotification({
        type: "error",
        title: "标记失败",
        description: message,
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const deviceDetailMap = useMemo(() => {
    const map = new Map<number, Device>();
    deviceOptions.forEach((device) => map.set(device.id, device));
    return map;
  }, [deviceOptions]);

  const deviceNameMap = useMemo(() => {
    const map = new Map<number, string>();
    deviceOptions.forEach((device) => map.set(device.id, device.name));
    return map;
  }, [deviceOptions]);

  const getArgsKeysForDevice = useCallback(
    (deviceId: number): string[] => {
      const device = deviceDetailMap.get(deviceId);
      if (!device) {
        return [];
      }
      const argsKeys = Object.keys(device.args ?? {}).filter(Boolean);
      if (argsKeys.length > 0) {
        return argsKeys;
      }
      return splitArgTemplate(device.deviceType.argTemplate);
    },
    [deviceDetailMap],
  );

  const currentDeviceArgsKeys = useMemo(() => {
    if (!drawerState?.deviceId) {
      return [];
    }
    const deviceId = Number(drawerState.deviceId);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return [];
    }
    return getArgsKeysForDevice(deviceId);
  }, [drawerState?.deviceId, getArgsKeysForDevice]);

  const isArgsStructureLocked = currentDeviceArgsKeys.length > 0;

  const userNameMap = useMemo(() => {
    const map = new Map<number, string>();
    userOptions.forEach((user) => map.set(user.id, user.name));
    return map;
  }, [userOptions]);

  useEffect(() => {
    if (!drawerState?.deviceId) {
      return;
    }
    const deviceId = Number(drawerState.deviceId);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return;
    }
    const keys = getArgsKeysForDevice(deviceId);
    if (!keys.length) {
      return;
    }
    setDrawerState((prev) => {
      if (!prev || Number(prev.deviceId) !== deviceId) {
        return prev;
      }
      const nextEntries = syncEntriesWithKeys(prev.argsEntries, keys);
      if (areEntriesEqual(prev.argsEntries, nextEntries)) {
        return prev;
      }
      return { ...prev, argsEntries: nextEntries };
    });
  }, [drawerState?.deviceId, getArgsKeysForDevice]);

  const handleDrawerDeviceChange = useCallback(
    (value: string) => {
      setDrawerState((prev) => {
        if (!prev) {
          return prev;
        }
        const deviceId = Number(value);
        const keys =
          Number.isInteger(deviceId) && deviceId > 0
            ? getArgsKeysForDevice(deviceId)
            : [];
        const nextEntries =
          keys.length > 0
            ? syncEntriesWithKeys(prev.argsEntries, keys)
            : prev.argsEntries.length
              ? prev.argsEntries
              : [createEntry()];
        return {
          ...prev,
          deviceId: value,
          argsEntries: nextEntries,
        };
      });
    },
    [getArgsKeysForDevice],
  );

  const getDeviceLabel = (deviceId: number) =>
    deviceNameMap.get(deviceId) ?? `设备 #${deviceId}`;
  const getUserLabel = (userId: number) => userNameMap.get(userId) ?? `用户 #${userId}`;

  const isTableSkeletonVisible = isTableLoading && warns.length === 0;

  const handleConfirmDialogChange = (open: boolean) => {
    if (!open) {
      setConfirmState(null);
      setIsConfirmLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={refreshTable}
              disabled={isTableLoading}
            >
              <RefreshCw className="size-4" />
              列表刷新
            </Button>
            <Button type="button" size="sm" onClick={openCreateDrawer}>
              <Plus className="size-4" />
              新建预警
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Card className="border border-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
                <BellRing className="size-4 text-primary" />
                预警总数
              </CardTitle>
              <CardDescription>累计记录的预警数量</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-zinc-900">{summary.total}</p>
            </CardContent>
          </Card>
          <Card className="border border-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
                <AlertTriangle className="size-4 text-rose-500" />
                高级预警
              </CardTitle>
              <CardDescription>当前页内的高级告警数量</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-zinc-900">{summary.highLevel}</p>
            </CardContent>
          </Card>
          <Card className="border border-white/70">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-zinc-500">
                <Filter className="size-4 text-amber-500" />
                处理中
              </CardTitle>
              <CardDescription>当前仍处于告警状态的条数</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-zinc-900">{summary.pending}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm" aria-busy={isTableLoading}>
        <form
          className="mb-6 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
          onSubmit={handleFilterSubmit}
        >
          <div className="space-y-2">
            <Label>预警等级</Label>
            <Select
              value={filterForm.level}
              onValueChange={(value) =>
                setFilterForm((prev) => ({
                  ...prev,
                  level: value as FilterFormState["level"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全部等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部等级</SelectItem>
                {LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>预警状态</Label>
            <Select
              value={filterForm.status}
              onValueChange={(value) =>
                setFilterForm((prev) => ({
                  ...prev,
                  status: value as FilterFormState["status"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>最近同步时间</Label>
            <p className="rounded-2xl border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "尚未同步"}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full lg:w-auto">
              <Filter className="size-4" />
              条件查询
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full lg:w-auto"
              onClick={handleResetFilters}
            >
              重置
            </Button>
          </div>
        </form>

        {tableError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>加载失败</AlertTitle>
            <AlertDescription>{tableError}</AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-2xl border border-zinc-100">
          <table className="min-w-full divide-y divide-zinc-100 text-left text-sm">
            <thead className="bg-zinc-50/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">预警信息</th>
                <th className="px-4 py-3 font-medium">关联设备</th>
                <th className="px-4 py-3 font-medium">处理人</th>
                <th className="px-4 py-3 font-medium">参数快照</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isTableSkeletonVisible &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`warn-skeleton-${index}`}>
                    <td className="px-4 py-4">
                      <Skeleton className="h-4 w-44 rounded-xl" />
                      <Skeleton className="mt-2 h-3 w-64 rounded-xl" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-4 w-32 rounded-xl" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-4 w-24 rounded-xl" />
                    </td>
                    <td className="px-4 py-4">
                      <Skeleton className="h-4 w-40 rounded-xl" />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Skeleton className="ml-auto h-8 w-24 rounded-full" />
                    </td>
                  </tr>
                ))}

              {!isTableLoading && warns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    暂无预警数据，点击右上角「新建预警」即可录入。
                  </td>
                </tr>
              )}

              {!isTableLoading &&
                warns.map((warn) => (
                  <tr key={warn.id} className="bg-white">
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-400">
                          #{warn.id}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${LEVEL_META[warn.level].className}`}
                        >
                          {LEVEL_META[warn.level].label}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_META[warn.status].className}`}
                        >
                          {STATUS_META[warn.status].label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-700">{warn.warnDescription}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-zinc-900">{getDeviceLabel(warn.deviceId)}</p>
                      <p className="text-xs text-zinc-500">ID：{warn.deviceId}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-zinc-900">{getUserLabel(warn.lastUserId)}</p>
                      <p className="text-xs text-zinc-500">ID：{warn.lastUserId}</p>
                    </td>
                    <td className="px-4 py-4 align-top">{renderArgsPreview(warn.argsSnapshot)}</td>
                    <td className="px-4 py-4 text-right align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        {warn.status !== "HANDLED" && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMarkHandled(warn)}
                            disabled={statusUpdatingId === warn.id}
                          >
                            <CheckCircle2 className="size-4" />
                            标记处理
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDrawer(warn)}
                        >
                          <PencilLine className="size-4" />
                          编辑
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => openConfirmDelete(warn)}
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            共 {pagination.total} 条，当前第 {queryState.page + 1} / {totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange("prev")}
              disabled={queryState.page === 0 || isTableLoading}
            >
              上一页
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handlePageChange("next")}
              disabled={
                queryState.page + 1 >= totalPages || isTableLoading || warns.length === 0
              }
            >
              下一页
            </Button>
          </div>
        </div>
      </section>

      <Sheet open={Boolean(drawerState)} onOpenChange={handleDrawerOpenChange}>
        <SheetContent side="right" className="sm:max-w-[36rem]">
          {drawerState && (
            <form className="flex h-full flex-col gap-6" onSubmit={handleDrawerSubmit}>
              <SheetHeader>
                <SheetTitle>
                  {drawerState.mode === "create" ? "新建设备预警" : `编辑预警 #${drawerState.id}`}
                </SheetTitle>
                <SheetDescription>补充设备、预警等级及处理结果等信息。</SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label>关联设备</Label>
                  <Select
                    value={drawerState.deviceId}
                    onValueChange={handleDrawerDeviceChange}
                    disabled={isDeviceOptionsLoading && deviceOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择设备" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceOptions.map((device) => (
                        <SelectItem key={device.id} value={String(device.id)}>
                          {device.name}（ID:{device.id}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {deviceOptionsError && (
                    <p className="text-xs text-amber-600">{deviceOptionsError}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>预警等级</Label>
                    <Select
                      value={drawerState.level || ""}
                      onValueChange={(value) =>
                        setDrawerState((prev) =>
                          prev ? { ...prev, level: value as WarnLevel } : prev,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择等级" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>预警状态</Label>
                    <Select
                      value={drawerState.status || ""}
                      onValueChange={(value) =>
                        setDrawerState((prev) =>
                          prev ? { ...prev, status: value as WarnStatus } : prev,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="请选择状态" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>最后处理人</Label>
                  <Select
                    value={drawerState.lastUserId}
                    onValueChange={(value) =>
                      setDrawerState((prev) => (prev ? { ...prev, lastUserId: value } : prev))
                    }
                    disabled={isUserOptionsLoading && userOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择用户" />
                    </SelectTrigger>
                    <SelectContent>
                      {userOptions.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name}（ID:{user.id}）
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {userOptionsError && (
                    <p className="text-xs text-amber-600">{userOptionsError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warn-description-input">预警描述</Label>
                  <textarea
                    id="warn-description-input"
                    className="min-h-32 w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/60"
                    value={drawerState.warnDescription}
                    onChange={(event) =>
                      setDrawerState((prev) =>
                        prev ? { ...prev, warnDescription: event.target.value } : prev,
                      )
                    }
                    placeholder="描述预警发生背景、触发指标、建议操作等信息。"
                  />
                </div>

                <section className="rounded-2xl border border-dashed border-zinc-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">参数快照</p>
                      <p className="text-xs text-zinc-500">
                        {isArgsStructureLocked
                          ? "参数名根据所选设备的实时参数自动填充，仅需录入当时的数值。"
                          : drawerState.deviceId
                            ? "该设备暂未提供参数模板，可手动录入 key/value。"
                            : "请选择设备以自动载入参数 key。"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAddEntry}
                      disabled={isArgsStructureLocked}
                    >
                      <Plus className="size-4" />
                      新增字段
                    </Button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {!drawerState.deviceId && (
                      <p className="text-sm text-zinc-500">
                        请选择设备后系统会自动载入对应的参数列表。
                      </p>
                    )}
                    {drawerState.deviceId && !isArgsStructureLocked && drawerState.argsEntries.length === 0 && (
                      <p className="text-sm text-zinc-500">
                        当前设备暂无参数模板，可使用上方按钮手动添加字段。
                      </p>
                    )}
                    {drawerState.argsEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid gap-3 rounded-2xl border border-zinc-100 p-4 sm:grid-cols-[1fr_1fr_auto]"
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`key-${entry.id}`}>参数名</Label>
                          <Input
                            id={`key-${entry.id}`}
                            value={entry.key}
                            readOnly={isArgsStructureLocked}
                            aria-readonly={isArgsStructureLocked}
                            onChange={(event) =>
                              handleEntryChange(entry.id, "key", event.target.value)
                            }
                            placeholder="例如 BloodPressure"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`value-${entry.id}`}>参数值</Label>
                          <Input
                            id={`value-${entry.id}`}
                            value={entry.value}
                            onChange={(event) =>
                              handleEntryChange(entry.id, "value", event.target.value)
                            }
                            placeholder="例如 170/110"
                          />
                        </div>
                        {!isArgsStructureLocked && (
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-zinc-500 hover:text-zinc-900"
                              onClick={() => handleRemoveEntry(entry.id)}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {drawerError && (
                  <Alert variant="destructive">
                    <AlertTitle>无法提交</AlertTitle>
                    <AlertDescription>{drawerError}</AlertDescription>
                  </Alert>
                )}
              </div>

              <SheetFooter className="gap-3 sm:gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDrawerState(null)}
                  disabled={isSubmitting}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  保存
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(confirmState)} onOpenChange={handleConfirmDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除预警</DialogTitle>
            {confirmState && (
              <DialogDescription>
                确认删除这条预警记录吗？「{confirmState.description}」
              </DialogDescription>
            )}
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
