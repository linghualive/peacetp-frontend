"use client";

import { useEffect, useState } from "react";
import { Activity, BellRing, Layers3 } from "lucide-react";

import { AppSidebar } from "../../components/app-sidebar";
import { WorkspaceTabs } from "../../components/workspace-tabs";
import { Skeleton } from "../../components/ui/skeleton";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../../components/ui/sidebar";

const overviewCards = [
  {
    title: "设备运行概览",
    description: "主控节点运行平稳，暂无异常事件。",
    icon: Activity,
  },
  {
    title: "告警提醒",
    description: "实时监控设备预警，第一时间掌握现场情况。",
    icon: BellRing,
  },
  {
    title: "业务汇总",
    description: "整合设备、用户及系统配置，提供统一视角。",
    icon: Layers3,
  },
];

const SYSTEM_MAIN_TITLE = "首页看板";
const SYSTEM_MAIN_PATH = "/system/main";

export default function SystemMainPage() {
  const [overviewData, setOverviewData] = useState<typeof overviewCards | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      setIsOverviewLoading(true);
      try {
        // Placeholder for real data loading logic; keeps UI responsive.
        const data = await Promise.resolve(overviewCards);
        if (!isMounted) return;
        setOverviewData(data);
      } finally {
        if (isMounted) {
          setIsOverviewLoading(false);
        }
      }
    };

    loadOverview();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger className="-ml-1" />
          <WorkspaceTabs
            currentPath={SYSTEM_MAIN_PATH}
            currentTitle={SYSTEM_MAIN_TITLE}
          />
        </header>
        <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-6">
          <section
            className="rounded-2xl border bg-white p-6 shadow-sm"
            aria-busy={isOverviewLoading}
          >
            {isOverviewLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-32 rounded-xl" />
                <Skeleton className="h-4 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded-xl" />
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold">页面概述</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  当前页面主要展示系统主区域。后续可以在此嵌入实时图表、概览统计或待办事项等内容。
                </p>
              </>
            )}
          </section>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isOverviewLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={`overview-skeleton-${index}`}
                    className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    <Skeleton className="h-5 w-5 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 rounded-xl" />
                      <Skeleton className="h-3 w-full rounded-xl" />
                      <Skeleton className="h-3 w-3/4 rounded-xl" />
                    </div>
                  </div>
                ))
              : (overviewData ?? []).map((card) => (
                  <div
                    key={card.title}
                    className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm"
                  >
                    <card.icon className="size-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {card.title}
                      </p>
                      <p className="text-sm text-zinc-500">{card.description}</p>
                    </div>
                  </div>
                ))}
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
