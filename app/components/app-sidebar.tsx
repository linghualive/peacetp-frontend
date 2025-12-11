"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  Boxes,
  ChevronDown,
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

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "./ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { cn } from "../lib/utils";

type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  children?: NavigationItem[];
};

const navigation: NavigationItem[] = [
  {
    title: "首页看板",
    href: "/system/main",
    icon: LayoutDashboard,
  },
  {
    title: "设备管理",
    href: "/system/device",
    icon: Boxes,
    children: [
      { title: "设备类型", href: "/system/device/type", icon: Package },
      { title: "设备", href: "/system/device/list", icon: Cpu },
      { title: "用户设备绑定", href: "/system/device/user-binding", icon: Link2 },
      { title: "设备预警", href: "/system/device/warn", icon: BellRing },
    ],
  },
  {
    title: "用户管理",
    href: "/system/identity",
    icon: Users2,
    children: [
      { title: "角色管理", href: "/system/identity/roles", icon: ShieldCheck },
      { title: "用户管理", href: "/system/identity/users", icon: UserRound },
    ],
  },
  {
    title: "系统管理",
    href: "/system/settings",
    icon: Settings2,
    children: [
      { title: "参数配置管理", href: "/system/settings/params", icon: SlidersHorizontal },
      { title: "文件管理", href: "/system/settings/files", icon: FolderArchive },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname() ?? "/";

  const normalize = (value: string) => {
    if (value === "/") return value;
    return value.replace(/\/$/, "");
  };

  const isRouteActive = (href: string) => {
    const normalizedHref = normalize(href);
    const normalizedPath = normalize(pathname);
    return (
      normalizedPath === normalizedHref ||
      normalizedPath.startsWith(`${normalizedHref}/`)
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="rounded-[1.5rem] bg-white/20 p-4 backdrop-blur">
        <div className="flex items-center gap-2 truncate text-base font-semibold text-sidebar-foreground">
          <ShieldCheck className="size-5 text-primary" />
          <span className="truncate">PeaceTP 管理系统</span>
        </div>
        <p className="text-xs text-sidebar-foreground/60">统一设备与用户管理后台</p>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const hasActiveChild =
            hasChildren && item.children
              ? item.children.some((child) => isRouteActive(child.href))
              : false;

          return (
            <SidebarGroup key={item.title} className="px-1">
              {hasChildren ? (
                <Collapsible
                  defaultOpen={hasActiveChild}
                  className="group/collapsible"
                >
                <SidebarGroupLabel
                  asChild
                  className="px-0 text-sm font-medium normal-case tracking-normal"
                >
                  <CollapsibleTrigger
                    className={cn(
                      "flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-white/40 hover:text-primary data-[state=open]:bg-white/30",
                      hasActiveChild &&
                        "bg-primary/15 text-primary shadow-[0_18px_35px_-25px_rgba(107,123,255,0.9)] hover:bg-primary/20",
                    )}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent className="px-1">
                    <SidebarMenuSub className="mt-2">
                      {item.children?.map((child) => {
                        const isActive = isRouteActive(child.href);
                        return (
                          <SidebarMenuSubItem key={child.title}>
                            <SidebarMenuSubButton asChild isActive={isActive}>
                              <a href={child.href}>
                                <child.icon className="size-4" />
                                <span>{child.title}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
              ) : (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isRouteActive(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                </SidebarMenu>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="rounded-[1.5rem] bg-white/15 p-4 backdrop-blur">
        <p className="text-xs text-sidebar-foreground/60">欢迎使用 PeaceTP 平台</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
