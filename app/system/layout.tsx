"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppSidebar } from "@/app/components/app-sidebar";
import { WorkspaceTabs } from "@/app/components/workspace-tabs";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/app/components/ui/sidebar";
import { emitAuthExpired } from "@/app/lib/auth-events";
import { getToken } from "@/app/tool/token";
import { findSystemRouteMeta } from "@/app/system/navigation-map";

type SystemLayoutProps = {
  children: ReactNode;
};

export default function SystemLayout({ children }: SystemLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyToken = () => {
      const token = getToken();

      if (!token) {
        emitAuthExpired({
          message: "登录状态已失效或未登录，即将跳转到登录页。",
        });
        router.replace("/");
        if (isMounted) {
          setIsAuthorized(false);
          setIsCheckingToken(false);
        }
        return;
      }

      if (isMounted) {
        setIsAuthorized(true);
        setIsCheckingToken(false);
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingToken) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white/90 px-10 py-8 text-center shadow-xl shadow-primary/20">
          <span className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          <p className="text-sm text-zinc-600">正在校验登录状态…</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const routeMeta = findSystemRouteMeta(pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger className="-ml-1" />
          <WorkspaceTabs
            currentPath={routeMeta.path}
            currentTitle={routeMeta.title}
          />
        </header>
        <main className="flex flex-1 flex-col bg-zinc-50">
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
