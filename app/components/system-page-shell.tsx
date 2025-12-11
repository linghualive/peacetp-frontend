"use client";

import type { ReactNode } from "react";

import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./ui/sidebar";
import { AppSidebar } from "./app-sidebar";

type SystemPageShellProps = {
  title: string;
  path: string;
  description?: string;
  children?: ReactNode;
};

export function SystemPageShell({
  title,
  path,
  description,
  children,
}: SystemPageShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex flex-col">
            <h1 className="text-base font-medium">{title}</h1>
            <p className="text-xs text-zinc-500">路径：{path}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm">
              刷新
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">页面占位</h2>
            <p className="mt-2 text-sm text-zinc-500">
              {description ??
                `“${title}” 页面正在建设中，后续可以在此补充实际功能模块。`}
            </p>
          </section>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
