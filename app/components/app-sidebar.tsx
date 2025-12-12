"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ShieldCheck } from "lucide-react";

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
  useSidebar,
} from "./ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Skeleton } from "./ui/skeleton";
import { systemNavigation } from "@/app/system/navigation-map";
import { cn } from "../lib/utils";
import { clearToken } from "../tool/token";
import { DEFAULT_USER_PROFILE, clearUserProfile } from "../tool/user-profile";
import { getCurrentUser } from "@/app/api/auth";

export function AppSidebar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [sidebarProfile, setSidebarProfile] = useState({
    name: DEFAULT_USER_PROFILE.name,
    phone: DEFAULT_USER_PROFILE.phone,
  });
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      try {
        const profile = await getCurrentUser();
        if (!isActive) {
          return;
        }
        setSidebarProfile({
          name: profile.name?.trim() || DEFAULT_USER_PROFILE.name,
          phone: profile.phone?.trim() || DEFAULT_USER_PROFILE.phone,
        });
      } catch (error) {
        console.error("Failed to load current user profile", error);
        if (!isActive) {
          return;
        }
        setSidebarProfile({
          name: DEFAULT_USER_PROFILE.name,
          phone: DEFAULT_USER_PROFILE.phone,
        });
      } finally {
        if (isActive) {
          setIsProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

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

  const displayName = sidebarProfile.name || DEFAULT_USER_PROFILE.name;
  const displayPhone = sidebarProfile.phone || DEFAULT_USER_PROFILE.phone;
  const avatarInitial = displayName.charAt(0) || DEFAULT_USER_PROFILE.name.charAt(0);

  const handleViewProfile = useCallback(() => {
    setIsMenuOpen(false);
    router.push("/system/profile");
  }, [router]);

  const handleLogout = useCallback(() => {
    clearToken();
    clearUserProfile();
    setIsMenuOpen(false);
    router.push("/");
  }, [router]);

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  return (
    <Sidebar collapsible="icon">
      {!isCollapsed && (
        <SidebarHeader className="rounded-[1.5rem] bg-white/20 p-4 backdrop-blur">
          <div className="flex items-center gap-2 truncate text-base font-semibold text-sidebar-foreground">
            <ShieldCheck className="size-5 text-primary" />
            <span className="truncate">PeaceTP 管理系统</span>
          </div>
          <p className="text-xs text-sidebar-foreground/60">统一设备与用户管理后台</p>
        </SidebarHeader>
      )}
      <SidebarContent>
        {systemNavigation.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const hasActiveChild =
            hasChildren && item.children
              ? item.children.some((child) => isRouteActive(child.path))
              : false;

          return (
            <SidebarGroup key={item.title} className="px-1">
              {hasChildren ? (
                isCollapsed ? (
                  <SidebarMenu>
                    {item.children?.map((child) => {
                      const isActive = isRouteActive(child.path);
                      return (
                        <SidebarMenuItem key={child.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            tooltip={child.title}
                            className="justify-center px-0"
                          >
                            <Link
                              href={child.path}
                              aria-label={child.title}
                              className="flex items-center justify-center"
                            >
                              <child.icon className="size-4" />
                              <span className="sr-only">{child.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                ) : (
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
                            const isActive = isRouteActive(child.path);
                            return (
                              <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                  <Link href={child.path}>
                                    <child.icon className="size-4" />
                                    <span>{child.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                )
              ) : (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isRouteActive(item.path)}
                      tooltip={item.title}
                      className={cn(isCollapsed && "justify-center px-0")}
                    >
                      <Link
                        href={item.path}
                        aria-label={isCollapsed ? item.title : undefined}
                      >
                        <item.icon className="size-4" />
                        <span
                          className={cn(
                            "truncate",
                            isCollapsed && "sr-only",
                          )}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>
      {!isCollapsed && (
        <SidebarFooter className="rounded-[1.5rem] bg-white/15 p-4 backdrop-blur">
          <div className="relative" ref={menuRef}>
            {isProfileLoading ? (
              <div
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border border-white/30 bg-white/40 px-3 py-2",
                  "text-left text-sidebar-foreground",
                )}
                aria-busy="true"
              >
                <Skeleton className="size-11 rounded-2xl" />
                <div className="flex flex-1 flex-col items-end gap-2 text-right">
                  <Skeleton className="h-4 w-24 rounded-xl" />
                  <Skeleton className="h-3 w-20 rounded-xl" />
                </div>
                <Skeleton className="size-4 rounded-full" />
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleMenu}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border border-white/30 bg-white/50 px-3 py-2 text-left text-sidebar-foreground transition",
                    "hover:border-white/60 hover:bg-white/70",
                  )}
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-base font-semibold text-primary">
                    {avatarInitial}
                  </div>
                  <div className="flex flex-1 flex-col items-end text-right">
                    <span className="max-w-[8rem] truncate text-sm font-medium">
                      {displayName}
                    </span>
                    <span className="max-w-[8rem] truncate text-xs text-sidebar-foreground/70">
                      {displayPhone}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 text-sidebar-foreground/60 transition",
                      isMenuOpen && "rotate-180",
                    )}
                  />
                </button>
                {isMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-3 w-48 rounded-2xl border border-white/40 bg-white/95 p-1 text-sm text-sidebar-foreground shadow-[0_20px_45px_-25px_rgba(15,23,42,0.35)] backdrop-blur">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-primary/5"
                      onClick={handleViewProfile}
                    >
                      查看个人详情信息
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-rose-600 transition hover:bg-rose-50"
                      onClick={handleLogout}
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
