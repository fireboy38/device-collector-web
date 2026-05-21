'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Device, LogEntry, ApiKeyItem, Project, Department, CHART_COLORS, formatDate, formatShortDate } from '@/lib/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Monitor, Pencil, Trash2, Eye, AlertTriangle, Search, Download, Upload, RefreshCw,
  CheckCircle2, XCircle, Copy, Loader2, ChevronLeft, ChevronRight,
  Server, Cpu, HardDrive, Network, Wifi, Users, Globe, FileText, KeyRound, Plus, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const LOG_TYPE_COLORS: Record<string, string> = {
  USER_LOGIN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOGIN_FAILED: 'bg-red-50 text-red-700 border-red-200',
  LOGIN_LOCKOUT: 'bg-red-100 text-red-900 border-red-300',
  DEVICE_SUBMIT: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  DEVICE_EDIT: 'bg-amber-50 text-amber-700 border-amber-200',
  DEVICE_DELETE: 'bg-red-50 text-red-700 border-red-200',
  DEPT_ADD: 'bg-teal-50 text-teal-700 border-teal-200',
  DEPT_EDIT: 'bg-amber-50 text-amber-700 border-amber-200',
  DEPT_DELETE: 'bg-red-50 text-red-700 border-red-200',
  APIKEY_CREATE: 'bg-purple-50 text-purple-700 border-purple-200',
  SYSTEM: 'bg-slate-100 text-slate-700 border-slate-200',
  DUPLICATE_WARNING: 'bg-amber-100 text-amber-800 border-amber-300',
  DUPLICATE_CONFIRMED: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function LogsTab() {
  const qc = useQueryClient();
  const [logType, setLogType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['logs', logType, keyword, page],
    queryFn: () => fetch(`/api/logs?log_type=${logType}&keyword=${keyword}&page=${page}&per_page=20`).then(r => r.json()),
  });
  const [clearConfirm, setClearConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleClear = async () => {
    setSaving(true);
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      toast.success('日志已清空');
      qc.invalidateQueries({ queryKey: ['logs'] });
      setClearConfirm(false);
    } catch { toast.error('清空失败'); } finally { setSaving(false); }
  };

  if (isLoading) return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap gap-3 items-end">
        <Skeleton className="h-9 w-[160px]" />
        <Skeleton className="h-9 w-[200px]" />
        <Skeleton className="h-9 w-[80px]" />
        <Skeleton className="h-9 w-[80px]" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 flex-1 max-w-[200px]" />
                <Skeleton className="h-4 w-16 hidden md:block" />
                <Skeleton className="h-4 w-24 hidden sm:block" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">日志类型</Label>
          <Input className="w-[160px]" placeholder="如 USER_LOGIN" value={logType} onChange={e => { setLogType(e.target.value); setPage(1); }} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">关键词搜索</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-8 w-[200px]" placeholder="搜索内容/操作人" value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={() => setClearConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-1" />清空日志
          </Button>
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['logs'] })}>
            <RefreshCw className="w-4 h-4 mr-1" />刷新
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead className="hidden md:table-cell">详情</TableHead>
                  <TableHead className="hidden sm:table-cell">操作人</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.items?.map((l: LogEntry) => (
                  <TableRow key={l.id} className="table-row-hover">
                    <TableCell>{l.id}</TableCell>
                    <TableCell>
                      <Badge className={LOG_TYPE_COLORS[l.logType] || 'bg-slate-50 text-slate-700 border-slate-200'} variant="outline">
                        {l.logType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{l.content}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground text-sm">{l.detail || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{l.operator || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">{l.ipAddress || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(l.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {(!data?.items || data.items.length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox className="w-10 h-10 text-muted-foreground/30" />
                      <p>暂无日志记录</p>
                      <p className="text-xs">系统操作将自动记录在此处</p>
                    </div>
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">第 {page} / {data.totalPages} 页</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={clearConfirm}
        onOpenChange={setClearConfirm}
        title="清空日志"
        message="确定要清空所有操作日志吗？此操作不可恢复。"
        onConfirm={handleClear}
        loading={saving}
        variant="warning"
      />
    </div>
  );
}
