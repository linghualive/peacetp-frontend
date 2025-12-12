"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";

import { getCurrentUser, login } from "./api/auth";
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
import { clearToken, setToken } from "./tool/token";
import { clearUserProfile, setUserProfile } from "./tool/user-profile";

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
        const profile = await getCurrentUser();
        setUserProfile(profile);
        router.push("/system/main");
      } catch (err) {
        clearToken();
        clearUserProfile();
        setError(err instanceof Error ? err.message : "登录失败，请稍后重试");
      }
    });
  };

  const isDisabled = !form.name.trim() || !form.password.trim() || isPending;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-6 py-10 sm:px-12 lg:px-20">
      {isPending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/25 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white/90 px-10 py-8 text-center shadow-xl shadow-primary/20">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              <ShieldCheck className="size-6 text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground">正在验证身份</p>
            <p className="text-sm text-foreground/70">
              请稍候，我们正在同步账号与权限信息…
            </p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-0 top-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#d6ddff] blur-[200px]" />
        <div className="absolute right-10 top-0 h-[26rem] w-[26rem] rounded-full bg-[#fee2f4]/80 blur-[180px]" />
        <div className="absolute bottom-0 left-1/2 h-[30rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#b3f0ff]/60 blur-[200px]" />
        <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-br from-white/15 via-transparent to-transparent" />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-8 text-foreground">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary shadow-sm shadow-primary/20 backdrop-blur">
            <Sparkles className="size-4" />
            System Dashboard
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              <ShieldCheck className="size-9 text-primary" />
              PeaceTP 管控中枢
            </div>
            <p className="max-w-xl text-base text-foreground/75 sm:text-lg">
              以 Apple HIG 的轻盈视觉打造后台入口，统一设备、身份与告警。登录后即可体验
              Realtime 驾驶舱和灵动的系统卡片。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "统一身份", desc: "一处接入，串联角色与权限" },
              { title: "可视化告警", desc: "实时掌握预警状态" },
              { title: "智能设备", desc: "跨类型设备统一纳管" },
              { title: "极速响应", desc: "刷新式体验与丝滑动画" },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/50 bg-white/70 px-5 py-4 text-sm text-foreground shadow-[0_25px_55px_-40px_rgba(15,23,42,0.8)] backdrop-blur"
              >
                <p className="text-base font-semibold">{item.title}</p>
                <p className="text-sm text-foreground/65">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-foreground/70">
            <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-2 shadow-inner">
              <Waves className="size-4 text-primary" />
              灵动界面
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-2 shadow-inner">
              <LockKeyhole className="size-4 text-primary" />
              私密传输
            </div>
          </div>
        </div>
        <div className="flex w-full max-w-md flex-col gap-6">
          <Card className="border-white/70 bg-white/85 p-[1.5rem] shadow-[0_45px_90px_-60px_rgba(15,23,42,1)] backdrop-blur-2xl">
            <CardHeader className="space-y-3 px-0 pt-0">
              <CardTitle className="text-3xl font-semibold text-foreground">欢迎回来</CardTitle>
              <CardDescription className="text-foreground/70">
                使用内部账号访问 PeaceTP 的设备与身份中枢。我们会同步最新的权限信息。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-0 pb-0">
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
                aria-busy={isPending}
              >
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
                <Button
                  type="submit"
                  className="w-full rounded-[14px] text-base shadow-[0_25px_45px_-30px_rgba(90,104,255,0.9)]"
                  disabled={isDisabled}
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      正在登录
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      进入后台
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </form>
              <div className="rounded-[1.5rem] border border-white/60 bg-gradient-to-br from-white via-[#f8f9ff] to-[#eef3ff] px-5 py-4 text-sm text-foreground/70">
                <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">
                  登录提示
                </p>
                <p className="mt-1 text-sm">
                  登录即视为同意内部安全规范。若遗忘密码请联系管理员重置。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
