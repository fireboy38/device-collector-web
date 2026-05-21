'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Download, Upload, Server, Database, Cpu, Clock, Info, Trash2,
  Loader2, DatabaseBackup, ShieldCheck, AlertTriangle, FileJson, Monitor,
  FileText, ChevronDown, Users, Building2, Activity,
} from 'lucide-react';

// ===== Types =====
interface SystemInfoData {
  stats: { deviceCount: number; userCount: number; projectCount: number; deptCount: number; logCount: number; apiKeyCount: number };
  latestActivity: { lastDeviceCollection: string | null; lastLogTime: string | null };
  systemInfo: { version: string; nodeEnv: string; dbType: string; uptime: number; memoryUsage: number };
}

interface BackupPreview {
  version: string;
  exportedAt: string;
  data: Record<string, unknown[]>;
}

// ===== Helpers =====
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}天${hours}小时${minutes}分钟`;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

// ===== Settings Tab Component =====
export function SettingsTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // System info query
  const { data: systemInfo } = useQuery<SystemInfoData>({
    queryKey: ['system-info'],
    queryFn: () => fetch('/api/system-info').then(r => r.json()),
  });

  // ===== Backup (Download) =====
  const handleBackup = useCallback(async () => {
    setDownloading(true);
    try {
      const res = await fetch('/api/backup');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '备份失败');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      let filename = `设备采集备份_${new Date().toISOString().slice(0, 10)}.json`;
      if (disposition) {
        const match = disposition.match(/filename\*?=(?:UTF-8'')?(.+)/i);
        if (match) filename = decodeURIComponent(match[1]);
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('备份文件下载成功');
    } catch (error) {
      toast.error(String(error) || '备份下载失败');
    } finally {
      setDownloading(false);
    }
  }, []);

  // ===== Restore (Upload + Preview + Confirm) =====
  const parseBackupFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!json.data) {
          toast.error('无效的备份文件格式：缺少 data 字段');
          return;
        }
        setBackupPreview({
          version: json.version || '未知',
          exportedAt: json.exportedAt || '未知',
          data: json.data,
        });
      } catch {
        toast.error('无法解析备份文件，请确认为有效的 JSON 文件');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('仅支持 .json 格式的备份文件');
      return;
    }
    parseBackupFile(file);
    e.target.value = '';
  }, [parseBackupFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('仅支持 .json 格式的备份文件');
      return;
    }
    parseBackupFile(file);
  }, [parseBackupFile]);

  const handleRestore = useCallback(async () => {
    if (!backupPreview) return;
    setRestoring(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: backupPreview.data }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '恢复失败');
      toast.success(data.message || '数据恢复成功');
      queryClient.invalidateQueries();
      setBackupPreview(null);
      setShowRestoreConfirm(false);
    } catch (error) {
      toast.error(String(error) || '数据恢复失败');
    } finally {
      setRestoring(false);
    }
  }, [backupPreview, queryClient]);

  // ===== Seed Database =====
  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '初始化失败');
      if (data.projectCount) {
        toast.info('数据库已有数据，无需初始化');
      } else {
        toast.success('数据库初始化成功');
        queryClient.invalidateQueries();
      }
    } catch (error) {
      toast.error(String(error) || '初始化失败');
    } finally {
      setSeeding(false);
    }
  }, [queryClient]);

  // ===== Clear Logs =====
  const handleClearLogs = useCallback(async () => {
    setClearingLogs(true);
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '清空日志失败');
      toast.success(data.message || '日志已清空');
      queryClient.invalidateQueries();
      setShowClearLogsConfirm(false);
    } catch (error) {
      toast.error(String(error) || '清空日志失败');
    } finally {
      setClearingLogs(false);
    }
  }, [queryClient]);

  // Compute backup preview info
  const backupInfoEntries = backupPreview ? [
    { label: '版本', value: backupPreview.version },
    { label: '导出时间', value: new Date(backupPreview.exportedAt).toLocaleString('zh-CN') },
    { label: '项目数', value: (backupPreview.data.projects?.length || 0) + ' 条' },
    { label: '用户数', value: (backupPreview.data.users?.length || 0) + ' 条' },
    { label: '单位数', value: (backupPreview.data.departments?.length || 0) + ' 条' },
    { label: '设备数', value: (backupPreview.data.devices?.length || 0) + ' 条' },
    { label: '日志数', value: (backupPreview.data.logs?.length || 0) + ' 条' },
    { label: 'API Key数', value: (backupPreview.data.apiKeys?.length || 0) + ' 条' },
  ] : [];

  // Recent activity quick stats
  const recentActivityItems = systemInfo ? [
    {
      label: '最近采集',
      value: systemInfo.latestActivity.lastDeviceCollection
        ? formatRelativeTime(systemInfo.latestActivity.lastDeviceCollection)
        : '无记录',
      icon: Monitor,
      color: 'emerald',
    },
    {
      label: '最近日志',
      value: systemInfo.latestActivity.lastLogTime
        ? formatRelativeTime(systemInfo.latestActivity.lastLogTime)
        : '无记录',
      icon: Activity,
      color: 'teal',
    },
    {
      label: '设备总数',
      value: String(systemInfo.stats.deviceCount),
      icon: Monitor,
      color: 'cyan',
    },
    {
      label: '今日日志',
      value: String(systemInfo.stats.logCount),
      icon: FileText,
      color: 'amber',
    },
  ] : [];

  // Export items configuration
  const exportItems = [
    { label: '设备列表', href: '/api/devices/export', icon: Monitor, color: 'emerald' },
    { label: '项目列表', href: '/api/projects/export', icon: Database, color: 'teal' },
    { label: '用户列表', href: '/api/users/export', icon: Users, color: 'cyan' },
    { label: '单位列表', href: '/api/departments/export', icon: Building2, color: 'amber' },
  ];

  const colorClasses: Record<string, { bg: string; iconBg: string; iconText: string; hoverBg: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconText: 'text-emerald-600', hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-950/50' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-950/30', iconBg: 'bg-teal-100 dark:bg-teal-900/50', iconText: 'text-teal-600', hoverBg: 'hover:bg-teal-100 dark:hover:bg-teal-950/50' },
    cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', iconBg: 'bg-cyan-100 dark:bg-cyan-900/50', iconText: 'text-cyan-600', hoverBg: 'hover:bg-cyan-100 dark:hover:bg-cyan-950/50' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconText: 'text-amber-600', hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-950/50' },
  };

  return (
    <div className="space-y-6 pb-6 max-w-4xl">
      {/* ===== Data Export Card ===== */}
      <Card className="border-0 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        <div className="h-1 bg-gradient-to-r from-cyan-400 to-teal-500" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-cyan-600" />
            </div>
            数据导出
          </CardTitle>
          <CardDescription className="text-xs">
            将设备、项目、用户、单位数据导出为 CSV 或 Excel (XLSX) 格式文件
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {exportItems.map((item) => {
              const colors = colorClasses[item.color];
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`${colors.bg} rounded-lg p-3 transition-shadow hover:shadow-sm`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-md ${colors.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${colors.iconText}`} />
                    </div>
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                        <Download className="w-3 h-3" />
                        导出
                        <ChevronDown className="w-3 h-3 ml-0.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a href={`${item.href}?format=csv`} download className="cursor-pointer">
                          <FileText className="w-4 h-4 mr-2" />导出 CSV
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`${item.href}?format=xlsx`} download className="cursor-pointer">
                          <FileText className="w-4 h-4 mr-2" />导出 XLSX
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ===== Recent Activity Quick Stats ===== */}
      {systemInfo && (
        <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="text-sm font-medium">最近操作</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {recentActivityItems.map((item) => {
                const colors = colorClasses[item.color];
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`${colors.bg} rounded-lg p-2.5 flex items-center gap-2.5`}>
                    <div className={`w-8 h-8 rounded-md ${colors.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${colors.iconText}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-semibold tabular-nums truncate">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Data Backup Card ===== */}
      <Card className="border-0 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        <div className="h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Download className="w-4 h-4 text-emerald-600" />
            </div>
            数据备份
          </CardTitle>
          <CardDescription className="text-xs">
            导出完整数据库为 JSON 文件，包含所有项目、用户、单位、设备、日志和 API 密钥数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <FileJson className="w-4 h-4" />
              <span>将导出为 JSON 格式文件，可随时用于恢复</span>
            </div>
            <Button
              onClick={handleBackup}
              disabled={downloading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? '正在备份...' : '下载备份'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Data Restore Card ===== */}
      <Card className="border-0 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        <div className="h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Upload className="w-4 h-4 text-amber-600" />
            </div>
            数据恢复
          </CardTitle>
          <CardDescription className="text-xs">
            从备份 JSON 文件恢复数据，恢复前将清空当前所有数据
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/10'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="text-sm text-muted-foreground">
              拖拽备份文件到此处，或 <span className="text-amber-600 font-medium">点击选择文件</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">仅支持 .json 格式</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Backup Preview */}
          {backupPreview && (
            <div className="border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">备份文件预览</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {backupInfoEntries.map((entry) => (
                  <div key={entry.label} className="text-xs">
                    <span className="text-muted-foreground">{entry.label}：</span>
                    <span className="font-medium tabular-nums">{entry.value}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
                  恢复将清除当前所有数据并替换为备份数据
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBackupPreview(null)}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1"
                    onClick={() => setShowRestoreConfirm(true)}
                  >
                    <Upload className="w-3 h-3" />
                    确认恢复
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== System Information Card ===== */}
      <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Server className="w-4 h-4 text-teal-600" />
            </div>
            系统信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemInfo ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-emerald-600" />
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">数据库</p>
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
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {['版本', '数据库', '内存', '运行时间'].map((label) => (
                <div key={label} className="bg-muted/50 rounded-lg p-3 animate-pulse">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-semibold mt-1">-</p>
                </div>
              ))}
            </div>
          )}

          {/* Data Stats Summary */}
          {systemInfo && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <DatabaseBackup className="w-3 h-3" />
                  {systemInfo.stats.projectCount} 个项目
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {systemInfo.stats.userCount} 个用户
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {systemInfo.stats.deptCount} 个单位
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {systemInfo.stats.deviceCount} 台设备
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {systemInfo.stats.logCount} 条日志
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1">
                  {systemInfo.stats.apiKeyCount} 个 API Key
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== Quick Actions Card ===== */}
      <Card className="border-0 shadow-sm border-red-200 dark:border-red-900 overflow-hidden transition-shadow hover:shadow-md">
        <div className="h-1 bg-gradient-to-r from-red-400 to-red-600" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-red-600" />
            </div>
            快捷操作
          </CardTitle>
          <CardDescription className="text-xs">
            危险操作区域，执行后数据将不可恢复
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Seed Database */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <DatabaseBackup className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">初始化数据库</p>
                <p className="text-xs text-muted-foreground">创建示例数据（项目、用户、设备等），仅在数据库为空时有效</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              className="gap-1"
            >
              {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <DatabaseBackup className="w-3 h-3" />}
              初始化
            </Button>
          </div>

          {/* Clear Logs */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">清空所有日志</p>
                <p className="text-xs text-muted-foreground">删除全部操作日志记录，此操作不可撤销</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 gap-1"
              onClick={() => setShowClearLogsConfirm(true)}
            >
              <Trash2 className="w-3 h-3" />
              清空
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== About Card ===== */}
      <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/50">
                <Monitor className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">设备信息采集器 · 管理端</p>
                <p className="text-xs text-muted-foreground">v2.0.0</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              稳定版
            </Badge>
          </div>
          <Separator className="mb-3" />
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Next.js 16', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
              { label: 'React 19', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
              { label: 'Prisma', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
              { label: 'SQLite', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
              { label: 'Tailwind CSS', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
              { label: 'shadcn/ui', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
              { label: 'TanStack Query', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
              { label: 'Recharts', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
            ].map((tech) => (
              <Badge key={tech.label} variant="outline" className={`text-[10px] border-0 ${tech.color}`}>
                {tech.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ===== Confirmation Dialogs ===== */}

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={showRestoreConfirm}
        onOpenChange={(open) => {
          setShowRestoreConfirm(open);
          if (!open) setBackupPreview(null);
        }}
        title="确认恢复数据"
        message={`将从备份文件恢复数据（版本 ${backupPreview?.version || '未知'}，导出于 ${backupPreview ? new Date(backupPreview.exportedAt).toLocaleString('zh-CN') : '未知'}），当前所有数据将被清除并替换。此操作不可撤销，请确保已备份当前数据。`}
        onConfirm={handleRestore}
        loading={restoring}
        variant="warning"
      />

      {/* Clear Logs Confirmation */}
      <ConfirmDialog
        open={showClearLogsConfirm}
        onOpenChange={setShowClearLogsConfirm}
        title="确认清空日志"
        message="将删除全部操作日志记录，此操作不可撤销。建议先备份数据。"
        onConfirm={handleClearLogs}
        loading={clearingLogs}
        variant="destructive"
      />
    </div>
  );
}
