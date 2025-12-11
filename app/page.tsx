"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import { login } from "./api/auth";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { setToken } from "./tool/token";

const initialFormState = {
  name: "",
  password: "",
};

export default function Home() {
  const [form, setForm] = useState(initialFormState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const { token } = await login(form);
        setToken(token);
        router.push("/system/main");
      } catch (err) {
        setError(err instanceof Error ? err.message : "登录失败，请稍后重试");
      }
    });
  };

  const isDisabled = !form.name.trim() || !form.password.trim() || isPending;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-6 py-12 sm:px-12 lg:px-20">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-6 top-8 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-12 top-16 h-[22rem] w-[22rem] rounded-full bg-[#ffd7ef]/50 blur-[140px]" />
        <div className="absolute bottom-0 left-1/3 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[#9bd5ff]/35 blur-[160px]" />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-8">
          <div className="flex items-center gap-3 text-3xl font-semibold text-foreground">
            <ShieldCheck className="size-8 text-primary" />
            <div className="flex flex-col">
              <span>PeaceTP 管理系统</span>
              <span className="text-base font-normal text-foreground/60">
                统一的设备、用户与系统配置入口
              </span>
            </div>
          </div>
          <div className="rounded-[2.5rem] bg-white/35 p-8 shadow-[var(--glow-strong)] backdrop-blur-2xl">
            <p className="text-lg font-medium text-foreground">登录说明</p>
            <p className="mt-2 text-sm leading-7 text-foreground/70">
              使用平台账号密码登录后，系统会请求{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">/auth/login</code>{" "}
              接口获取 token，并存储到本地。后续访问后端接口时，会在请求头的{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                Authentication
              </code>{" "}
              与{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
                Authorization
              </code>{" "}
              字段中自动携带该 token。
            </p>
          </div>
        </div>
        <div className="flex w-full max-w-md flex-col gap-6">
          <Card className="bg-white/85 p-1 shadow-[var(--glow-soft)]">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-semibold">账号登录</CardTitle>
              <CardDescription>请输入账号与密码以进入后台管理系统。</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">账号</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="请输入账号"
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="请输入密码"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                </div>
                {error ? (
                  <p className="rounded-2xl bg-rose-50/90 px-4 py-2 text-sm text-rose-600 shadow-inner shadow-rose-200/80">
                    {error}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-foreground/60">
                    <LockKeyhole className="size-4" />
                    账号信息仅用于 PeaceTP 认证，不会向第三方泄露。
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isDisabled}>
                  {isPending ? "登录中..." : "登录"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
