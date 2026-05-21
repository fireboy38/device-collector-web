'use client';

import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Project, Department, formatDate, formatShortDate } from '@/lib/types';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, KeyRound, Search, Download, Upload } from 'lucide-react';

interface BatchResult {
  success: number;
  skipped: number;
  errors: string[];
}

export function DepartmentsTab() {
  const qc = useQueryClient();
  const [filterProject, setFilterProject] = useState('');

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then(r => r.json()),
  });

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ['departments', filterProject],
    queryFn: () => fetch(`/api/departments${filterProject && filterProject !== 'all' ? `?project_id=${filterProject}` : ''}`).then(r => r.json()),
  });

  // Add/Edit state
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Department | null>(null);
  const [deleteItem, setDeleteItem] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', projectId: '' });
  const [saving, setSaving] = useState(false);

  // Batch import state
  const [showImport, setShowImport] = useState(false);
  const [importProjectId, setImportProjectId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<BatchResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => setForm({ name: '', code: '', description: '', projectId: '' });

  const resetImportForm = () => {
    setImportProjectId('');
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('请输入单位名称');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        const res = await fetch(`/api/departments/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('更新成功');
      } else {
        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('添加成功');
      }
      qc.invalidateQueries({ queryKey: ['departments'] });
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
      const res = await fetch(`/api/departments/${deleteItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('删除成功');
      qc.invalidateQueries({ queryKey: ['departments'] });
      setDeleteItem(null);
    } catch {
      toast.error('删除失败');
    } finally {
      setSaving(false);
    }
  };

  const handleBatchImport = async () => {
    if (!importProjectId) {
      toast.error('请选择所属项目');
      return;
    }
    if (!importFile) {
      toast.error('请选择上传文件');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('project_id', importProjectId);
      formData.append('file', importFile);
      const res = await fetch('/api/departments/batch', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setImportResult(data);
      qc.invalidateQueries({ queryKey: ['departments'] });
      toast.success(`导入完成：成功 ${data.success} 条`);
    } catch {
      toast.error('导入失败');
    } finally {
      setImporting(false);
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
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold">单位列表</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="全部项目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {projects?.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <a href="/api/departments/template" download>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />下载模板
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { resetImportForm(); setShowImport(true); }}
          >
            <Upload className="w-4 h-4 mr-1" />批量导入
          </Button>
          <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" />添加单位
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
                  <TableHead>所属项目</TableHead>
                  <TableHead>单位名称</TableHead>
                  <TableHead>编码</TableHead>
                  <TableHead className="hidden md:table-cell">描述</TableHead>
                  <TableHead className="hidden sm:table-cell">创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments?.map(d => (
                  <TableRow key={d.id} className="table-row-hover">
                    <TableCell>{d.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{d.projectName || '-'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.code || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground">
                      {d.description || '-'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatShortDate(d.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setForm({ name: d.name, code: d.code || '', description: d.description || '', projectId: String(d.projectId) });
                            setEditItem(d);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          onClick={() => setDeleteItem(d)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!departments || departments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editItem} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? '编辑单位' : '添加单位'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>所属项目 *</Label>
              <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="-- 请选择项目 --" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>单位名称 *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="请输入单位名称"
                />
              </div>
              <div className="space-y-2">
                <Label>单位编码</Label>
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="如 FIN"
                />
              </div>
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

      {/* Batch Import Dialog */}
      <Dialog open={showImport} onOpenChange={v => { if (!v) setShowImport(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>批量导入单位</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>所属项目 *</Label>
              <Select value={importProjectId} onValueChange={setImportProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="-- 请选择项目 --" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>上传文件</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-emerald-300 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-muted-foreground mb-2">点击或拖拽文件到此区域上传</p>
                <p className="text-xs text-muted-foreground mb-3">支持 .csv, .txt 格式</p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="max-w-xs mx-auto"
                />
              </div>
              {importFile && (
                <p className="text-xs text-emerald-600">已选择: {importFile.name}</p>
              )}
            </div>

            {/* Import Result */}
            {importResult && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">导入结果：</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-600">成功: {importResult.success} 条</span>
                  <span className="text-amber-600">跳过: {importResult.skipped} 条</span>
                  {importResult.errors.length > 0 && (
                    <span className="text-red-600">错误: {importResult.errors.length} 条</span>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-xs text-red-600 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowImport(false)}>关闭</Button>
            <Button
              onClick={handleBatchImport}
              disabled={importing || !importProjectId || !importFile}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              开始导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={v => !v && setDeleteItem(null)}
        title="删除单位"
        message={`确定要删除单位"${deleteItem?.name}"吗？删除后不可恢复。`}
        onConfirm={handleDelete}
        loading={saving}
      />
    </div>
  );
}
