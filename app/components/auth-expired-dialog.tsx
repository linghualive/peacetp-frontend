"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AUTH_EXPIRED_EVENT, type AuthExpiredDetail } from "@/app/lib/auth-events";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const DEFAULT_MESSAGE = "用户未登录或登录状态已失效，即将跳转到登录页。";

export function AuthExpiredDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent<AuthExpiredDetail>).detail;
      setMessage(detail?.message || DEFAULT_MESSAGE);
      setOpen(true);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleEvent as EventListener);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleEvent as EventListener);
    };
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    router.replace("/");
  }, [router]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>登录状态失效</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full">
            前往登录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
