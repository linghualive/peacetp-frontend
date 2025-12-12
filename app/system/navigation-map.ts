import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  Boxes,
  Cpu,
  FolderArchive,
  LayoutDashboard,
  Link2,
  Package,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users2,
} from "lucide-react";

export type SystemNavigationItem = {
  title: string;
  path: string;
  icon: LucideIcon;
  description?: string;
  children?: SystemNavigationItem[];
};

export type SystemRouteMeta = {
  path: string;
  title: string;
  description?: string;
};

export const systemNavigation: SystemNavigationItem[] = [
  {
    title: "首页看板",
    path: "/system/main",
    icon: LayoutDashboard,
    description: "汇总系统状态与提醒，后续可扩展实时指标与待办。",
  },
  {
    title: "设备管理",
    path: "/system/device",
    icon: Boxes,
    description: "统一维护设备视图并提供类型、绑定、预警等子模块。",
    children: [
      {
        title: "设备类型",
        path: "/system/device/type",
        icon: Package,
        description: "维护设备分类、型号与规格信息。",
      },
      {
        title: "设备",
        path: "/system/device/list",
        icon: Cpu,
        description: "设备清单、运行状态与检索入口。",
      },
      {
        title: "用户设备绑定",
        path: "/system/device/user-binding",
        icon: Link2,
        description: "管理设备与用户帐号之间的绑定关系。",
      },
      {
        title: "设备预警",
        path: "/system/device/warn",
        icon: BellRing,
        description: "集中查看与处理各类设备告警。",
      },
    ],
  },
  {
    title: "用户管理",
    path: "/system/identity",
    icon: Users2,
    description: "提供角色、用户等身份体系的管理能力。",
    children: [
      {
        title: "角色管理",
        path: "/system/identity/roles",
        icon: ShieldCheck,
        description: "配置角色、权限策略与授权范围。",
      },
      {
        title: "用户管理",
        path: "/system/identity/users",
        icon: UserRound,
        description: "维护后台用户资料及其分配的角色。",
      },
    ],
  },
  {
    title: "系统管理",
    path: "/system/settings",
    icon: Settings2,
    description: "集中入口管理参数配置与系统文件。",
    children: [
      {
        title: "参数配置管理",
        path: "/system/settings/params",
        icon: SlidersHorizontal,
        description: "维护全局参数与业务配置项。",
      },
      {
        title: "文件管理",
        path: "/system/settings/files",
        icon: FolderArchive,
        description: "上传与整理系统文件或附件。",
      },
    ],
  },
];

const auxiliaryRoutes: SystemRouteMeta[] = [
  {
    path: "/system/profile",
    title: "个人中心",
    description: "查看与维护个人资料、联系方式等信息。",
  },
];

const normalizePath = (value: string) => {
  if (!value) return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  if (withLeadingSlash.length === 1) return withLeadingSlash;
  return withLeadingSlash.replace(/\/+$/, "");
};

const flattenNavigation = (items: SystemNavigationItem[]): SystemRouteMeta[] => {
  const result: SystemRouteMeta[] = [];

  items.forEach((item) => {
    result.push({
      path: normalizePath(item.path),
      title: item.title,
      description: item.description,
    });
    if (item.children) {
      result.push(
        ...item.children.map((child) => ({
          path: normalizePath(child.path),
          title: child.title,
          description: child.description ?? item.description,
        })),
      );
    }
  });

  return result;
};

const routeMetaList: SystemRouteMeta[] = [
  ...flattenNavigation(systemNavigation),
  ...auxiliaryRoutes,
];

const routeMetaMap = routeMetaList.reduce<Record<string, SystemRouteMeta>>(
  (acc, meta) => {
    acc[normalizePath(meta.path)] = meta;
    return acc;
  },
  {},
);

export const findSystemRouteMeta = (
  pathname: string | null | undefined,
): SystemRouteMeta => {
  const normalized = normalizePath(pathname ?? "/system/main");
  const exactMatch = routeMetaMap[normalized];

  if (exactMatch) {
    return { ...exactMatch, path: normalized };
  }

  const fallbackKey = Object.keys(routeMetaMap)
    .sort((a, b) => b.length - a.length)
    .find((key) => normalized.startsWith(`${key}/`));

  if (fallbackKey) {
    const fallback = routeMetaMap[fallbackKey];
    return { ...fallback, path: normalized };
  }

  return {
    path: normalized,
    title: "系统页面",
    description: "当前路由尚未登记，请在 navigation-map.ts 中补充元信息。",
  };
};
