'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Device, LogEntry, ApiKeyItem, Project, Department, CHART_COLORS, formatDate, formatShortDate } from '@/lib/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Monitor, Pencil, Trash2, Eye, AlertTriangle, Search, Download, Upload, RefreshCw,
  CheckCircle2, XCircle, Copy, Loader2, ChevronLeft, ChevronRight,
  Server, Cpu, HardDrive, Network, Wifi, Users, Globe, FileText, KeyRound, Plus, Shield } from 'lucide-react';

export function ApiKeysTab() {
  const qc = useQueryClient();
  const { data: keys, isLoading } = useQuery<ApiKeyItem[]>({ queryKey: ['apikeys'], queryFn: () => fetch('/api/apikeys').then(r => r.json()) });
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', permissions: 'read', description: '', expiresAt: '' });
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ApiKeyItem | null>(null);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('请输入名称'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/apikeys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setNewKey(data.apiKey);
      toast.success('API Key 创建成功');
      qc.invalidateQueries({ queryKey: ['apikeys'] });
      setShowAdd(false);
      setForm({ name: '', permissions: 'read', description: '', expiresAt: '' });
    } catch { toast.error('创建失败'); } finally { setSaving(false); }
  };

  const handleToggle = async (key: ApiKeyItem) => {
    try {
      await fetch(`/api/apikeys/${key.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: key.isActive ? 0 : 1 }) });
      qc.invalidateQueries({ queryKey: ['apikeys'] });
      toast.success(key.isActive ? '已禁用' : '已启用');
    } catch { toast.error('操作失败'); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await fetch(`/api/apikeys/${deleteItem.id}`, { method: 'DELETE' });
      toast.success('删除成功');
      qc.invalidateQueries({ queryKey: ['apikeys'] });
      setDeleteItem(null);
    } catch { toast.error('删除失败'); } finally { setSaving(false); }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('已复制到剪贴板');
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">API Key 管理</h2>
        <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" />创建 API Key
        </Button>
      </div>

      {/* New Key Display */}
      {newKey && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800 mb-1">新 API Key 已创建</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-white px-3 py-2 rounded border border-emerald-200 break-all text-emerald-900">
                    {newKey}
                  </code>
                  <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 flex-shrink-0" onClick={() => copyKey(newKey)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  此密钥仅显示一次，请立即复制保存
                </p>
                <Button variant="ghost" size="sm" className="mt-2 text-emerald-600 hover:text-emerald-800" onClick={() => setNewKey(null)}>
                  关闭
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>权限</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="hidden md:table-cell">描述</TableHead>
                  <TableHead className="hidden lg:table-cell">最后使用</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys?.map(k => (
                  <TableRow key={k.id} className="table-row-hover">
                    <TableCell>{k.id}</TableCell>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>
                      <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded max-w-[160px] inline-block truncate align-bottom">
                        {k.apiKey}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge className={k.permissions === 'readwrite' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'} variant="outline">
                        {k.permissions === 'readwrite' ? '读写' : '只读'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 ${k.isActive ? 'text-emerald-600 hover:text-emerald-800' : 'text-slate-400 hover:text-slate-600'}`}
                        onClick={() => handleToggle(k)}
                      >
                        {k.isActive ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                        {k.isActive ? '启用' : '禁用'}
                      </Button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[160px] truncate text-sm text-muted-foreground">{k.description || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{k.lastUsedAt ? formatDate(k.lastUsedAt) : '-'}</TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={300}>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyKey(k.apiKey)}>
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">复制</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteItem(k)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">删除</TooltipContent>
                        </Tooltip>
                      </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
                {(!keys || keys.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                          <Shield className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">暂无 API Key</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">点击创建按钮生成新的 API Key</p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAdd(true)}>
                          <Plus className="w-3.5 h-3.5 mr-1" />创建 API Key
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) setShowAdd(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              创建 API Key
            </DialogTitle>
            <DialogDescription className="sr-only">创建新的API密钥用于接口访问认证</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="输入 API Key 名称" />
            </div>
            <div className="space-y-2">
              <Label>权限</Label>
              <Select value={form.permissions} onValueChange={v => setForm(f => ({ ...f, permissions: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">只读</SelectItem>
                  <SelectItem value="readwrite">读写</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>过期时间</Label>
              <Input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="简要描述用途" rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={v => !v && setDeleteItem(null)}
        title="删除 API Key"
        message={`确定要删除 API Key"${deleteItem?.name}"吗？删除后使用该 Key 的应用将无法访问。`}
        onConfirm={handleDelete}
        loading={saving}
      />
    </div>
  );
}
