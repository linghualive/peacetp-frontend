"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { cn } from "../lib/utils";

type WorkspaceTab = {
  title: string;
  path: string;
  removable: boolean;
};

type WorkspaceTabsProps = {
  currentPath: string;
  currentTitle: string;
  className?: string;
};

const STORAGE_KEY = "peacetp-workspace-tabs";
const MAX_DYNAMIC_TABS = 8;

const HOME_TAB: WorkspaceTab = {
  title: "首页看板",
  path: "/system/main",
  removable: false,
};

const deriveTitleFromPath = (path: string) => {
  if (!path) return "未命名页面";
  const segments = path
    .split("/")
    .filter(Boolean)
    .slice(-2);
  return segments
    .map((segment) =>
      segment
        .split("-")
        .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
        .join(" "),
    )
    .join(" / ");
};

const sanitizeTabs = (tabs: WorkspaceTab[]): WorkspaceTab[] => {
  const unique = new Map<string, WorkspaceTab>();

  tabs.forEach((tab) => {
    if (!tab.path) return;
    if (tab.path === HOME_TAB.path) return;
    if (unique.has(tab.path)) return;
    unique.set(tab.path, {
      title: tab.title?.trim() || deriveTitleFromPath(tab.path),
      path: tab.path,
      removable: true,
    });
  });

  const limited = Array.from(unique.values()).slice(-MAX_DYNAMIC_TABS);
  return [HOME_TAB, ...limited];
};

const readStoredTabs = (): WorkspaceTab[] => {
  if (typeof window === "undefined") return [HOME_TAB];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [HOME_TAB];
    const parsed = JSON.parse(stored) as WorkspaceTab[];
    return sanitizeTabs(parsed);
  } catch {
    return [HOME_TAB];
  }
};

const upsertTab = (
  tabs: WorkspaceTab[],
  target: WorkspaceTab,
): WorkspaceTab[] => {
  const safeTabs = sanitizeTabs(tabs);
  const normalizedTitle =
    target.title?.trim() || deriveTitleFromPath(target.path);

  if (target.path === HOME_TAB.path) {
    return [HOME_TAB, ...safeTabs.slice(1)];
  }

  const existingIndex = safeTabs.findIndex((tab) => tab.path === target.path);

  if (existingIndex !== -1) {
    return safeTabs.map((tab, index) =>
      index === existingIndex
        ? { ...tab, title: normalizedTitle, removable: true }
        : tab,
    );
  }

  const dynamic = safeTabs.slice(1);
  const nextDynamic = [...dynamic, { ...target, title: normalizedTitle, removable: true }];

  while (nextDynamic.length > MAX_DYNAMIC_TABS) {
    nextDynamic.shift();
  }

  return [HOME_TAB, ...nextDynamic];
};

export function WorkspaceTabs({
  currentPath,
  currentTitle,
  className,
}: WorkspaceTabsProps) {
  const router = useRouter();
  const currentTab: WorkspaceTab = useMemo(
    () => ({
      title: currentTitle,
      path: currentPath,
      removable: currentPath !== HOME_TAB.path,
    }),
    [currentPath, currentTitle],
  );

  const [tabs, setTabs] = useState<WorkspaceTab[]>(() =>
    upsertTab([HOME_TAB], currentTab),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let isMounted = true;
    const frame = requestAnimationFrame(() => {
      if (!isMounted) return;
      setTabs((prev) => {
        const merged = upsertTab(readStoredTabs(), currentTab);
        if (JSON.stringify(merged) === JSON.stringify(prev)) return prev;
        return merged;
      });
      setIsHydrated(true);
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(frame);
    };
  }, [currentTab]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs, isHydrated]);

  const handleSelect = (path: string) => {
    if (!path || path === currentPath) return;
    router.push(path);
  };

  const handleClose = (event: MouseEvent, path: string) => {
    event.stopPropagation();
    if (path === HOME_TAB.path) return;

    setTabs((prev) => {
      const safeTabs = sanitizeTabs(prev);
      const filtered = safeTabs.filter((tab) => tab.path !== path);
      const normalized = sanitizeTabs(filtered);
      const fallbackTab = normalized[normalized.length - 1] ?? HOME_TAB;

      if (path === currentPath && fallbackTab.path !== currentPath) {
        setTimeout(() => router.push(fallbackTab.path), 0);
      }

      return normalized;
    });
  };

  return (
    <div className={cn("flex flex-1", className)}>
      <div className="flex w-full items-center gap-1 rounded-full border border-zinc-200/80 bg-zinc-50/80 px-1.5 py-1 shadow-[0_10px_40px_-30px_rgba(15,23,42,0.8)]">
        {tabs.map((tab) => {
          const isActive = tab.path === currentPath;
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => handleSelect(tab.path)}
              className={cn(
                "group flex flex-1 basis-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                "min-w-0 max-w-[200px]",
                isActive
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900",
              )}
            >
              <span className="flex-1 truncate text-left">{tab.title}</span>
              {tab.removable && (
                <span
                  role="button"
                  aria-label="关闭标签"
                  onClick={(event) => handleClose(event, tab.path)}
                  className="rounded-full p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="size-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
