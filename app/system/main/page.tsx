"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Link2,
  RadioTower,
  RefreshCcw,
  UsersRound,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { TooltipProps } from "recharts";

import {
  getDeviceTypeBreakdown,
  getOverviewStats,
  getWarnSummary,
  type DeviceTypeBreakdownResponse,
  type OverviewStats,
  type WarnSummaryResponse,
} from "@/app/api/statistics/statistics";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/app/lib/utils";

const chartPalette = [
  "#6E78FF",
  "#8D9BFF",
  "#63D0FF",
  "#FFC078",
  "#FF8FAB",
  "#A5F3AD",
  "#B8C0FF",
  "#F6D3FF",
];

const statusLabelMap: Record<string, string> = {
  WARNING: "告警中",
  HANDLED: "已处理",
  IGNORED: "已忽略",
};

const formatLabel = (value: string) => {
  const upperValue = value.toUpperCase();
  if (statusLabelMap[upperValue]) {
    return statusLabelMap[upperValue];
  }
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

type ChartTooltipProps = TooltipProps<ValueType, NameType>;

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const safeLabel =
    label ?? (payload[0]?.payload?.name as string | undefined) ?? (payload[0]?.name as string);

  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-xs text-zinc-600 shadow-2xl backdrop-blur">
      <p className="text-[0.7rem] uppercase tracking-[0.25em] text-zinc-400">
        {safeLabel ?? "统计"}
      </p>
      {payload.map((item) => (
        <div
          key={`${String(item?.dataKey)}-${item?.name as string}`}
          className="mt-1 flex items-center justify-between gap-6"
        >
          <span className="text-zinc-500">{(item?.name as string) ?? item?.dataKey ?? "值"}</span>
          <span className="text-base font-semibold text-zinc-900">
            {typeof item?.value === "number"
              ? item.value.toLocaleString("zh-CN")
              : item?.value ?? "--"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SystemMainPage() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceTypeBreakdownResponse | null>(null);
  const [warnSummary, setWarnSummary] = useState<WarnSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDashboard = useCallback(async (options?: { silent?: boolean }) => {
    const showSkeleton = !options?.silent;
    if (showSkeleton && isMountedRef.current) {
      setIsLoading(true);
    }
    if (isMountedRef.current) {
      setErrorMessage(null);
    }

    try {
      const [overviewData, deviceData, warnData] = await Promise.all([
        getOverviewStats(),
        getDeviceTypeBreakdown(),
        getWarnSummary(),
      ]);
      if (!isMountedRef.current) {
        return;
      }
      setOverview(overviewData);
      setDeviceBreakdown(deviceData);
      setWarnSummary(warnData);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      const message =
        error instanceof Error ? error.message : "统计数据暂时不可用，请稍后再试。";
      setErrorMessage(message);
    } finally {
      if (showSkeleton && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDashboard({ silent: true });
    if (isMountedRef.current) {
      setIsRefreshing(false);
    }
  }, [loadDashboard]);

  const overviewMetrics = useMemo(() => {
    if (!overview) {
      return [];
    }
    return [
      {
        label: "用户总览",
        value: overview.totalUsers,
        hint: `${overview.totalRoles} 个角色`,
        icon: UsersRound,
        gradient: "from-[#c0d2ff] via-[#f2f4ff] to-white",
      },
      {
        label: "设备运行",
        value: overview.totalDevices,
        hint: `${overview.totalDeviceTypes} 类设备`,
        icon: Activity,
        gradient: "from-[#c6f7ff] via-[#f0fbff] to-white",
      },
      {
        label: "活跃告警",
        value: overview.activeWarns,
        hint: `${overview.totalWarns} 条全部预警`,
        icon: AlertTriangle,
        gradient: "from-[#ffe2ec] via-[#fff1f2] to-white",
      },
      {
        label: "绑定关系",
        value: overview.totalUserDeviceBindings,
        hint: "User ↔ Device",
        icon: Link2,
        gradient: "from-[#fdecc8] via-[#fff8ee] to-white",
      },
    ];
  }, [overview]);

  const roleChartData = useMemo(() => {
    const list = overview?.usersByRole ?? [];
    return [...list]
      .sort((a, b) => b.userCount - a.userCount)
      .map((item, index) => ({
        name: item.roleName,
        value: item.userCount,
        color: chartPalette[index % chartPalette.length],
      }));
  }, [overview]);

  const deviceChartData = useMemo(() => {
    const list = deviceBreakdown?.items ?? [];
    return [...list]
      .sort((a, b) => b.deviceCount - a.deviceCount)
      .map((item) => ({
        name: item.name,
        deviceCount: item.deviceCount,
        deviceTypeId: item.deviceTypeId,
        argTemplate: item.argTemplate,
      }));
  }, [deviceBreakdown]);

  const statusChartData = useMemo(() => {
    const entries = Object.entries(warnSummary?.statusDistribution ?? {});
    return entries.map(([status, count]) => ({
      status: formatLabel(status),
      count,
    }));
  }, [warnSummary]);

  const levelDistribution = useMemo(() => {
    const entries = Object.entries(warnSummary?.levelDistribution ?? {});
    return entries.map(([level, count]) => ({
      level: formatLabel(level),
      count,
    }));
  }, [warnSummary]);

  const totalWarns = warnSummary?.totalWarns ?? 0;

  return (
    <div className="space-y-6">

      {errorMessage && !isLoading && (
        <Card className="border-rose-100 bg-rose-50/80 text-rose-900">
          <CardHeader>
            <CardTitle>统计数据暂不可用</CardTitle>
            <CardDescription className="text-rose-600">{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" onClick={handleRefresh}>
              <RefreshCcw className={cn("size-4", isRefreshing && "animate-spin")} />
              重试
            </Button>
          </CardFooter>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card
                key={`metric-skeleton-${index}`}
                className="border-white/70 bg-white/70 p-6 backdrop-blur"
              >
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-24 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-2xl" />
                  <Skeleton className="h-3 w-16 rounded-full" />
                </div>
              </Card>
            ))
          : overviewMetrics.map((metric) => (
              <Card
                key={metric.label}
                className={cn(
                  "p-6 text-zinc-900 shadow-[0_35px_65px_-45px_rgba(15,23,42,1)] backdrop-blur",
                  `bg-gradient-to-br ${metric.gradient}`,
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-500">{metric.label}</p>
                  <metric.icon className="size-5 text-primary" />
                </div>
                <p className="mt-4 text-3xl font-semibold">
                  {metric.value.toLocaleString("zh-CN")}
                </p>
                <p className="mt-2 text-sm text-zinc-500">{metric.hint}</p>
              </Card>
            ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>设备类型分布</CardTitle>
              <CardDescription>按设备类型聚合的线上数量，支撑容量规划。</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              <RadioTower className="mr-1 size-3.5" />
              {deviceChartData.length} 类
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-[1.75rem]" />
            ) : deviceChartData.length === 0 ? (
              <p className="text-sm text-zinc-500">暂无设备数据。</p>
            ) : (
              <>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deviceChartData} barSize={20}>
                      <defs>
                        <linearGradient id="deviceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6E78FF" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#8fd3ff" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip content={(props) => <ChartTooltip {...props} />} />
                      <Bar dataKey="deviceCount" fill="url(#deviceGradient)" radius={[16, 16, 16, 16]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3">
                  {deviceChartData.slice(0, 4).map((item) => (
                    <div
                      key={item.deviceTypeId}
                      className="rounded-2xl border border-white/60 bg-white/80 px-4 py-2 text-sm text-zinc-600 shadow-inner"
                    >
                      <span className="font-medium text-zinc-900">{item.name}</span>{" "}
                      · {item.deviceCount.toLocaleString("zh-CN")} 台
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>预警脉动</CardTitle>
            <CardDescription>
              一览预警状态与等级分布，及时感知风险积压。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <>
                <Skeleton className="h-40 w-full rounded-[1.75rem]" />
                <Skeleton className="h-24 w-full rounded-[1.75rem]" />
              </>
            ) : statusChartData.length === 0 ? (
              <p className="text-sm text-zinc-500">暂无预警数据。</p>
            ) : (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={statusChartData}>
                      <defs>
                        <linearGradient id="warnStatus" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff9a8b" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#ffdde1" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="status" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip content={(props) => <ChartTooltip {...props} />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#ff8fab"
                        fill="url(#warnStatus)"
                        strokeWidth={3}
                        dot={{ stroke: "#ff8fab", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-zinc-700">等级分布</p>
                  <div className="space-y-3">
                    {levelDistribution.map((item, index) => {
                      const percentage =
                        totalWarns > 0 ? Math.round((item.count / totalWarns) * 100) : 0;
                      return (
                        <div key={item.level}>
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>{item.level}</span>
                            <span>{item.count.toLocaleString("zh-CN")}</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: chartPalette[index % chartPalette.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>角色画像</CardTitle>
              <CardDescription>用户按角色划分的人数占比。</CardDescription>
            </div>
            <Badge variant="outline">
              共 {(overview?.usersByRole?.length ?? 0).toLocaleString("zh-CN")} 组
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            {isLoading ? (
              <>
                <Skeleton className="h-64 w-full rounded-[1.75rem]" />
                <Skeleton className="h-64 w-full rounded-[1.75rem]" />
              </>
            ) : roleChartData.length === 0 ? (
              <p className="text-sm text-zinc-500">暂无角色数据。</p>
            ) : (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {roleChartData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={(props) => <ChartTooltip {...props} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {roleChartData.map((role) => (
                    <div
                      key={role.name}
                      className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm shadow-inner"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <span className="font-medium text-zinc-800">{role.name}</span>
                      </div>
                      <span className="text-zinc-500">
                        {role.value.toLocaleString("zh-CN")} 人
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>系统温度计</CardTitle>
            <CardDescription>汇总关键指标的轻量洞察。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-[1.75rem]" />
            ) : (
              <>
                <div className="rounded-[1.75rem] border border-white/60 bg-white/80 p-6 shadow-inner">
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    <span>设备/用户比</span>
                    <span className="font-medium text-zinc-900">
                      {overview && overview.totalUsers > 0
                        ? (overview.totalDevices / overview.totalUsers).toFixed(2)
                        : "--"}
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#6e78ff] to-[#63d0ff]"
                      style={{
                        width:
                          overview && overview.totalUsers > 0
                            ? `${Math.min(
                                100,
                                (overview.totalDevices / overview.totalUsers) * 25,
                              )}%`
                            : "8%",
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    理想区间：{overview ? (overview.totalDevices / overview.totalUsers).toFixed(2) : "--"}
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                      Warn 总量
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-900">
                      {warnSummary?.totalWarns?.toLocaleString("zh-CN") ?? "--"}
                    </p>
                    <p className="text-xs text-zinc-500">活跃 {overview?.activeWarns ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                      设备类型
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-900">
                      {deviceBreakdown?.items.length ?? 0}
                    </p>
                    <p className="text-xs text-zinc-500">支撑业务链路</p>
                  </div>
                </div>
                <div className="rounded-[1.75rem] border border-white/60 bg-gradient-to-r from-[#f7f9ff] via-white to-[#fef9f4] p-5">
                  <p className="text-sm font-medium text-zinc-700">洞察建议</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {overview && overview.activeWarns > 0
                      ? "存在未关闭预警，建议优先处理高等级告警并复核设备运行状况。"
                      : "当前系统运行平稳，可继续扩容设备类型或新增业务配置。"}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
