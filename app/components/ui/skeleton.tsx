import { cn } from "../../lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800",
        className,
      )}
    />
  );
}

export { Skeleton };
