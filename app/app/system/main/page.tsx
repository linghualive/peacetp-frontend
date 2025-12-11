"use client";

import { Activity, BellRing, Layers3 } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
        <header className="mx-4 mt-4 flex h-[var(--header-height)] shrink-0 items-center gap-3 rounded-[1.75rem] bg-white/70 px-6 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.65)] backdrop-blur-2xl lg:mx-8">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-col">
            <h1 className="text-base font-medium">系统主页面</h1>
            <p className="text-xs text-foreground/60">路径：/system/main</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm">
              刷新
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-8 px-4 pb-8 pt-4 lg:px-8">
          <section className="rounded-[2rem] bg-white/75 p-8 shadow-[var(--glow-strong)] backdrop-blur-xl">
            <h2 className="text-lg font-semibold">页面概述</h2>
            <p className="mt-3 text-sm text-foreground/70 leading-7">
              当前页面主要展示系统主区域。后续可以在此嵌入实时图表、概览统计或待办事项等内容。
            </p>
          </section>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {overviewCards.map((card) => (
              <div
                key={card.title}
                className="flex flex-col gap-3 rounded-[1.75rem] bg-white/80 p-6 shadow-[var(--glow-soft)] backdrop-blur-xl"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <card.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{card.title}</p>
                  <p className="mt-1 text-sm text-foreground/70">{card.description}</p>
                </div>
              </div>
            ))}
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
