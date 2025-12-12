"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PencilLine,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  createUser,
  deleteUser,
  getUser,
  pageUsers,
  updateUser,
  type UserListItem,
} from "@/app/api/identity/users";
import { pageRoles, type Role } from "@/app/api/identity/roles";
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

type SearchFormState = {
  name: string;
  phone: string;
  roleId: "all" | number;
};

type QueryState = {
  page: number;
  size: number;
  name?: string;
  phone?: string;
  roleId?: number;
};

type DrawerState =
  | {
      mode: "create";
      name: string;
      password: string;
      phone: string;
      wechatId: string;
      roleId: number | null;
      isLoading?: boolean;
    }
  | {
      mode: "edit";
      id: number;
      name: string;
      password: string;
      phone: string;
      wechatId: string;
      roleId: number | null;
      isLoading?: boolean;
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
const ROLE_PAGE_SIZE = 100;

export default function IdentityUsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [queryState, setQueryState] = useState<QueryState>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
  });
  const [pagination, setPagination] = useState({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    total: 0,
  });
  const [searchForm, setSearchForm] = useState<SearchFormState>({
    name: "",
    phone: "",
    roleId: "all",
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
  const [roleOptions, setRoleOptions] = useState<Role[]>([]);
  const [isRoleOptionsLoading, setIsRoleOptionsLoading] = useState(true);
  const [roleOptionsError, setRoleOptionsError] = useState<string | null>(null);

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

  const loadRoleOptions = useCallback(async () => {
    setIsRoleOptionsLoading(true);
    setRoleOptionsError(null);
    try {
      const result = await pageRoles({
        page: 0,
        size: ROLE_PAGE_SIZE,
      });
      setRoleOptions(result.list);
    } catch (error) {
      const message = error instanceof Error ? error.message : "角色列表加载失败，请稍后重试";
      setRoleOptionsError(message);
      pushNotification({
        type: "error",
        title: "角色加载失败",
        description: message,
      });
    } finally {
      setIsRoleOptionsLoading(false);
    }
  }, [pushNotification]);

  useEffect(() => {
    void loadRoleOptions();
  }, [loadRoleOptions]);

  useEffect(() => {
    let ignore = false;
    setIsTableLoading(true);
    setTableError(null);

    const load = async () => {
      try {
        const query: Record<string, unknown> = {};
        if (queryState.name) {
          query.name = queryState.name;
        }
        if (queryState.phone) {
          query.phone = queryState.phone;
        }
        if (queryState.roleId) {
          query.roleId = queryState.roleId;
        }
        const payload = {
          page: queryState.page,
          size: queryState.size,
          ...(Object.keys(query).length > 0 ? { query } : {}),
        };
        const result = await pageUsers(payload);
        if (ignore) {
          return;
        }
        setUsers(result.list);
        setPagination(result.extra);
        setLastSyncedAt(Date.now());
      } catch (error) {
        if (ignore) {
          return;
        }
        const message = error instanceof Error ? error.message : "用户列表加载失败，请稍后再试";
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

  const usersWithoutPhone = useMemo(
    () => users.filter((user) => !user.phone || user.phone.trim().length === 0).length,
    [users],
  );

  const rolesCovered = useMemo(() => {
    const bucket = new Set(users.map((user) => user.role.id));
    return bucket.size;
  }, [users]);

  const lastSyncedText = useMemo(() => {
    if (!lastSyncedAt) {
      return "尚未同步";
    }
    return new Date(lastSyncedAt).toLocaleString();
  }, [lastSyncedAt]);

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

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = searchForm.name.trim();
    const trimmedPhone = searchForm.phone.trim();
    setQueryState({
      page: 0,
      size: DEFAULT_PAGE_SIZE,
      name: trimmedName || undefined,
      phone: trimmedPhone || undefined,
      roleId: searchForm.roleId === "all" ? undefined : searchForm.roleId,
    });
  };

  const openCreateDrawer = () => {
    setDrawerError(null);
    setDrawerState({
      mode: "create",
      name: "",
      password: "",
      phone: "",
      wechatId: "",
      roleId: roleOptions[0]?.id ?? null,
    });
  };

  const openEditDrawer = (user: UserListItem) => {
    setDrawerError(null);
    setDrawerState({
      mode: "edit",
      id: user.id,
      name: user.name,
      password: "",
      phone: user.phone ?? "",
      wechatId: "",
      roleId: user.role.id,
      isLoading: true,
    });

    void (async () => {
      try {
        const detail = await getUser(user.id);
        setDrawerState((prev) => {
          if (!prev || prev.mode !== "edit" || prev.id !== user.id) {
            return prev;
          }
          return {
            ...prev,
            name: detail.name,
            password: detail.password,
            phone: detail.phone ?? "",
            wechatId: detail.wechatId ?? "",
            roleId: detail.role.id,
            isLoading: false,
          };
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "用户详情加载失败，请稍后再试";
        setDrawerError(message);
        pushNotification({
          type: "error",
          title: "详情加载失败",
          description: message,
        });
        setDrawerState((prev) => {
          if (!prev || prev.mode !== "edit" || prev.id !== user.id) {
            return prev;
          }
          return { ...prev, isLoading: false };
        });
      }
    })();
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

  const handleValueChange = (
    field: "name" | "password" | "phone" | "wechatId" | "roleId",
    value: string,
  ) => {
    setDrawerState((prev) => {
      if (!prev) {
        return prev;
      }
      if (field === "roleId") {
        return {
          ...prev,
          roleId: value ? Number(value) : null,
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  const handleDrawerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!drawerState) {
      return;
    }
    if (drawerState.mode === "edit" && drawerState.isLoading) {
      return;
    }
    const trimmedName = drawerState.name.trim();
    const trimmedPassword = drawerState.password.trim();
    const trimmedPhone = drawerState.phone.trim();
    const trimmedWechat = drawerState.wechatId.trim();

    if (!trimmedName) {
      setDrawerError("用户名不能为空。");
      return;
    }

    if (!trimmedPassword) {
      setDrawerError("请填写用户密码。");
      return;
    }

    if (!drawerState.roleId) {
      setDrawerError("请选择关联角色。");
      return;
    }

    setIsSubmitting(true);
    setDrawerError(null);

    const payloadBase = {
      name: trimmedName,
      password: trimmedPassword,
      roleId: drawerState.roleId,
      ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      ...(trimmedWechat ? { wechatId: trimmedWechat } : {}),
    };

    try {
      if (drawerState.mode === "create") {
        await createUser(payloadBase);
        pushNotification({
          type: "success",
          title: "创建成功",
          description: "新用户已加入系统。",
        });
      } else {
        await updateUser({
          id: drawerState.id,
          ...payloadBase,
        });
        pushNotification({
          type: "success",
          title: "更新成功",
          description: "用户信息已保存。",
        });
      }
      closeDrawer();
      refreshTable();
    } catch (error) {
      const message = error instanceof Error ? error.message : "用户保存失败，请稍后再试";
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

  const handleDeleteRequest = (user: UserListItem) => {
    setConfirmState({ id: user.id, name: user.name });
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
      await deleteUser(confirmState.id);
      pushNotification({
        type: "success",
        title: "删除成功",
        description: `用户「${confirmState.name}」已移除。`,
      });
      refreshTable();
      if (drawerState?.mode === "edit" && drawerState.id === confirmState.id) {
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
    ? `确定要删除用户「${confirmState.name}」吗？删除后该用户将无法登录系统。`
    : "";

  const isDrawerInitializing = Boolean(drawerState?.mode === "edit" && drawerState.isLoading);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
              <UserPlus className="size-4" />
              新建用户
            </Button>
          </div>
        </div>

        <form
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-dashed border-zinc-200/80 bg-zinc-50/50 p-4 lg:flex-row lg:items-end"
          onSubmit={handleSearchSubmit}
        >
          <div className="flex-1 space-y-1">
            <Label htmlFor="user-search-name">姓名</Label>
            <Input
              id="user-search-name"
              placeholder="输入姓名关键字"
              value={searchForm.name}
              onChange={(event) => setSearchForm((prev) => ({ ...prev, name: event.target.value }))}
              autoComplete="off"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="user-search-phone">手机号</Label>
            <Input
              id="user-search-phone"
              placeholder="输入手机号"
              value={searchForm.phone}
              onChange={(event) =>
                setSearchForm((prev) => ({ ...prev, phone: event.target.value }))
              }
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="user-search-role">角色</Label>
            <Select
              value={searchForm.roleId === "all" ? "all" : String(searchForm.roleId)}
              onValueChange={(value) =>
                setSearchForm((prev) => ({
                  ...prev,
                  roleId: value === "all" ? "all" : Number(value),
                }))
              }
              disabled={isRoleOptionsLoading}
            >
              <SelectTrigger id="user-search-role" className="min-w-[180px]">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleOptionsError && (
              <p className="text-xs text-rose-500">角色加载失败，可稍后重试。</p>
            )}
          </div>
          <Button type="submit" variant="secondary" className="lg:ml-auto">
            <Search className="size-4" />
            查询
          </Button>
        </form>
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
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">联系方式</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isTableLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`user-skeleton-${index}`}>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-48 rounded-xl" />
                        <Skeleton className="mt-2 h-3 w-28 rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-32 rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Skeleton className="ml-auto h-8 w-28 rounded-full" />
                      </td>
                    </tr>
                  ))
                : users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-500">
                        暂无用户，请点击「新建用户」快速添加。
                      </td>
                    </tr>
                  )}

              {!isTableLoading &&
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="cursor-pointer bg-white transition hover:bg-zinc-50"
                    onClick={() => openEditDrawer(user)}
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-zinc-900">{user.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">ID：{user.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-600">
                        {user.phone ? user.phone : "手机号未填写"}
                      </p>
                      <p className="text-xs text-zinc-400">点击行可补充微信等附加信息</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {user.role.name}
                      </span>
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
                            openEditDrawer(user);
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
                            handleDeleteRequest(user);
                          }}
                          disabled={isConfirmLoading && confirmState?.id === user.id}
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
            个用户，每页 {pagination.size} 个。
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
                queryState.page + 1 >= totalPages || isTableLoading || users.length === 0
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
                    ? "新建用户"
                    : `编辑用户：${drawerState.name || drawerState.id}`}
                </SheetTitle>
                <SheetDescription>
                  填写基础信息与角色绑定，保存后立即生效。
                </SheetDescription>
              </SheetHeader>

              {isDrawerInitializing && (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-3 text-sm text-zinc-500">
                  用户详情加载中，请稍候...
                </div>
              )}

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="user-name-input">用户名</Label>
                  <Input
                    id="user-name-input"
                    value={drawerState.name}
                    onChange={(event) => handleValueChange("name", event.target.value)}
                    placeholder="例如 ops_admin"
                    autoComplete="off"
                    disabled={isDrawerInitializing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-password-input">
                    登录密码 <span className="text-xs text-zinc-400">(保存时将明文传输到后台)</span>
                  </Label>
                  <Input
                    id="user-password-input"
                    type="password"
                    value={drawerState.password}
                    onChange={(event) => handleValueChange("password", event.target.value)}
                    placeholder="请输入密码"
                    autoComplete="new-password"
                    disabled={isDrawerInitializing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-phone-input">手机号（可选）</Label>
                  <Input
                    id="user-phone-input"
                    type="tel"
                    value={drawerState.phone}
                    onChange={(event) => handleValueChange("phone", event.target.value)}
                    placeholder="便于联系与找回密码"
                    autoComplete="off"
                    disabled={isDrawerInitializing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-wechat-input">微信号（可选）</Label>
                  <Input
                    id="user-wechat-input"
                    value={drawerState.wechatId}
                    onChange={(event) => handleValueChange("wechatId", event.target.value)}
                    placeholder="可填写企业微信或个人微信号"
                    autoComplete="off"
                    disabled={isDrawerInitializing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-role-select">关联角色</Label>
                  <Select
                    value={drawerState.roleId ? String(drawerState.roleId) : ""}
                    onValueChange={(value) => handleValueChange("roleId", value)}
                    disabled={isRoleOptionsLoading || isDrawerInitializing}
                  >
                    <SelectTrigger id="user-role-select">
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {roleOptionsError && (
                    <div className="flex items-center gap-2 text-xs text-rose-500">
                      角色列表加载失败
                      <button
                        type="button"
                        className="text-primary underline-offset-2 hover:underline"
                        onClick={() => void loadRoleOptions()}
                      >
                        重试
                      </button>
                    </div>
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
                  <Button type="button" variant="secondary" disabled={isSubmitting}>
                    取消
                  </Button>
                </SheetClose>
                <Button type="submit" disabled={isSubmitting || isDrawerInitializing}>
                  {isSubmitting ? "保存中..." : drawerState.mode === "create" ? "创建" : "保存修改"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(confirmState)} onOpenChange={handleConfirmOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除用户</DialogTitle>
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
