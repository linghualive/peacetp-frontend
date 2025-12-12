"use client";

import type { ReactNode } from "react";

import { Skeleton } from "./ui/skeleton";
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
  isLoading?: boolean;
};

export function SystemPageShell({
  title,
  path,
  description,
  children,
  isLoading = false,
}: SystemPageShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-6">
          <section
            className="rounded-2xl border bg-white p-6 shadow-sm"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-36 rounded-xl" />
                <Skeleton className="h-4 w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded-xl" />
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold">页面占位</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  {description ??
                    `“${title}” 页面正在建设中，后续可以在此补充实际功能模块。`}
                </p>
              </>
            )}
          </section>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
