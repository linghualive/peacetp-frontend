"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Link2, Loader2, RefreshCw, Users, X } from "lucide-react";

import {
  bindUserDevice,
  listDevicesByUser,
  listUsersByDevice,
  pageUserDeviceBindings,
  unbindUserDevice,
  type BindingPageItem,
  type DeviceDetail,
  type UserSummary,
} from "@/app/api/device/user-devices";
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
  userId: string;
  deviceId: string;
};

type QueryState = {
  page: number;
  size: number;
  userId: number | null;
  deviceId: number | null;
};

type NotificationItem = {
  id: number;
  type: "success" | "error";
  title: string;
  description: string;
};

type ConfirmState = {
  id: number;
  userId: number;
  userName: string;
  deviceId: number;
  deviceName: string;
} | null;

const DEFAULT_PAGE_SIZE = 10;
const OPTION_PAGE_SIZE = 100;

const parsePositiveId = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const renderKeyValueBadges = (record?: Record<string, string> | null) => {
  const entries = Object.entries(record ?? {});
  if (!entries.length) {
    return <p className="text-xs text-zinc-400">未配置</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600"
        >
          {key}：{value || "—"}
        </span>
      ))}
    </div>
  );
};

export default function DeviceUserBindingPage() {
  const [bindings, setBindings] = useState<BindingPageItem[]>([]);
  const [queryState, setQueryState] = useState<QueryState>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    userId: null,
    deviceId: null,
  });
  const [filterForm, setFilterForm] = useState<FilterFormState>({
    userId: "",
    deviceId: "",
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
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationTimers = useRef<Record<number, number>>({});

  const [userOptions, setUserOptions] = useState<UserListItem[]>([]);
  const [isUserOptionsLoading, setIsUserOptionsLoading] = useState(true);
  const [userOptionsError, setUserOptionsError] = useState<string | null>(null);

  const [deviceOptions, setDeviceOptions] = useState<Device[]>([]);
  const [isDeviceOptionsLoading, setIsDeviceOptionsLoading] = useState(true);
  const [deviceOptionsError, setDeviceOptionsError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userDevices, setUserDevices] = useState<DeviceDetail[]>([]);
  const [isUserDevicesLoading, setIsUserDevicesLoading] = useState(false);
  const [userDevicesError, setUserDevicesError] = useState<string | null>(null);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [deviceUsers, setDeviceUsers] = useState<UserSummary[]>([]);
  const [isDeviceUsersLoading, setIsDeviceUsersLoading] = useState(false);
  const [deviceUsersError, setDeviceUsersError] = useState<string | null>(null);

  const [isBindSheetOpen, setIsBindSheetOpen] = useState(false);
  const [bindForm, setBindForm] = useState({ userId: "", deviceId: "" });
  const [bindError, setBindError] = useState<string | null>(null);
  const [isBinding, setIsBinding] = useState(false);

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
      Object.values(notificationTimers.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
      notificationTimers.current = {};
    },
    [],
  );

  const loadUserOptions = useCallback(async () => {
    setIsUserOptionsLoading(true);
    setUserOptionsError(null);
    try {
      const result = await pageUsers({ page: 0, size: OPTION_PAGE_SIZE });
      setUserOptions(result.list);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "用户选项加载失败，请稍后重试";
      setUserOptionsError(message);
      pushNotification({
        type: "error",
        title: "用户列表加载失败",
        description: message,
      });
    } finally {
      setIsUserOptionsLoading(false);
    }
  }, [pushNotification]);

  const loadDeviceOptions = useCallback(async () => {
    setIsDeviceOptionsLoading(true);
    setDeviceOptionsError(null);
    try {
      const result = await pageDevices({ page: 0, size: OPTION_PAGE_SIZE });
      setDeviceOptions(result.list);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "设备选项加载失败，请稍后重试";
      setDeviceOptionsError(message);
      pushNotification({
        type: "error",
        title: "设备列表加载失败",
        description: message,
      });
    } finally {
      setIsDeviceOptionsLoading(false);
    }
  }, [pushNotification]);

  useEffect(() => {
    void loadUserOptions();
    void loadDeviceOptions();
  }, [loadUserOptions, loadDeviceOptions]);

  useEffect(() => {
    let ignore = false;
    setIsTableLoading(true);
    setTableError(null);

    const load = async () => {
      try {
        const query: Record<string, number> = {};
        if (queryState.userId) {
          query.userId = queryState.userId;
        }
        if (queryState.deviceId) {
          query.deviceId = queryState.deviceId;
        }
        const payload = {
          page: queryState.page,
          size: queryState.size,
          ...(Object.keys(query).length > 0 ? { query } : {}),
        };
        const result = await pageUserDeviceBindings(payload);
        if (ignore) {
          return;
        }
        setBindings(result.list);
        setPagination(result.extra);
        setLastSyncedAt(Date.now());
      } catch (error) {
        if (ignore) {
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "绑定关系加载失败，请稍后重试";
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

  const selectedUser = useMemo(
    () => userOptions.find((user) => String(user.id) === selectedUserId) ?? null,
    [selectedUserId, userOptions],
  );

  const selectedDevice = useMemo(
    () => deviceOptions.find((device) => String(device.id) === selectedDeviceId) ?? null,
    [selectedDeviceId, deviceOptions],
  );

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextUserId = parsePositiveId(filterForm.userId);
    const nextDeviceId = parsePositiveId(filterForm.deviceId);

    setQueryState((prev) => ({
      ...prev,
      page: 0,
      userId: nextUserId,
      deviceId: nextDeviceId,
    }));
  };

  const handleResetFilters = () => {
    setFilterForm({ userId: "", deviceId: "" });
    setQueryState((prev) => ({
      ...prev,
      page: 0,
      userId: null,
      deviceId: null,
    }));
  };

  const handlePageChange = (direction: "prev" | "next") => {
    setQueryState((prev) => {
      const nextPage =
        direction === "prev" ? Math.max(0, prev.page - 1) : prev.page + 1;
      return { ...prev, page: nextPage };
    });
  };

  const refreshBindings = () => {
    setReloadKey((prev) => prev + 1);
  };

  const loadDevicesForUser = useCallback(
    async (userId: number) => {
      setIsUserDevicesLoading(true);
      setUserDevicesError(null);
      try {
        const result = await listDevicesByUser(userId);
        setUserDevices(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "设备列表获取失败，请稍后重试";
        setUserDevicesError(message);
        setUserDevices([]);
      } finally {
        setIsUserDevicesLoading(false);
      }
    },
    [],
  );

  const loadUsersForDevice = useCallback(
    async (deviceId: number) => {
      setIsDeviceUsersLoading(true);
      setDeviceUsersError(null);
      try {
        const result = await listUsersByDevice(deviceId);
        setDeviceUsers(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "用户列表获取失败，请稍后重试";
        setDeviceUsersError(message);
        setDeviceUsers([]);
      } finally {
        setIsDeviceUsersLoading(false);
      }
    },
    [],
  );

  const handleUserSelect = (value: string) => {
    setSelectedUserId(value);
    const parsed = parsePositiveId(value);
    if (parsed) {
      void loadDevicesForUser(parsed);
    } else {
      setUserDevices([]);
      setUserDevicesError(null);
    }
  };

  const handleDeviceSelect = (value: string) => {
    setSelectedDeviceId(value);
    const parsed = parsePositiveId(value);
    if (parsed) {
      void loadUsersForDevice(parsed);
    } else {
      setDeviceUsers([]);
      setDeviceUsersError(null);
    }
  };

  const handleBindSheetOpenChange = (open: boolean) => {
    setIsBindSheetOpen(open);
    if (!open) {
      setBindForm({ userId: "", deviceId: "" });
      setBindError(null);
      setIsBinding(false);
    }
  };

  const handleBindSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = parsePositiveId(bindForm.userId);
    const deviceId = parsePositiveId(bindForm.deviceId);

    if (!userId || !deviceId) {
      setBindError("请选择有效的用户与设备");
      return;
    }

    setIsBinding(true);
    setBindError(null);
    try {
      const { msg } = await bindUserDevice({ userId, deviceId });
      pushNotification({
        type: "success",
        title: "绑定成功",
        description: msg,
      });
      handleBindSheetOpenChange(false);
      refreshBindings();
      if (parsePositiveId(selectedUserId) === userId) {
        void loadDevicesForUser(userId);
      }
      if (parsePositiveId(selectedDeviceId) === deviceId) {
        void loadUsersForDevice(deviceId);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "绑定失败，请稍后再试";
      setBindError(message);
    } finally {
      setIsBinding(false);
    }
  };

  const openConfirmDialog = (binding: BindingPageItem) => {
    setConfirmState({
      id: binding.id,
      userId: binding.user.id,
      userName: binding.user.name,
      deviceId: binding.device.id,
      deviceName: binding.device.name,
    });
  };

  const handleUnbindConfirm = async () => {
    if (!confirmState) {
      return;
    }
    setIsConfirmLoading(true);
    try {
      const { msg } = await unbindUserDevice(confirmState.id);
      pushNotification({
        type: "success",
        title: "解绑成功",
        description: msg,
      });
      setConfirmState(null);
      refreshBindings();
      if (parsePositiveId(selectedUserId) === confirmState.userId) {
        void loadDevicesForUser(confirmState.userId);
      }
      if (parsePositiveId(selectedDeviceId) === confirmState.deviceId) {
        void loadUsersForDevice(confirmState.deviceId);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "解绑失败，请稍后再试";
      pushNotification({
        type: "error",
        title: "解绑失败",
        description: message,
      });
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleCloseConfirm = (open: boolean) => {
    if (!open) {
      setConfirmState(null);
      setIsConfirmLoading(false);
    }
  };

  const renderTableSkeleton = () =>
    Array.from({ length: 5 }).map((_, index) => (
      <tr key={`binding-skeleton-${index}`}>
        <td className="px-4 py-4">
          <Skeleton className="h-4 w-36 rounded-xl" />
          <Skeleton className="mt-2 h-3 w-24 rounded-xl" />
        </td>
        <td className="px-4 py-4">
          <Skeleton className="h-4 w-48 rounded-xl" />
          <Skeleton className="mt-2 h-3 w-32 rounded-xl" />
        </td>
        <td className="px-4 py-4">
          <Skeleton className="h-4 w-48 rounded-xl" />
          <Skeleton className="mt-2 h-3 w-32 rounded-xl" />
        </td>
        <td className="px-4 py-4 text-right">
          <Skeleton className="ml-auto h-8 w-24 rounded-full" />
        </td>
      </tr>
    ));

  const isTableSkeletonVisible = isTableLoading && bindings.length === 0;

  const bindingSummary = useMemo(() => {
    const total = pagination.total;
    const uniqueUsers = new Set(bindings.map((item) => item.user.id));
    const uniqueDevices = new Set(bindings.map((item) => item.device.id));
    return {
      total,
      uniqueUsers: uniqueUsers.size,
      uniqueDevices: uniqueDevices.size,
    };
  }, [bindings, pagination.total]);

  const renderUserDevicesContent = () => {
    if (!selectedUserId) {
      return (
        <p className="text-sm text-zinc-500">
          请选择用户后即可拉取其绑定的设备详情。
        </p>
      );
    }
    if (isUserDevicesLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`user-device-skeleton-${index}`}
              className="rounded-2xl border border-zinc-100 p-4"
            >
              <Skeleton className="h-4 w-48 rounded-xl" />
              <Skeleton className="mt-2 h-3 w-32 rounded-xl" />
              <Skeleton className="mt-4 h-3 w-full rounded-xl" />
            </div>
          ))}
        </div>
      );
    }
    if (userDevicesError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{userDevicesError}</AlertDescription>
        </Alert>
      );
    }
    if (userDevices.length === 0) {
      return (
        <p className="text-sm text-zinc-500">该用户尚未绑定任何设备。</p>
      );
    }
    return (
      <div className="space-y-3">
        {userDevices.map((device) => (
          <div
            key={device.id}
            className="rounded-2xl border border-zinc-100 p-4 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.6)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-zinc-900">{device.name}</p>
                <p className="text-xs text-zinc-500">
                  机器码：{device.machineCode || "—"}
                </p>
              </div>
              <span className="text-xs text-zinc-400">ID：{device.id}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              类型：{device.deviceType.name}
            </p>
            <div className="mt-3 space-y-2 text-sm text-zinc-600">
              <div>
                <p className="text-xs text-zinc-400">实时参数</p>
                {renderKeyValueBadges(device.args)}
              </div>
              <div>
                <p className="text-xs text-zinc-400">预警方式</p>
                {renderKeyValueBadges(device.warnMethod)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDeviceUsersContent = () => {
    if (!selectedDeviceId) {
      return <p className="text-sm text-zinc-500">请选择设备以查看绑定的用户。</p>;
    }
    if (isDeviceUsersLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`device-user-skeleton-${index}`}
              className="rounded-2xl border border-zinc-100 p-4"
            >
              <Skeleton className="h-4 w-40 rounded-xl" />
              <Skeleton className="mt-2 h-3 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      );
    }
    if (deviceUsersError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>{deviceUsersError}</AlertDescription>
        </Alert>
      );
    }
    if (deviceUsers.length === 0) {
      return <p className="text-sm text-zinc-500">该设备尚未绑定任何用户。</p>;
    }
    return (
      <div className="space-y-3">
        {deviceUsers.map((user) => (
          <div
            key={user.id}
            className="rounded-2xl border border-zinc-100 p-4 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.6)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-zinc-900">{user.name}</p>
                <p className="text-xs text-zinc-500">手机号：{user.phone || "—"}</p>
              </div>
              <span className="text-xs text-zinc-400">ID：{user.id}</span>
            </div>
          </div>
        ))}
      </div>
    );
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
              onClick={refreshBindings}
              disabled={isTableLoading}
            >
              <RefreshCw className="size-4" />
              列表刷新
            </Button>
            <Button type="button" size="sm" onClick={() => setIsBindSheetOpen(true)}>
              <Link2 className="size-4" />
              新建绑定
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-100 p-4">
            <p className="text-xs text-zinc-500">当前绑定总数</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {bindingSummary.total}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-100 p-4">
            <p className="text-xs text-zinc-500">涉及用户</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {bindingSummary.uniqueUsers}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-100 p-4">
            <p className="text-xs text-zinc-500">涉及设备</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {bindingSummary.uniqueDevices}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm" aria-busy={isTableLoading}>
        <form
          className="mb-6 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
          onSubmit={handleFilterSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="filter-user-id">用户 ID</Label>
            <Input
              id="filter-user-id"
              inputMode="numeric"
              placeholder="例如 12"
              value={filterForm.userId}
              onChange={(event) =>
                setFilterForm((prev) => ({ ...prev, userId: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-device-id">设备 ID</Label>
            <Input
              id="filter-device-id"
              inputMode="numeric"
              placeholder="例如 8"
              value={filterForm.deviceId}
              onChange={(event) =>
                setFilterForm((prev) => ({ ...prev, deviceId: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>最近同步时间</Label>
            <p className="rounded-2xl border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-500">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "尚未同步"}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full lg:w-auto">
              <Users className="size-4" />
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
            <AlertTitle>绑定列表拉取失败</AlertTitle>
            <AlertDescription>{tableError}</AlertDescription>
          </Alert>
        )}

        <div className="overflow-hidden rounded-2xl border border-zinc-100">
          <table className="min-w-full divide-y divide-zinc-100 text-left text-sm">
            <thead className="bg-zinc-50/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">绑定信息</th>
                <th className="px-4 py-3 font-medium">用户信息</th>
                <th className="px-4 py-3 font-medium">设备信息</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isTableSkeletonVisible &&
                renderTableSkeleton()}
              {!isTableLoading && bindings.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-zinc-500"
                  >
                    暂无绑定数据，点击右上角「新建绑定」即可添加。
                  </td>
                </tr>
              )}
              {!isTableLoading &&
                bindings.map((binding) => (
                  <tr key={binding.id} className="bg-white">
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-zinc-900">ID：{binding.id}</p>
                      <p className="text-xs text-zinc-500">
                        用户 #{binding.user.id} ⇄ 设备 #{binding.device.id}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-zinc-900">{binding.user.name}</p>
                      <p className="text-xs text-zinc-500">
                        电话：{binding.user.phone || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-zinc-900">{binding.device.name}</p>
                      <p className="text-xs text-zinc-500">
                        类型：{binding.device.deviceType.name}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right align-top">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => openConfirmDialog(binding)}
                      >
                        解绑
                      </Button>
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
                queryState.page + 1 >= totalPages || isTableLoading || bindings.length === 0
              }
            >
              下一页
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-white/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="size-5 text-primary" />
              用户绑定的设备
            </CardTitle>
            <CardDescription>
              支持查看单个用户的所有绑定设备，包含参数与预警方式等细节。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Label>选择用户</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={handleUserSelect}
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
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    if (parsePositiveId(selectedUserId)) {
                      void loadDevicesForUser(Number(selectedUserId));
                    }
                  }}
                  disabled={!selectedUserId || isUserDevicesLoading}
                >
                  <RefreshCw className="size-4" />
                  重新拉取
                </Button>
              </div>
            </div>

            {selectedUser && (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-4">
                <p className="text-sm font-semibold text-zinc-900">{selectedUser.name}</p>
                <p className="text-xs text-zinc-500">
                  手机号：{selectedUser.phone || "—"}
                </p>
                <p className="text-xs text-zinc-500">
                  角色：{selectedUser.role?.name ?? "—"}
                </p>
              </div>
            )}

            {renderUserDevicesContent()}
          </CardContent>
        </Card>

        <Card className="border border-white/80">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Cpu className="size-5 text-primary" />
              设备绑定的用户
            </CardTitle>
            <CardDescription>
              按设备查看所有绑定用户，帮助快速评估影响范围与通知对象。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Label>选择设备</Label>
                <Select
                  value={selectedDeviceId}
                  onValueChange={handleDeviceSelect}
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
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    if (parsePositiveId(selectedDeviceId)) {
                      void loadUsersForDevice(Number(selectedDeviceId));
                    }
                  }}
                  disabled={!selectedDeviceId || isDeviceUsersLoading}
                >
                  <RefreshCw className="size-4" />
                  重新拉取
                </Button>
              </div>
            </div>

            {selectedDevice && (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-4">
                <p className="text-sm font-semibold text-zinc-900">{selectedDevice.name}</p>
                <p className="text-xs text-zinc-500">
                  类型：{selectedDevice.deviceType.name}
                </p>
                <p className="text-xs text-zinc-500">
                  机器码：{selectedDevice.machineCode || "—"}
                </p>
              </div>
            )}

            {renderDeviceUsersContent()}
          </CardContent>
        </Card>
      </section>

      <Sheet open={isBindSheetOpen} onOpenChange={handleBindSheetOpenChange}>
        <SheetContent side="right" className="sm:max-w-[32rem]">
          <form className="flex h-full flex-col gap-6" onSubmit={handleBindSubmit}>
            <SheetHeader>
              <SheetTitle>新建绑定关系</SheetTitle>
              <SheetDescription>
                请选择需要绑定的用户和设备，系统会自动校验是否重复。
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label>选择用户</Label>
                <Select
                  value={bindForm.userId}
                  onValueChange={(value) =>
                    setBindForm((prev) => ({ ...prev, userId: value }))
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
              </div>

              <div className="space-y-2">
                <Label>选择设备</Label>
                <Select
                  value={bindForm.deviceId}
                  onValueChange={(value) =>
                    setBindForm((prev) => ({ ...prev, deviceId: value }))
                  }
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
              </div>

              {bindError && (
                <Alert variant="destructive">
                  <AlertTitle>无法提交</AlertTitle>
                  <AlertDescription>{bindError}</AlertDescription>
                </Alert>
              )}
            </div>

            <SheetFooter className="gap-3 sm:gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleBindSheetOpenChange(false)}
                disabled={isBinding}
              >
                取消
              </Button>
              <Button type="submit" disabled={isBinding}>
                {isBinding && <Loader2 className="size-4 animate-spin" />}
                确认绑定
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(confirmState)} onOpenChange={handleCloseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>解除绑定</DialogTitle>
            {confirmState && (
              <DialogDescription>
                确认要解除用户「{confirmState.userName}」与设备「{confirmState.deviceName}」的绑定吗？
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
              onClick={handleUnbindConfirm}
            >
              {isConfirmLoading ? "处理中..." : "确认解绑"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="pointer-events-none fixed right-6 top-6 z-50 flex flex-col items-end gap-3">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto w-80">
            <Alert
              variant={notification.type === "success" ? "success" : "destructive"}
              className="h-28 shadow-lg"
            >
              <div className="flex h-full items-start justify-between gap-3">
                <div className="flex-1 overflow-hidden">
                  <AlertTitle className="truncate">{notification.title}</AlertTitle>
                  <AlertDescription className="mt-1 max-h-16 overflow-y-auto text-sm text-zinc-600">
                    {notification.description}
                  </AlertDescription>
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
