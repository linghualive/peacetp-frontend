import type { ReactNode } from "react";

import { Skeleton } from "./ui/skeleton";

type SystemPageShellProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  isLoading?: boolean;
};

export function SystemPageShell({
  title,
  description,
  children,
  isLoading = false,
}: SystemPageShellProps) {
  const fallbackDescription = description
    ? description
    : `“${title}” 页面正在建设中，后续可以在此补充实际功能模块。`;

  return (
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
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-zinc-500">{fallbackDescription}</p>
          {children && <div className="mt-6">{children}</div>}
        </>
      )}
    </section>
  );
}
