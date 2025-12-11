"use client";

import { Activity, BellRing, Layers3 } from "lucide-react";

import { AppSidebar } from "../../components/app-sidebar";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
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

export default function SystemMainPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-col">
            <h1 className="text-base font-medium">系统主页面</h1>
            <p className="text-xs text-zinc-500">路径：/system/main</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm">
              刷新
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">页面概述</h2>
            <p className="mt-2 text-sm text-zinc-500">
              当前页面主要展示系统主区域。后续可以在此嵌入实时图表、概览统计或待办事项等内容。
            </p>
          </section>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {overviewCards.map((card) => (
              <div
                key={card.title}
                className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm"
              >
                <card.icon className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{card.title}</p>
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
