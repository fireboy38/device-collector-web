'use client';

import { useQuery } from '@tanstack/react-query';
import { Stats, CHART_COLORS, formatDate } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Monitor, CheckCircle2, Building2, Users, TrendingUp, BarChart3, ChartPie, Server, Clock, Database, Cpu, LogIn } from 'lucide-react';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart as RechartsPieChart, Pie, Legend, AreaChart as RechartsAreaChart, Area,
} from 'recharts';

// ===== System Info Types =====
interface SystemInfoData {
  stats: { deviceCount: number; userCount: number; projectCount: number; deptCount: number; logCount: number; apiKeyCount: number };
  latestActivity: { lastDeviceCollection: string | null; lastLogTime: string | null };
  recentLogins: { content: string; createdAt: string; ipAddress: string | null }[];
  systemInfo: { version: string; nodeEnv: string; dbType: string; uptime: number; memoryUsage: number };
}

// ===== Device Analytics Types =====
interface DeviceAnalytics {
  osData: { name: string; value: number }[];
  timeline: { date: string; count: number }[];
  totalDevices: number;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}天${hours}小时${minutes}分钟`;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

// ===== Color Maps =====
const colorMap: Record<string, string> = {
  emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200/50',
  teal: 'from-teal-500 to-teal-600 shadow-teal-200/50',
  cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-200/50',
  amber: 'from-amber-500 to-amber-600 shadow-amber-200/50',
};

const bgMap: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-100',
  teal: 'bg-teal-50 border-teal-100',
  cyan: 'bg-cyan-50 border-cyan-100',
  amber: 'bg-amber-50 border-amber-100',
};

const projectColors = ['emerald', 'teal', 'cyan', 'amber'];

// ===== Loading Skeleton =====
function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-6">
      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full rounded" />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart Skeleton */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full rounded" />
        </CardContent>
      </Card>

      {/* Analytics Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full rounded" />
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full rounded" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full rounded" />
          </CardContent>
        </Card>
      </div>

      {/* System Info Skeleton */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[120px] w-full rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Custom Tooltip for Bar Chart =====
function BarChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg px-3 py-2 dark:bg-slate-800/95 dark:border-slate-700">
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold tabular-nums" style={{ color: CHART_COLORS[0] }}>
        {payload[0].value} 台设备
      </p>
    </div>
  );
}

// ===== Custom Tooltip for Area Chart =====
function AreaChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg px-3 py-2 dark:bg-slate-800/95 dark:border-slate-700">
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-emerald-600 tabular-nums">
        {payload[0].value} 次采集
      </p>
    </div>
  );
}

// ===== Custom Tooltip for Timeline Bar Chart =====
function TimelineTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg px-3 py-2 dark:bg-slate-800/95 dark:border-slate-700">
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-teal-600 tabular-nums">
        {payload[0].value} 台设备
      </p>
    </div>
  );
}

// ===== Custom Label for Donut Center =====
function DonutCenterLabel({ cx, cy, total }: { cx: number; cy: number; total: number }) {
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-2xl font-bold tabular-nums">
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-xs">
        设备总数
      </text>
    </g>
  );
}

// ===== Dashboard Tab Component =====
export function DashboardTab() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then(r => r.json()),
  });

  const { data: systemInfo } = useQuery<SystemInfoData>({
    queryKey: ['system-info'],
    queryFn: () => fetch('/api/system-info').then(r => r.json()),
  });

  const { data: analyticsData } = useQuery<DeviceAnalytics>({
    queryKey: ['device-analytics'],
    queryFn: () => fetch('/api/device-analytics').then(r => r.json()),
  });

  if (isLoading) return <DashboardSkeleton />;
  if (!stats) return null;

  // Stat cards configuration
  const statCards = [
    { label: '设备总数', value: stats.deviceCount, icon: Monitor, color: 'emerald', sub: `${stats.projectCount} 个项目` },
    { label: '今日采集', value: stats.todayCount, icon: CheckCircle2, color: 'teal', sub: stats.todayCount > 0 ? '持续增长中' : '暂无采集' },
    { label: '单位数量', value: stats.deptCount, icon: Building2, color: 'cyan', sub: `${stats.projectCount} 个项目下` },
    { label: '用户数量', value: stats.userCount, icon: Users, color: 'amber', sub: '活跃用户' },
  ];

  // Pie chart data
  const pieData = stats.projectStats.map((p) => ({
    name: p.name,
    value: p.deviceCount,
    deptCount: p.deptCount,
  }));

  // Trend chart data with date formatting
  const trendChartData = stats.trendData?.map((t) => {
    const d = new Date(t.date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { ...t, dateLabel: `${month}/${day}` };
  });

  // Timeline chart data with date formatting
  const timelineChartData = analyticsData?.timeline.map((t) => {
    const d = new Date(t.date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { ...t, dateLabel: `${month}/${day}` };
  });

  return (
    <div className="space-y-6 pb-6">
      {/* ===== Stat Cards Row ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {s.label}
                  </p>
                  <p className="text-3xl font-bold mt-1.5 tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[s.color]} flex items-center justify-center shadow-lg`}
                >
                  <s.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== Charts Row (Bar + Pie) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              各项目设备数量分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.projectStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RechartsBarChart data={stats.projectStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={<BarChartTooltip />} />
                  <Bar dataKey="deviceCount" name="设备数量" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {stats.projectStats.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无数据</p>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ChartPie className="w-4 h-4 text-teal-600" />
              设备分布占比
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 && pieData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="42%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-slate-600">{value}</span>
                    )}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无数据</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Trend Chart (Area) ===== */}
      {trendChartData && trendChartData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              7日采集趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RechartsAreaChart data={trendChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<AreaChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#trendGradient)"
                  dot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                />
              </RechartsAreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ===== Analytics Row (OS Distribution + Collection Timeline) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* OS Distribution Donut Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-600" />
              操作系统分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData && analyticsData.osData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RechartsPieChart>
                  <Pie
                    data={analyticsData.osData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {analyticsData.osData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                    <DonutCenterLabel cx="50%" cy="50%" total={analyticsData.totalDevices} />
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} 台`, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>
                    )}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无设备数据</p>
            )}
          </CardContent>
        </Card>

        {/* Collection Timeline Bar Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              采集时间分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineChartData && timelineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RechartsBarChart
                  data={timelineChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="dateLabel" tick={{ fontSize: 11 }} width={45} />
                  <Tooltip content={<TimelineTooltip />} />
                  <Bar dataKey="count" name="设备数量" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {timelineChartData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">近30天暂无采集记录</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Bottom Section: Project Cards + Recent Records ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Project Detail Cards */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">项目概况</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.projectStats.map((p, i) => (
              <div
                key={p.id}
                className={`p-3 rounded-lg border ${bgMap[projectColors[i % 4]]}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {p.code || '-'}
                  </Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    设备 <strong className="text-foreground tabular-nums">{p.deviceCount}</strong>
                  </span>
                  <span>
                    单位 <strong className="text-foreground tabular-nums">{p.deptCount}</strong>
                  </span>
                </div>
              </div>
            ))}
            {stats.projectStats.length === 0 && (
              <p className="text-center text-muted-foreground py-4">暂无项目</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Records Table */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">最近采集记录</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>使用人</TableHead>
                  <TableHead>电脑名称</TableHead>
                  <TableHead>IP地址</TableHead>
                  <TableHead className="hidden sm:table-cell">所属项目</TableHead>
                  <TableHead className="hidden md:table-cell">采集时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentDevices.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.userName}</TableCell>
                    <TableCell className="text-sm">{d.computerName || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{d.ipAddress || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-[10px]">
                        {d.projectName || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                      {formatDate(d.collectedAt)}
                    </TableCell>
                  </TableRow>
                ))}
                {stats.recentDevices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      暂无记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* ===== System Info Section ===== */}
      {systemInfo && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              系统信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: System Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                    <Server className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">系统版本</p>
                    <p className="text-sm font-semibold tabular-nums">v{systemInfo.systemInfo.version}</p>
                  </div>
                </div>
                <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0">
                    <Database className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">数据库类型</p>
                    <p className="text-sm font-semibold">{systemInfo.systemInfo.dbType}</p>
                  </div>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center shrink-0">
                    <Cpu className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">内存占用</p>
                    <p className="text-sm font-semibold tabular-nums">{systemInfo.systemInfo.memoryUsage} MB</p>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">运行时间</p>
                    <p className="text-sm font-semibold">{formatUptime(systemInfo.systemInfo.uptime)}</p>
                  </div>
                </div>
              </div>

              {/* Right: Recent Login Activity */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  最近登录活动
                </p>
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                  {systemInfo.recentLogins.slice(0, 3).map((login, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{login.content}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                        {login.ipAddress && (
                          <span className="font-mono text-[10px]">{login.ipAddress}</span>
                        )}
                        <span className="text-[10px]">{formatDate(login.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                  {systemInfo.recentLogins.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">暂无登录记录</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
