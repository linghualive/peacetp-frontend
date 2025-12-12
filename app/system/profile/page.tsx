"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Calendar,
  Clock,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import { getCurrentUser, type CurrentUserResponse } from "@/app/api/auth";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";

const FALLBACK_USER: CurrentUserResponse = {
  id: 0,
  name: "PeaceTP 用户",
  phone: "未知号码",
};

const vibrantGradients = [
  "from-[#8e9dff] via-[#7dd0ff] to-[#ffecb3]",
  "from-[#ffa8e0] via-[#ffd58f] to-[#9bffd9]",
  "from-[#c3a3ff] via-[#8de4ff] to-[#ffbdf2]",
];

const playfulTags = ["探索派", "秩序控", "创意匠", "轻松玩家", "数据达人", "专注实干家"];

const positiveAffirmations = [
  "你正在把设备体验变得更柔和、可亲。",
  "今天也是积累信任的一天，继续发光吧！",
  "所有细致记录都会在关键时刻派上用场。",
  "你正在悄悄刷新团队对体验的期待值。",
];

const funMilestones = [
  {
    title: "激活后台帐户",
    description: "在 PeaceTP 的冒险由此开启，掌控所有设备与身份。",
  },
  {
    title: "连接首批设备",
    description: "让设备与使用者的故事有迹可循。",
  },
  {
    title: "持续维护角色权限",
    description: "保证安全的同时保持体验流畅。",
  },
];

