'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Project, User, formatDate, formatShortDate, formatRelativeTime } from '@/lib/types';
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
import { Plus, Pencil, Trash2, Loader2, KeyRound, Search, Download, Upload, Users, ChevronDown, ChevronUp, Clock, X, FileText, UserCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserActivity {
  id: number;
  logType: string;
  content: string;
  ipAddress: string | null;
  createdAt: string;
}

export function UsersTab() {
  const qc = useQueryClient();
  const [filterProject, setFilterProject] = useState('');

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then(r => r.json()),
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users', filterProject],
    queryFn: () => fetch(`/api/users${filterProject && filterProject !== 'all' ? `?project_id=${filterProject}` : ''}`).then(r => r.json()),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [deleteItem, setDeleteItem] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', password: '123456', displayName: '', projectId: '', role: 'user' });
  const [saving, setSaving] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  const { data: activityData, isLoading: activityLoading } = useQuery<UserActivity[]>({
    queryKey: ['user-activity', expandedUserId],
    queryFn: () => fetch(`/api/users/${expandedUserId}/activity`).then(r => r.json()),
    enabled: expandedUserId !== null,
  });

  const resetForm = () => setForm({ username: '', password: '123456', displayName: '', projectId: '', role: 'user' });

  const handleSave = async () => {
    if (!form.username.trim()) {
      toast.error('请输入用户名');
      return;
    }
    if (!editItem && !form.password.trim()) {
      toast.error('请输入密码');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        const res = await fetch(`/api/users/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, password: form.password || undefined }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('更新成功');
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('添加成功');
      }
      qc.invalidateQueries({ queryKey: ['users'] });
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
      const res = await fetch(`/api/users/${deleteItem.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('删除成功');
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteItem(null);
    } catch {
      toast.error('删除失败');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPwd = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '123456' }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(data.message || '密码已重置为 123456');
    } catch {
      toast.error('重置失败');
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
        <h2 className="text-lg font-semibold flex items-center gap-2">用户列表<Badge variant="secondary" className="text-[10px] ml-1 bg-muted text-muted-foreground">{users?.length ?? 0}</Badge></h2>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />导出<ChevronDown className="w-3 h-3 ml-0.5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/api/users/export?format=csv${filterProject && filterProject !== 'all' ? `&project_id=${filterProject}` : ''}`} download className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />导出 CSV
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/users/export?format=xlsx${filterProject && filterProject !== 'all' ? `&project_id=${filterProject}` : ''}`} download className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />导出 XLSX
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-1" />添加用户
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-muted/80 to-muted/40">
                  <TableHead className="w-12">ID</TableHead>
                  <TableHead>用户名</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>所属项目</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead className="hidden sm:table-cell">最后登录</TableHead>
                  <TableHead className="hidden sm:table-cell">登录次数</TableHead>
                  <TableHead className="hidden md:table-cell">创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map(u => {
                  const isExpanded = expandedUserId === u.id;
                  return (
                    <TableRow
                      key={u.id}
                      className={`table-row-hover ${isExpanded ? 'border-l-2 border-l-emerald-400 bg-muted/20' : ''}`}
                    >
                      <TableCell>{u.id}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                              u.lastLoginAt && (Date.now() - new Date(u.lastLoginAt).getTime()) < 5 * 60 * 1000
                                ? 'bg-emerald-500 animate-pulse'
                                : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          <button
                            onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                            className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
                          >
                            {u.username}
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>{u.displayName || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{u.projectName || '未关联'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            u.role === 'admin'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {u.role === 'admin' ? '管理员' : '普通用户'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {u.lastLoginAt ? formatRelativeTime(u.lastLoginAt) : '从未登录'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800">
                          {u.loginCount ?? 0} 次
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatShortDate(u.createdAt)}
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
                                  setForm({
                                    username: u.username,
                                    password: '',
                                    displayName: u.displayName || '',
                                    projectId: u.projectId ? String(u.projectId) : '',
                                    role: u.role,
                                  });
                                  setEditItem(u);
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
                                className="h-8 w-8"
                                onClick={() => handleResetPwd(u.id)}
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">重置密码</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => setDeleteItem(u)}
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
                  );
                })}
                {/* Activity panel row */}
                {users?.map(u => {
                  if (expandedUserId !== u.id) return null;
                  return (
                    <TableRow key={`activity-${u.id}`} className="bg-transparent hover:bg-transparent">
                      <TableCell colSpan={9} className="p-0 border-0">
                        <div className="mx-4 my-2 rounded-lg bg-muted/30 border-l-2 border-emerald-400 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                              <Clock className="w-4 h-4" />
                              登录活动
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setExpandedUserId(null)}
                            >
                              <X className="w-3 h-3 mr-1" />关闭
                            </Button>
                          </div>
                          {activityLoading ? (
                            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              加载中...
                            </div>
                          ) : activityData && activityData.length > 0 ? (
                            <div className="max-h-40 overflow-y-auto space-y-1.5">
                              {activityData.map(a => (
                                <div key={a.id} className="flex items-center gap-2 text-xs">
                                  <span
                                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                      a.logType === 'USER_LOGIN'
                                        ? 'bg-emerald-500'
                                        : a.logType === 'LOGIN_FAILED'
                                          ? 'bg-red-500'
                                          : 'bg-red-800'
                                    }`}
                                  />
                                  <span className="text-muted-foreground truncate max-w-[50%]">{a.content}</span>
                                  {a.ipAddress && (
                                    <span className="font-mono text-muted-foreground/70">{a.ipAddress}</span>
                                  )}
                                  <span className="ml-auto text-muted-foreground/60 shrink-0">
                                    {formatRelativeTime(a.createdAt)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground py-2">暂无登录记录</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!users || users.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-50 to-cyan-100/50 dark:from-cyan-950/30 dark:to-cyan-900/20 flex items-center justify-center">
                          <Users className="w-10 h-10 text-cyan-300 dark:text-cyan-700" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">暂无用户</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">添加第一个用户开始分配权限</p>
                        </div>
                        <Button variant="outline" size="sm" className="mt-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30" onClick={() => { resetForm(); setShowAdd(true); }}>
                          <Plus className="w-3.5 h-3.5 mr-1" />添加第一个用户
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
      <Dialog open={showAdd || !!editItem} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? '编辑用户' : '添加用户'}</DialogTitle>
            <DialogDescription className="sr-only">{editItem ? '修改用户信息和角色权限' : '创建新用户并分配项目与角色'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>用户名 *</Label>
                <Input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  disabled={!!editItem}
                  placeholder="登录用户名"
                />
              </div>
              <div className="space-y-2">
                <Label>{editItem ? '新密码（留空不变）' : '密码 *'}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editItem ? '留空则不修改' : '登录密码'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="显示名称"
                />
              </div>
              <div className="space-y-2">
                <Label>所属项目</Label>
                <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- 不关联 --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不关联</SelectItem>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
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
        title="删除用户"
        message={`确定要删除用户"${deleteItem?.username}"吗？删除后不可恢复。`}
        onConfirm={handleDelete}
        loading={saving}
      />
    </div>
  );
}
