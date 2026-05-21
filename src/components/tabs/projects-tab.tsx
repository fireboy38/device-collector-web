'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Project, formatDate, formatShortDate } from '@/lib/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, KeyRound, Search, Download, Upload, Inbox, ChevronDown, FileText, FolderKanban } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ProjectsTab() {
  const qc = useQueryClient();
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then(r => r.json()),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);
  const [deleteItem, setDeleteItem] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  const resetForm = () => setForm({ name: '', code: '', description: '' });

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('请输入项目名称');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        const res = await fetch(`/api/projects/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('更新成功');
      } else {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('添加成功');
      }
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      setShowAdd(false);
      setEditItem(null);
      resetForm();
    } catch {
      toast.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${deleteItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('删除成功');
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      setDeleteItem(null);
    } catch {
      toast.error('删除失败');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">项目列表<Badge variant="secondary" className="text-[10px] ml-1 bg-muted text-muted-foreground">{projects?.length ?? 0}</Badge></h2>
        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />导出<ChevronDown className="w-3 h-3 ml-0.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href="/api/projects/export?format=csv" download className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />导出 CSV
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/api/projects/export?format=xlsx" download className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />导出 XLSX
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" />新建项目
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
                  <TableHead>项目名称</TableHead>
                  <TableHead>编码</TableHead>
                  <TableHead className="hidden md:table-cell">描述</TableHead>
                  <TableHead>用户数</TableHead>
                  <TableHead>单位数</TableHead>
                  <TableHead>设备数</TableHead>
                  <TableHead className="hidden sm:table-cell">创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects?.map(p => (
                  <TableRow key={p.id} className="table-row-hover">
                    <TableCell>{p.id}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{p.code || '-'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground">
                      {p.description || '-'}
                    </TableCell>
                    <TableCell className="tabular-nums">{p.userCount ?? 0}</TableCell>
                    <TableCell className="tabular-nums">{p.deptCount ?? 0}</TableCell>
                    <TableCell className="tabular-nums">{p.deviceCount ?? 0}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatShortDate(p.createdAt)}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={300}>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setForm({ name: p.name, code: p.code || '', description: p.description || '' });
                                setEditItem(p);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">编辑</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                              onClick={() => setDeleteItem(p)}
                            >
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
                {(!projects || projects.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                          <FolderKanban className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">暂无项目</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">点击新建项目按钮创建第一个项目</p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => { resetForm(); setShowAdd(true); }}>
                          <Plus className="w-3.5 h-3.5 mr-1" />新建项目
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

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editItem} onOpenChange={(v) => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? '编辑项目' : '新建项目'}</DialogTitle>
            <DialogDescription className="sr-only">{editItem ? '修改项目基本信息' : '填写项目信息创建新项目'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>项目名称 *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="请输入项目名称"
              />
            </div>
            <div className="space-y-2">
              <Label>项目编码</Label>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="如 HQ"
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="简要描述"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditItem(null); }}>取消</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={v => !v && setDeleteItem(null)}
        title="删除项目"
        message={`确定要删除项目"${deleteItem?.name}"吗？删除后不可恢复。`}
        onConfirm={handleDelete}
        loading={saving}
      />
    </div>
  );
}