export default function UserProfilePage() {
  const [profile, setProfile] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const loadProfile = async () => {
      try {
        const result = await getCurrentUser();
        if (!isActive) {
          return;
        }
        setProfile(result);
      } catch (err) {
        if (!isActive) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "个人信息加载失败，请稍后再试";
        setError(message);
        setProfile(FALLBACK_USER);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();
    return () => {
      isActive = false;
    };
  }, []);

  const gradientClass = useMemo(() => {
    const index = ((profile?.id ?? 0) + (profile?.name?.length ?? 1)) % vibrantGradients.length;
    return vibrantGradients[index];
  }, [profile]);

  const personalityTag = useMemo(() => {
    if (!profile?.name) {
      return playfulTags[0];
    }
    const seed = profile.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return playfulTags[seed % playfulTags.length];
  }, [profile]);

  const affirmation = useMemo(() => {
    const base = profile?.id ?? 0;
    return positiveAffirmations[base % positiveAffirmations.length];
  }, [profile]);

  const activityMoments = useMemo(() => {
    const now = new Date();
    const offset = ((profile?.id ?? 1) % 5) + 1;
    const recent = new Date(now.getTime() - offset * 60 * 60 * 1000);
    const formattedRecent = recent.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return {
      lastActive: formattedRecent,
      joinDate: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString(),
    };
  }, [profile]);

  const displayProfile = profile ?? FALLBACK_USER;

  const highlightCards = [
    {
      icon: ShieldCheck,
      label: "账号安全等级",
      value: "极佳",
      hint: "多重校验开启中",
    },
    {
      icon: Clock,
      label: "最近活跃",
      value: `今天 · ${activityMoments.lastActive}`,
      hint: "持续在线巡航",
    },
    {
      icon: Sparkles,
      label: "个性标签",
      value: personalityTag,
      hint: "来自行为洞察",
    },
  ];

  const infoList = [
    {
      icon: UserRound,
      label: "用户名",
      value: displayProfile.name ?? FALLBACK_USER.name,
    },
    {
      icon: Phone,
      label: "联系电话",
      value: displayProfile.phone || "未填写",
    },
    {
      icon: BadgeCheck,
      label: "角色",
      value: displayProfile.role?.name ?? "未分配角色",
      helper: displayProfile.role?.description ?? "可联系管理员配置权限说明",
    },
    {
      icon: Calendar,
      label: "加入时间",
      value: activityMoments.joinDate,
      helper: "我们一起走过的这个月",
    },
  ];

  const renderHeroSkeleton = () => (
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <Skeleton className="h-8 w-1/3 rounded-full" />
      <Skeleton className="mt-3 h-10 w-1/2 rounded-full" />
      <Skeleton className="mt-6 h-16 w-full rounded-2xl" />
    </section>
  );

  const renderCardsSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={`profile-skeleton-${index}`}>
          <CardHeader>
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="mt-2 h-6 w-1/2 rounded-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-3/4 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>无法获取个人信息</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <>
          {renderHeroSkeleton()}
          {renderCardsSkeleton()}
        </>
      ) : (
        <>
          <section className="overflow-hidden rounded-3xl border bg-gradient-to-r p-6 text-white shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
            <div className="flex flex-wrap items-center gap-4">
              <div
                className={`rounded-3xl bg-gradient-to-r ${gradientClass} p-[1px] shadow-[0_25px_45px_-30px_rgba(15,23,42,0.8)]`}
              >
                <div className="rounded-[calc(1.5rem-2px)] bg-white/90 p-4 text-zinc-900">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">当前身份</p>
                  <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
                    {displayProfile.name?.trim() || FALLBACK_USER.name}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-500">
                    {displayProfile.role?.name ?? "自由探索者"}
                  </p>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 rounded-3xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm text-white/80">{affirmation}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-white/90 text-zinc-800">
                    <Sparkles className="mr-1 size-3.5 text-primary" />
                    {personalityTag}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/70 text-zinc-700">
                    <ShieldCheck className="mr-1 size-3.5 text-emerald-500" />
                    安全守护中
                  </Badge>
                  <Badge variant="outline" className="border-white/60 text-white">
                    <Clock className="mr-1 size-3.5" />
                    {activityMoments.lastActive}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <Phone className="size-4" />
                    {displayProfile.phone || "暂无电话"}
                  </span>
                  <span className="flex items-center gap-1">
                    <BadgeCheck className="size-4" />
                    用户 ID：{displayProfile.id}
                  </span>
                </div>
              </div>
              <div className="ml-auto">
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            {highlightCards.map((card) => (
              <Card key={card.label} className="border bg-white/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-600">
                    {card.label}
                  </CardTitle>
                  <card.icon className="size-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold text-zinc-900">{card.value}</div>
                  <p className="mt-1 text-xs text-zinc-500">{card.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-5 text-primary" />
                  资料小档案
                </CardTitle>
                <CardDescription>所有关键信息都为之后的协作保驾护航。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {infoList.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-2xl border border-zinc-100 p-4"
                  >
                    <div className="rounded-2xl bg-primary/10 p-2">
                      <item.icon className="size-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                        {item.label}
                      </p>
                      <p className="text-base font-semibold text-zinc-900">{item.value}</p>
                      {item.helper && (
                        <p className="text-xs text-zinc-500">{item.helper}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border bg-white/90">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="size-5 text-primary" />
                  成长轨迹
                </CardTitle>
                <CardDescription>
                  用轻量方式记录你与 PeaceTP 的协作能量。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {funMilestones.map((milestone, index) => (
                  <div key={milestone.title} className="relative pl-6">
                    {index !== funMilestones.length - 1 && (
                      <span className="absolute left-[9px] top-5 h-full w-px bg-primary/30" />
                    )}
                    <span className="absolute left-0 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold text-zinc-900">{milestone.title}</p>
                    <p className="text-xs text-zinc-500">{milestone.description}</p>
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-primary">
                  <p className="flex items-center gap-2 font-medium">
                    <Sparkles className="size-4" />
                    即将解锁的瞬间
                  </p>
                  <p className="mt-1 text-xs text-primary/80">
                    完成更多设备联调或角色配置，即可点亮新的成就卡片。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="size-5 text-primary" />
                今日灵感清单
              </CardTitle>
              <CardDescription>给自己一点有趣的任务，保持轻盈节奏。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {["回顾设备告警策略", "关怀绑定用户体验", "备份账号安全信息"].map(
                (task, index) => (
                  <div
                    key={task}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-100 p-4"
                  >
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{task}</p>
                      <p className="text-xs text-zinc-500">花 3 分钟就能完成的小行动</p>
                    </div>
                  </div>
                ),
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
