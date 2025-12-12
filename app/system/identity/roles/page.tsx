"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PencilLine, Plus, RefreshCw, Shield, Trash2, Users, X } from "lucide-react";

import {
  createRole,
  deleteRole,
  pageRoles,
  updateRole,
  type Role,
} from "@/app/api/identity/roles";
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

type DrawerState =
  | {
      mode: "create" | "edit";
      id?: number;
      name: string;
      description: string;
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

export default function IdentityRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
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

  useEffect(() => {
    let ignore = false;
    setIsTableLoading(true);
    setTableError(null);

    const load = async () => {
      try {
        const result = await pageRoles({
          page: queryState.page,
          size: queryState.size,
        });
        if (ignore) {
          return;
        }
        setRoles(result.list);
        setPagination(result.extra);
        setLastSyncedAt(Date.now());
      } catch (error) {
        if (ignore) {
          return;
        }
        const message = error instanceof Error ? error.message : "角色列表加载失败，请稍后再试";
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

  const rolesWithoutDescription = useMemo(
    () => roles.filter((role) => !role.description || role.description.trim().length === 0).length,
    [roles],
  );

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

  const openCreateDrawer = () => {
    setDrawerError(null);
    setDrawerState({
      mode: "create",
      name: "",
      description: "",
    });
  };

  const openEditDrawer = (role: Role) => {
    setDrawerError(null);
    setDrawerState({
      mode: "edit",
      id: role.id,
      name: role.name,
      description: role.description ?? "",
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

  const handleDrawerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!drawerState) {
      return;
    }
    const trimmedName = drawerState.name.trim();
    const trimmedDescription = drawerState.description.trim();

    if (!trimmedName) {
      setDrawerError("角色名称不能为空。");
      return;
    }

    setIsSubmitting(true);
    setDrawerError(null);

    try {
      if (drawerState.mode === "create") {
        const { msg } = await createRole({
          name: trimmedName,
          description: trimmedDescription || undefined,
        });
        pushNotification({
          type: "success",
          title: "创建成功",
          description: msg,
        });
      } else {
        const { msg } = await updateRole({
          id: drawerState.id!,
          name: trimmedName,
          description: trimmedDescription || undefined,
        });
        pushNotification({
          type: "success",
          title: "更新成功",
          description: msg,
        });
      }
      closeDrawer();
      refreshTable();
    } catch (error) {
      const message = error instanceof Error ? error.message : "角色保存失败，请稍后再试";
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

  const handleDeleteRequest = (role: Role) => {
    setConfirmState({ id: role.id, name: role.name });
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
      const { msg } = await deleteRole(confirmState.id);
      pushNotification({
        type: "success",
        title: "删除成功",
        description: msg,
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
    ? `确定要删除角色「${confirmState.name}」吗？删除后引用该角色的用户将失去对应权限。`
    : "";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">角色列表</h3>
            <p className="text-sm text-zinc-500">点击表格即可查看或编辑角色详情。</p>
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
              新建角色
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
                <th className="px-4 py-3 font-medium">角色信息</th>
                <th className="px-4 py-3 font-medium">描述</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isTableLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`role-skeleton-${index}`}>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-48 rounded-xl" />
                        <Skeleton className="mt-2 h-3 w-32 rounded-xl" />
                      </td>
                      <td className="px-4 py-4">
                        <Skeleton className="h-4 w-full rounded-xl" />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Skeleton className="ml-auto h-8 w-28 rounded-full" />
                      </td>
                    </tr>
                  ))
                : roles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-sm text-zinc-500">
                        暂无角色记录，点击右上角「新建角色」即可开始配置。
                      </td>
                    </tr>
                  )}

              {!isTableLoading &&
                roles.map((role) => (
                  <tr
                    key={role.id}
                    className="cursor-pointer bg-white transition hover:bg-zinc-50"
                    onClick={() => openEditDrawer(role)}
                  >
                    <td className="px-4 py-4 align-top">
                      <p className="font-semibold text-zinc-900">{role.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">ID：{role.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-zinc-600">
                        {role.description || "暂无描述，点击此行完善信息。"}
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
                            openEditDrawer(role);
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
                            handleDeleteRequest(role);
                          }}
                          disabled={isConfirmLoading && confirmState?.id === role.id}
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
            个角色，每页 {pagination.size} 个。
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
                queryState.page + 1 >= totalPages || isTableLoading || roles.length === 0
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
                  {drawerState.mode === "create" ? "新建角色" : `编辑角色：${drawerState.name}`}
                </SheetTitle>
                <SheetDescription>配置角色名称与描述，保存后立即生效。</SheetDescription>
              </SheetHeader>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label htmlFor="role-name-input">角色名称</Label>
                  <Input
                    id="role-name-input"
                    value={drawerState.name}
                    onChange={(event) => handleValueChange("name", event.target.value)}
                    placeholder="例如 运营管理员"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-description-input">角色描述</Label>
                  <textarea
                    id="role-description-input"
                    value={drawerState.description}
                    onChange={(event) => handleValueChange("description", event.target.value)}
                    placeholder="补充角色负责的业务范围、可访问的模块等信息"
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
            <DialogTitle>删除角色</DialogTitle>
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
