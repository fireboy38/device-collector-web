'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LoginPage from '@/components/login-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  LayoutDashboard, FolderKanban, Users, Building2, Monitor, Globe, FileText, KeyRound,
  LogOut, Plus, Pencil, Trash2, Search, Download, Upload, RefreshCw, Eye, AlertTriangle,
  CheckCircle2, XCircle, Copy, Loader2, ChevronLeft, ChevronRight, Server, Cpu, HardDrive,
  Network, Wifi
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';

// ===== Types =====
interface Project { id: number; name: string; code: string | null; description: string | null; createdAt: string; userCount?: number; deptCount?: number; deviceCount?: number; }
interface User { id: number; username: string; displayName: string | null; projectId: number | null; projectName: string | null; role: string; createdAt: string; }
interface Department { id: number; projectId: number; projectName: string | null; name: string; code: string | null; description: string | null; createdAt: string; }
interface Device { id: number; departmentId: number; departmentName: string | null; departmentCode: string | null; projectId: number | null; projectName: string | null; userName: string; userPhone: string | null; userPosition: string | null; computerName: string | null; ipAddress: string | null; macAddress: string | null; dhcpEnabled: string | null; osInfo: string | null; cpuInfo: string | null; ramInfo: string | null; diskInfo: string | null; motherboardInfo: string | null; gpuInfo: string | null; networkAdapter: string | null; subnetMask: string | null; gateway: string | null; dnsServers: string | null; collectedAt: string; }
interface LogEntry { id: number; logType: string; content: string; detail: string | null; operator: string | null; ipAddress: string | null; createdAt: string; }
interface ApiKeyItem { id: number; name: string; apiKey: string; description: string | null; permissions: string; isActive: number; lastUsedAt: string | null; createdAt: string; expiresAt: string | null; }
interface Stats { deviceCount: number; todayCount: number; projectCount: number; deptCount: number; userCount: number; projectStats: { id: number; name: string; code: string | null; deviceCount: number; deptCount: number }[]; recentDevices: { id: number; userName: string; computerName: string | null; ipAddress: string | null; projectName: string | null; departmentName: string | null; collectedAt: string }[]; }

const CHART_COLORS = ['#059669', '#0d9488', '#0891b2', '#0284c7', '#7c3aed', '#c026d3', '#e11d48', '#ea580c'];

// ===== Helper =====
function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString('zh-CN');
}

// ===== Confirm Dialog =====
function ConfirmDialog({ open, onOpenChange, title, message, onConfirm, loading }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; message: string; onConfirm: () => void; loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>取消</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Main App =====
export default function HomePage() {
  const { user, checking, checkAuth, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleChangePwd = async () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) { toast.error('请填写完整'); return; }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast.error('两次密码不一致'); return; }
    if (pwdForm.newPassword.length < 6) { toast.error('新密码至少6位'); return; }
    setPwdSaving(true);
    try {
      const res = await fetch('/api/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('密码修改成功');
      setShowChangePwd(false);
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch { toast.error('修改失败'); } finally { setPwdSaving(false); }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">设备信息采集器</h1>
              <p className="text-xs text-emerald-100 hidden sm:block">统一管理项目、用户、单位信息与终端设备采集数据</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-emerald-100 hidden sm:inline">
              {user.displayName || user.username}
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{user.role === 'admin' ? '管理员' : '用户'}</Badge>
            </span>
            <Button variant="ghost" size="sm" className="text-emerald-100 hover:text-white hover:bg-white/10" onClick={() => setShowChangePwd(true)}>
              <KeyRound className="w-4 h-4 mr-1" />改密
            </Button>
            <Button variant="ghost" size="sm" className="text-emerald-100 hover:text-white hover:bg-white/10" onClick={logout}>
              <LogOut className="w-4 h-4 mr-1" />登出
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent h-12 gap-0 p-0 overflow-x-auto">
              {[
                { value: 'dashboard', icon: LayoutDashboard, label: '数据概览' },
                { value: 'projects', icon: FolderKanban, label: '项目管理' },
                { value: 'users', icon: Users, label: '用户管理' },
                { value: 'departments', icon: Building2, label: '单位管理' },
                { value: 'devices', icon: Monitor, label: '设备列表' },
                { value: 'ipmap', icon: Globe, label: 'IP 分布' },
                { value: 'logs', icon: FileText, label: '操作日志' },
                { value: 'apikeys', icon: KeyRound, label: 'API 管理' },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:text-emerald-700 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none px-3 sm:px-4 h-12 text-sm gap-1.5">
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="dashboard" className="mt-6"><DashboardTab /></TabsContent>
            <TabsContent value="projects" className="mt-6"><ProjectsTab /></TabsContent>
            <TabsContent value="users" className="mt-6"><UsersTab /></TabsContent>
            <TabsContent value="departments" className="mt-6"><DepartmentsTab /></TabsContent>
            <TabsContent value="devices" className="mt-6"><DevicesTab /></TabsContent>
            <TabsContent value="ipmap" className="mt-6"><IpMapTab /></TabsContent>
            <TabsContent value="logs" className="mt-6"><LogsTab /></TabsContent>
            <TabsContent value="apikeys" className="mt-6"><ApiKeysTab /></TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white py-3 text-center text-xs text-slate-400">
        设备信息采集器 · 管理端 v2.0 · Powered by Next.js
      </footer>

      {/* Change Password Dialog */}
      <Dialog open={showChangePwd} onOpenChange={setShowChangePwd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>修改密码</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>旧密码</Label><Input type="password" value={pwdForm.oldPassword} onChange={e => setPwdForm(f => ({ ...f, oldPassword: e.target.value }))} placeholder="请输入当前密码" /></div>
            <div className="space-y-2"><Label>新密码</Label><Input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="至少6位" /></div>
            <div className="space-y-2"><Label>确认新密码</Label><Input type="password" value={pwdForm.confirmPassword} onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="再次输入新密码" onKeyDown={e => e.key === 'Enter' && handleChangePwd()} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowChangePwd(false)}>取消</Button>
            <Button onClick={handleChangePwd} disabled={pwdSaving} className="bg-emerald-600 hover:bg-emerald-700">{pwdSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}确认修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Dashboard Tab ====================
function DashboardTab() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then(r => r.json()),
  });

  if (isLoading) return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <Card key={i}><CardContent className="p-5"><div className="h-20 animate-pulse bg-slate-100 rounded" /></CardContent></Card>
        ))}
      </div>
      <Card><CardContent className="p-6"><div className="h-64 animate-pulse bg-slate-100 rounded" /></CardContent></Card>
    </div>
  );
  if (!stats) return null;

  const statCards = [
    { label: '设备总数', value: stats.deviceCount, icon: Monitor, color: 'emerald', sub: `${stats.projectCount} 个项目` },
    { label: '今日采集', value: stats.todayCount, icon: CheckCircle2, color: 'teal', sub: stats.todayCount > 0 ? '持续增长中' : '暂无采集' },
    { label: '单位数量', value: stats.deptCount, icon: Building2, color: 'cyan', sub: `${stats.projectCount} 个项目下` },
    { label: '用户数量', value: stats.userCount, icon: Users, color: 'amber', sub: '活跃用户' },
  ];

  const colorMap: any = {
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200/50',
    teal: 'from-teal-500 to-teal-600 shadow-teal-200/50',
    cyan: 'from-cyan-500 to-cyan-600 shadow-cyan-200/50',
    amber: 'from-amber-500 to-amber-600 shadow-amber-200/50',
  };
  const bgMap: any = {
    emerald: 'bg-emerald-50 border-emerald-100',
    teal: 'bg-teal-50 border-teal-100',
    cyan: 'bg-cyan-50 border-cyan-100',
    amber: 'bg-amber-50 border-amber-100',
  };

  const pieData = stats.projectStats.map(p => ({ name: p.name, value: p.deviceCount, deptCount: p.deptCount }));

  return (
    <div className="space-y-6 pb-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={s.label} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-bold mt-1.5 tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[s.color]} flex items-center justify-center shadow-lg`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar Chart */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">各项目设备数量分布</CardTitle></CardHeader>
          <CardContent>
            {stats.projectStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.projectStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(value: number, name: string) => [value, name === 'deviceCount' ? '设备数' : name]} />
                  <Bar dataKey="deviceCount" name="设备数量" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {stats.projectStats.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">暂无数据</p>}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">设备分布占比</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 && pieData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">暂无数据</p>}
          </CardContent>
        </Card>
      </div>

      {/* Project Stats + Recent Records */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Project Detail Cards */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">项目概况</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.projectStats.map((p, i) => (
              <div key={p.id} className={`p-3 rounded-lg border ${bgMap[['emerald','teal','cyan','amber'][i % 4]]}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">{p.code || '-'}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>设备 <strong className="text-foreground">{p.deviceCount}</strong></span>
                  <span>单位 <strong className="text-foreground">{p.deptCount}</strong></span>
                </div>
              </div>
            ))}
            {stats.projectStats.length === 0 && <p className="text-center text-muted-foreground py-4">暂无项目</p>}
          </CardContent>
        </Card>

        {/* Recent Records */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">最近采集记录</CardTitle></CardHeader>
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
                {stats.recentDevices.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.userName}</TableCell>
                    <TableCell className="text-sm">{d.computerName || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{d.ipAddress || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-[10px]">{d.projectName || '-'}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{formatDate(d.collectedAt)}</TableCell>
                  </TableRow>
                ))}
                {stats.recentDevices.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">暂无记录</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== Projects Tab ====================
function ProjectsTab() {
  const qc = useQueryClient();
  const { data: projects, isLoading } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => fetch('/api/projects').then(r => r.json()) });
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Project | null>(null);
  const [deleteItem, setDeleteItem] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);

  const resetForm = () => setForm({ name: '', code: '', description: '' });

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) {
        const res = await fetch(`/api/projects/${editItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('更新成功');
      } else {
        const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('添加成功');
      }
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowAdd(false); setEditItem(null); resetForm();
    } catch { toast.error('操作失败'); } finally { setSaving(false); }
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
      setDeleteItem(null);
    } catch { toast.error('删除失败'); } finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">项目列表</h2>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-1" />新建项目
        </Button>
      </div>

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
                  <TableRow key={p.id}>
                    <TableCell>{p.id}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell><Badge variant="outline">{p.code || '-'}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate">{p.description || '-'}</TableCell>
                    <TableCell>{p.userCount ?? 0}</TableCell>
                    <TableCell>{p.deptCount ?? 0}</TableCell>
                    <TableCell>{p.deviceCount ?? 0}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatShortDate(p.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setForm({ name: p.name, code: p.code || '', description: p.description || '' }); setEditItem(p); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteItem(p)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!projects || projects.length === 0) && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editItem} onOpenChange={(v) => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? '编辑项目' : '新建项目'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>项目名称 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="请输入项目名称" />
            </div>
            <div className="space-y-2">
              <Label>项目编码</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="如 HQ" />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="简要描述" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditItem(null); }}>取消</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)} title="删除项目" message={`确定要删除项目"${deleteItem?.name}"吗？`} onConfirm={handleDelete} loading={saving} />
    </div>
  );
}

// ==================== Users Tab ====================
function UsersTab() {
  const qc = useQueryClient();
  const [filterProject, setFilterProject] = useState('');
  const { data: projects } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => fetch('/api/projects').then(r => r.json()) });
  const { data: users, isLoading } = useQuery<User[]>({ queryKey: ['users', filterProject], queryFn: () => fetch(`/api/users${filterProject ? `?project_id=${filterProject}` : ''}`).then(r => r.json()) });
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<User | null>(null);
  const [deleteItem, setDeleteItem] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', password: '123456', displayName: '', projectId: '', role: 'user' });
  const [saving, setSaving] = useState(false);

  const resetForm = () => setForm({ username: '', password: '123456', displayName: '', projectId: '', role: 'user' });

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) {
        const res = await fetch(`/api/users/${editItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, password: form.password || undefined }) });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('更新成功');
      } else {
        const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('添加成功');
      }
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowAdd(false); setEditItem(null); resetForm();
    } catch { toast.error('操作失败'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await fetch(`/api/users/${deleteItem.id}`, { method: 'DELETE' });
      toast.success('删除成功');
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteItem(null);
    } catch { toast.error('删除失败'); } finally { setSaving(false); }
  };

  const handleResetPwd = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: '123456' }) });
      const data = await res.json();
      toast.success(data.message);
    } catch { toast.error('重置失败'); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold">用户列表</h2>
        <div className="flex gap-2 items-center">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="全部项目" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" />添加用户</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">ID</TableHead><TableHead>用户名</TableHead><TableHead>姓名</TableHead><TableHead>所属项目</TableHead><TableHead>角色</TableHead><TableHead className="hidden sm:table-cell">创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {users?.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{u.displayName || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{u.projectName || '未关联'}</Badge></TableCell>
                    <TableCell><Badge className={u.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} variant="outline">{u.role === 'admin' ? '管理员' : '用户'}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatShortDate(u.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setForm({ username: u.username, password: '', displayName: u.displayName || '', projectId: u.projectId ? String(u.projectId) : '', role: u.role }); setEditItem(u); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleResetPwd(u.id)} title="重置密码">
                          <KeyRound className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteItem(u)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!users || users.length === 0) && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editItem} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? '编辑用户' : '添加用户'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>用户名 *</Label><Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} disabled={!!editItem} placeholder="登录用户名" /></div>
              <div className="space-y-2"><Label>{editItem ? '新密码（留空不变）' : '密码 *'}</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={editItem ? '留空不变' : '登录密码'} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>姓名</Label><Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="显示名称" /></div>
              <div className="space-y-2"><Label>所属项目</Label>
                <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v }))}>
                  <SelectTrigger><SelectValue placeholder="-- 不关联 --" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不关联</SelectItem>
                    {projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>角色</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="user">普通用户</SelectItem><SelectItem value="admin">管理员</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditItem(null); }}>取消</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)} title="删除用户" message={`确定要删除用户"${deleteItem?.username}"吗？`} onConfirm={handleDelete} loading={saving} />
    </div>
  );
}

// ==================== Departments Tab ====================
function DepartmentsTab() {
  const qc = useQueryClient();
  const [filterProject, setFilterProject] = useState('');
  const { data: projects } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => fetch('/api/projects').then(r => r.json()) });
  const { data: departments, isLoading } = useQuery<Department[]>({ queryKey: ['departments', filterProject], queryFn: () => fetch(`/api/departments${filterProject && filterProject !== 'all' ? `?project_id=${filterProject}` : ''}`).then(r => r.json()) });
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Department | null>(null);
  const [deleteItem, setDeleteItem] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '', projectId: '' });
  const [saving, setSaving] = useState(false);

  const resetForm = () => setForm({ name: '', code: '', description: '', projectId: '' });

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) {
        const res = await fetch(`/api/departments/${editItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('更新成功');
      } else {
        const res = await fetch('/api/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('添加成功');
      }
      qc.invalidateQueries({ queryKey: ['departments'] });
      setShowAdd(false); setEditItem(null); resetForm();
    } catch { toast.error('操作失败'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await fetch(`/api/departments/${deleteItem.id}`, { method: 'DELETE' });
      toast.success('删除成功');
      qc.invalidateQueries({ queryKey: ['departments'] });
      setDeleteItem(null);
    } catch { toast.error('删除失败'); } finally { setSaving(false); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-semibold">单位列表</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="全部项目" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部项目</SelectItem>
              {projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <a href="/api/departments/template" download><Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />下载模板</Button></a>
          <Button onClick={() => { resetForm(); setShowAdd(true); }} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" />添加单位</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">ID</TableHead><TableHead>所属项目</TableHead><TableHead>单位名称</TableHead><TableHead>编码</TableHead><TableHead className="hidden md:table-cell">描述</TableHead><TableHead className="hidden sm:table-cell">创建时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {departments?.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.id}</TableCell>
                    <TableCell><Badge variant="outline">{d.projectName || '-'}</Badge></TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.code || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate">{d.description || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatShortDate(d.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setForm({ name: d.name, code: d.code || '', description: d.description || '', projectId: String(d.projectId) }); setEditItem(d); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteItem(d)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!departments || departments.length === 0) && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd || !!editItem} onOpenChange={v => { if (!v) { setShowAdd(false); setEditItem(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editItem ? '编辑单位' : '添加单位'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>所属项目 *</Label>
              <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v }))}>
                <SelectTrigger><SelectValue placeholder="-- 请选择 --" /></SelectTrigger>
                <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>单位名称 *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="请输入单位名称" /></div>
              <div className="space-y-2"><Label>单位编码</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="如 IT-001" /></div>
            </div>
            <div className="space-y-2"><Label>描述</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="简要描述" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditItem(null); }}>取消</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)} title="删除单位" message={`确定要删除单位"${deleteItem?.name}"吗？`} onConfirm={handleDelete} loading={saving} />
    </div>
  );
}

// ==================== Devices Tab ====================
function DevicesTab() {
  const qc = useQueryClient();
  const [filterProject, setFilterProject] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [keyword, setKeyword] = useState('');
  const { data: projects } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => fetch('/api/projects').then(r => r.json()) });
  const { data: departments } = useQuery<Department[]>({ queryKey: ['departments', filterProject], queryFn: () => fetch(`/api/departments${filterProject && filterProject !== 'all' ? `?project_id=${filterProject}` : ''}`).then(r => r.json()), enabled: !!filterProject && filterProject !== 'all' });
  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ['devices', filterProject, filterDept, keyword],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterProject && filterProject !== 'all') params.set('project_id', filterProject);
      if (filterDept && filterDept !== 'all') params.set('department_id', filterDept);
      if (keyword) params.set('keyword', keyword);
      return fetch(`/api/devices?${params}`).then(r => r.json());
    }
  });
  const [viewDevice, setViewDevice] = useState<Device | null>(null);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [deleteItem, setDeleteItem] = useState<Device | null>(null);
  const [dupResult, setDupResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await fetch(`/api/devices/${deleteItem.id}`, { method: 'DELETE' });
      toast.success('删除成功');
      qc.invalidateQueries({ queryKey: ['devices'] });
      setDeleteItem(null);
    } catch { toast.error('删除失败'); } finally { setSaving(false); }
  };

  const handleEditSave = async () => {
    if (!editDevice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/devices/${editDevice.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('更新成功');
      qc.invalidateQueries({ queryKey: ['devices'] });
      setEditDevice(null);
    } catch { toast.error('更新失败'); } finally { setSaving(false); }
  };

  const checkDuplicates = async () => {
    try {
      const res = await fetch('/api/devices/check-duplicates');
      const data = await res.json();
      setDupResult(data);
      if (data.totalDuplicateDevices === 0) toast.success('未发现重复设备');
    } catch { toast.error('查重失败'); }
  };

  const deviceFields = [
    { key: 'departmentId', label: '所属单位ID', type: 'number' },
    { key: 'userName', label: '使用人' }, { key: 'userPhone', label: '联系电话' }, { key: 'userPosition', label: '安装位置' },
    { key: 'computerName', label: '电脑名称' }, { key: 'ipAddress', label: 'IP地址' }, { key: 'macAddress', label: 'MAC地址' },
    { key: 'dhcpEnabled', label: 'DHCP' }, { key: 'osInfo', label: '操作系统' }, { key: 'cpuInfo', label: 'CPU' },
    { key: 'ramInfo', label: '内存' }, { key: 'diskInfo', label: '硬盘' }, { key: 'motherboardInfo', label: '主板' },
    { key: 'gpuInfo', label: '显卡' }, { key: 'networkAdapter', label: '网卡' }, { key: 'subnetMask', label: '子网掩码' },
    { key: 'gateway', label: '默认网关' }, { key: 'dnsServers', label: 'DNS服务器' },
  ];

  const detailLabels: Record<string, string> = {
    userName: '使用人', userPhone: '联系电话', userPosition: '安装位置',
    computerName: '电脑名称', ipAddress: 'IP地址', macAddress: 'MAC地址',
    dhcpEnabled: 'DHCP', osInfo: '操作系统', cpuInfo: 'CPU',
    ramInfo: '内存', diskInfo: '硬盘', motherboardInfo: '主板',
    gpuInfo: '显卡', networkAdapter: '网卡', subnetMask: '子网掩码',
    gateway: '默认网关', dnsServers: 'DNS服务器',
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-4 pb-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><Label className="text-xs">项目筛选</Label>
          <Select value={filterProject} onValueChange={v => { setFilterProject(v); setFilterDept(''); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="全部项目" /></SelectTrigger>
            <SelectContent><SelectItem value="all">全部项目</SelectItem>{projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">单位筛选</Label>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="全部单位" /></SelectTrigger>
            <SelectContent><SelectItem value="all">全部单位</SelectItem>{departments?.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">关键词搜索</Label>
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-8 w-[200px]" placeholder="姓名/电脑名/IP" value={keyword} onChange={e => setKeyword(e.target.value)} /></div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={checkDuplicates}><AlertTriangle className="w-4 h-4 mr-1" />查重</Button>
          <a href={`/api/devices/export?format=csv${filterProject && filterProject !== 'all' ? `&project_id=${filterProject}` : ''}`} download><Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />导出 CSV</Button></a>
        </div>
      </div>

      {/* Duplicate Results */}
      {dupResult && dupResult.totalDuplicateDevices > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-700 mb-2"><AlertTriangle className="w-5 h-5" /><span className="font-semibold">发现重复设备</span></div>
            <p className="text-sm text-amber-600">IP重复: {dupResult.ipDuplicateCount} 组, MAC重复: {dupResult.macDuplicateCount} 组, 涉及设备: {dupResult.totalDuplicateDevices} 台</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setDupResult(null)}>关闭</Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-12">ID</TableHead><TableHead>所属项目</TableHead><TableHead>所属单位</TableHead><TableHead>使用人</TableHead><TableHead className="hidden md:table-cell">电话</TableHead><TableHead>电脑名称</TableHead><TableHead>IP地址</TableHead><TableHead className="hidden lg:table-cell">MAC地址</TableHead><TableHead className="hidden sm:table-cell">DHCP</TableHead><TableHead className="hidden lg:table-cell">采集时间</TableHead><TableHead>操作</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {devices?.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>{d.id}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{d.projectName || '-'}</Badge></TableCell>
                    <TableCell className="text-sm">{d.departmentName || '-'}</TableCell>
                    <TableCell className="font-medium">{d.userName}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{d.userPhone || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{d.computerName || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{d.ipAddress || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">{d.macAddress || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell"><Badge className={d.dhcpEnabled === '是' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'} variant="outline">{d.dhcpEnabled || '-'}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatDate(d.collectedAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewDevice(d)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditForm({ departmentId: String(d.departmentId), userName: d.userName, userPhone: d.userPhone || '', userPosition: d.userPosition || '', computerName: d.computerName || '', ipAddress: d.ipAddress || '', macAddress: d.macAddress || '', dhcpEnabled: d.dhcpEnabled || '', osInfo: d.osInfo || '', cpuInfo: d.cpuInfo || '', ramInfo: d.ramInfo || '', diskInfo: d.diskInfo || '', motherboardInfo: d.motherboardInfo || '', gpuInfo: d.gpuInfo || '', networkAdapter: d.networkAdapter || '', subnetMask: d.subnetMask || '', gateway: d.gateway || '', dnsServers: d.dnsServers || '' }); setEditDevice(d); }}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteItem(d)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!devices || devices.length === 0) && <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Detail Dialog */}
      <Dialog open={!!viewDevice} onOpenChange={v => !v && setViewDevice(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-emerald-600" />
              设备详细信息
            </DialogTitle>
          </DialogHeader>
          {viewDevice && (
            <div className="space-y-4">
              {/* Header Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{viewDevice.projectName || '未知项目'}</Badge>
                <Badge variant="outline">{viewDevice.departmentName || '未知单位'}</Badge>
                <Badge variant="secondary" className="text-xs">{formatDate(viewDevice.collectedAt)}</Badge>
              </div>

              {/* Personnel Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />人员信息</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 rounded-lg p-3">
                  {[['使用人', viewDevice.userName], ['联系电话', viewDevice.userPhone], ['安装位置', viewDevice.userPosition]].map(([l, v]) => (
                    <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="text-sm font-medium">{v || '-'}</p></div>
                  ))}
                </div>
              </div>

              {/* Network Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" />网络信息</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
                  {[['IP地址', viewDevice.ipAddress, 'font-mono'], ['MAC地址', viewDevice.macAddress, 'font-mono'], ['DHCP', viewDevice.dhcpEnabled, ''], ['网卡', viewDevice.networkAdapter, ''], ['子网掩码', viewDevice.subnetMask, 'font-mono'], ['默认网关', viewDevice.gateway, 'font-mono'], ['DNS服务器', viewDevice.dnsServers, 'font-mono']].map(([l, v, cls]) => (
                    <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className={`text-sm font-medium break-all ${cls}`}>{v || '-'}</p></div>
                  ))}
                </div>
              </div>

              {/* Hardware Info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" />硬件信息</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3">
                  {[['电脑名称', viewDevice.computerName], ['操作系统', viewDevice.osInfo], ['CPU', viewDevice.cpuInfo], ['内存', viewDevice.ramInfo], ['硬盘', viewDevice.diskInfo], ['主板', viewDevice.motherboardInfo], ['显卡', viewDevice.gpuInfo]].map(([l, v]) => (
                    <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="text-sm font-medium break-all">{v || '-'}</p></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDevice} onOpenChange={v => !v && setEditDevice(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-emerald-600" />
              编辑设备信息
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Personnel */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />人员信息</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {deviceFields.filter(f => ['userName', 'userPhone', 'userPosition'].includes(f.key)).map(f => (
                  <div key={f.key} className="space-y-1"><Label className="text-xs">{f.label}</Label><Input value={editForm[f.key] || ''} onChange={e => setEditForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))} /></div>
                ))}
              </div>
            </div>
            {/* Network */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5" />网络信息</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deviceFields.filter(f => ['computerName', 'ipAddress', 'macAddress', 'dhcpEnabled', 'networkAdapter', 'subnetMask', 'gateway', 'dnsServers'].includes(f.key)).map(f => (
                  <div key={f.key} className="space-y-1"><Label className="text-xs">{f.label}</Label><Input value={editForm[f.key] || ''} onChange={e => setEditForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))} /></div>
                ))}
              </div>
            </div>
            {/* Hardware */}
            <div>
              <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" />硬件信息</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {deviceFields.filter(f => ['osInfo', 'cpuInfo', 'ramInfo', 'diskInfo', 'motherboardInfo', 'gpuInfo'].includes(f.key)).map(f => (
                  <div key={f.key} className="space-y-1"><Label className="text-xs">{f.label}</Label><Input value={editForm[f.key] || ''} onChange={e => setEditForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))} /></div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDevice(null)}>取消</Button>
            <Button onClick={handleEditSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)} title="删除设备" message={`确定要删除设备"${deleteItem?.computerName || deleteItem?.id}"吗？`} onConfirm={handleDelete} loading={saving} />
    </div>
  );
}

// ==================== IP Map Tab ====================
function IpMapTab() {
  const { data: devices } = useQuery<Device[]>({ queryKey: ['devices'], queryFn: () => fetch('/api/devices').then(r => r.json()) });
  const [subnet, setSubnet] = useState('');
  const [hoveredIp, setHoveredIp] = useState<{ ip: string; x: number; y: number; device?: Device } | null>(null);

  // Extract subnets from device IPs
  const subnets = new Map<string, number>();
  devices?.forEach(d => {
    if (d.ipAddress && d.ipAddress !== '未知' && d.ipAddress !== '0.0.0.0') {
      const parts = d.ipAddress.split('.');
      if (parts.length === 4) {
        const sn = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
        subnets.set(sn, (subnets.get(sn) || 0) + 1);
      }
    }
  });

  const subnetList = Array.from(subnets.entries()).sort((a, b) => b[1] - a[1]);
  const selectedSubnet = subnet || subnetList[0]?.[0] || '';
  const subnetPrefix = selectedSubnet.replace('.0/24', '');

  // Build IP grid
  const ipMap = new Map<string, Device>();
  devices?.forEach(d => {
    if (d.ipAddress && d.ipAddress !== '未知' && d.ipAddress !== '0.0.0.0') {
      ipMap.set(d.ipAddress, d);
    }
  });

  const usedInSubnet = devices?.filter(d => d.ipAddress?.startsWith(subnetPrefix)).length || 0;
  const totalInSubnet = 254;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">IP 地址使用分布</h2>
        <Select value={selectedSubnet} onValueChange={setSubnet}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="-- 选择网段 --" /></SelectTrigger>
          <SelectContent>
            {subnetList.map(([sn, count]) => <SelectItem key={sn} value={sn}>{sn} ({count} 台)</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedSubnet && (
        <>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>已使用: <strong className="text-emerald-600">{usedInSubnet}</strong></span>
            <span>可用: <strong>{totalInSubnet - usedInSubnet}</strong></span>
            <span>使用率: <strong>{((usedInSubnet / totalInSubnet) * 100).toFixed(1)}%</strong></span>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-8 sm:grid-cols-16 lg:grid-cols-32 gap-1">
                {Array.from({ length: 254 }, (_, i) => i + 1).map(host => {
                  const ip = `${subnetPrefix}.${host}`;
                  const device = ipMap.get(ip);
                  return (
                    <div
                      key={host}
                      className={`aspect-square rounded-sm flex items-center justify-center text-[8px] sm:text-[10px] cursor-pointer transition-all hover:scale-125 hover:z-10 ${device ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                      onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setHoveredIp({ ip, x: rect.right + 8, y: rect.top, device }); }}
                      onMouseLeave={() => setHoveredIp(null)}
                      title={device ? `${ip} - ${device.userName}` : ip}
                    >
                      {host}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-500" />已使用</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-slate-100 border" />未使用</div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tooltip */}
      {hoveredIp && (
        <div className="fixed bg-slate-900 text-white p-3 rounded-lg text-xs shadow-xl z-50 max-w-[280px] pointer-events-none" style={{ left: hoveredIp.x, top: hoveredIp.y }}>
          <p className="font-mono font-semibold mb-1">{hoveredIp.ip}</p>
          {hoveredIp.device ? (
            <div className="space-y-0.5">
              <p>使用人: {hoveredIp.device.userName}</p>
              <p>电脑: {hoveredIp.device.computerName || '-'}</p>
              <p>MAC: {hoveredIp.device.macAddress || '-'}</p>
              <p>单位: {hoveredIp.device.departmentName || '-'}</p>
            </div>
          ) : <p className="text-slate-400">未分配</p>}
        </div>
      )}
    </div>
  );
}

// ==================== Logs Tab ====================
function LogsTab() {
  const qc = useQueryClient();
  const [logType, setLogType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['logs', logType, keyword, page], queryFn: () => fetch(`/api/logs?log_type=${logType}&keyword=${keyword}&page=${page}&per_page=20`).then(r => r.json()) });
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

  const logTypeColors: Record<string, string> = {
    USER_LOGIN: 'bg-emerald-50 text-emerald-700',
    LOGIN_FAILED: 'bg-red-50 text-red-700',
    LOGIN_LOCKOUT: 'bg-red-100 text-red-800',
    DEVICE_SUBMIT: 'bg-blue-50 text-blue-700',
    DEVICE_EDIT: 'bg-amber-50 text-amber-700',
    DEVICE_DELETE: 'bg-red-50 text-red-700',
    DEPT_ADD: 'bg-teal-50 text-teal-700',
    DEPT_EDIT: 'bg-amber-50 text-amber-700',
    DEPT_DELETE: 'bg-red-50 text-red-700',
    APIKEY_CREATE: 'bg-purple-50 text-purple-700',
    SYSTEM: 'bg-slate-100 text-slate-700',
    DUPLICATE_WARNING: 'bg-amber-100 text-amber-800',
    DUPLICATE_CONFIRMED: 'bg-amber-50 text-amber-700',
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1"><Label className="text-xs">日志类型</Label>
          <Input className="w-[160px]" placeholder="如 USER_LOGIN" value={logType} onChange={e => { setLogType(e.target.value); setPage(1); }} />
        </div>
        <div className="space-y-1"><Label className="text-xs">关键词搜索</Label>
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-8 w-[200px]" placeholder="搜索内容/操作人" value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} /></div>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={() => setClearConfirm(true)}><Trash2 className="w-4 h-4 mr-1" />清空日志</Button>
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ['logs'] })}><RefreshCw className="w-4 h-4 mr-1" />刷新</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">ID</TableHead><TableHead>类型</TableHead><TableHead>内容</TableHead><TableHead className="hidden md:table-cell">详情</TableHead><TableHead className="hidden sm:table-cell">操作人</TableHead><TableHead className="hidden lg:table-cell">IP</TableHead><TableHead>时间</TableHead></TableRow></TableHeader>
              <TableBody>
                {data?.items?.map((l: LogEntry) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.id}</TableCell>
                    <TableCell><Badge className={logTypeColors[l.logType] || 'bg-slate-50 text-slate-700'} variant="outline">{l.logType}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{l.content}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground text-sm">{l.detail || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{l.operator || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">{l.ipAddress || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(l.createdAt)}</TableCell>
                  </TableRow>
                ))}
                {(!data?.items || data.items.length === 0) && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">暂无日志</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-muted-foreground">第 {page} / {data.totalPages} 页</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      <ConfirmDialog open={clearConfirm} onOpenChange={setClearConfirm} title="清空日志" message="确定要清空所有操作日志吗？此操作不可恢复。" onConfirm={handleClear} loading={saving} />
    </div>
  );
}

// ==================== API Keys Tab ====================
function ApiKeysTab() {
  const qc = useQueryClient();
  const { data: keys, isLoading } = useQuery<ApiKeyItem[]>({ queryKey: ['apikeys'], queryFn: () => fetch('/api/apikeys').then(r => r.json()) });
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', permissions: 'read', description: '', expiresAt: '' });
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ApiKeyItem | null>(null);

  const handleCreate = async () => {
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
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">API Key 管理</h2>
        <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" />创建 API Key</Button>
      </div>

      {/* New key display */}
      {newKey && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-emerald-700 mb-2">✅ API Key 创建成功！请立即复制保存，此密钥仅显示一次：</p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 p-2 bg-white rounded text-sm font-mono break-all">{newKey}</code>
              <Button size="sm" onClick={() => copyKey(newKey)}><Copy className="w-4 h-4 mr-1" />复制</Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNewKey(null)}>关闭</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12">ID</TableHead><TableHead>名称</TableHead><TableHead>API Key</TableHead><TableHead>权限</TableHead><TableHead>状态</TableHead><TableHead className="hidden md:table-cell">描述</TableHead><TableHead className="hidden lg:table-cell">最后使用</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {keys?.map(k => (
                  <TableRow key={k.id}>
                    <TableCell>{k.id}</TableCell>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs">{k.apiKey}</TableCell>
                    <TableCell><Badge variant="outline" className={k.permissions.includes('write') ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}>{k.permissions.includes('write') ? '读写' : '只读'}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className={`h-7 text-xs ${k.isActive ? 'text-emerald-600' : 'text-red-500'}`} onClick={() => handleToggle(k)}>
                        {k.isActive ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                        {k.isActive ? '启用' : '禁用'}
                      </Button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[150px] truncate text-sm text-muted-foreground">{k.description || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{k.lastUsedAt ? formatDate(k.lastUsedAt) : '从未使用'}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => setDeleteItem(k)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
                {(!keys || keys.length === 0) && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>创建 API Key</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>名称 *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如：OA系统对接" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>权限</Label>
                <Select value={form.permissions} onValueChange={v => setForm(f => ({ ...f, permissions: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="read">只读 (read)</SelectItem><SelectItem value="read,write">读写 (read,write)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>过期时间</Label><Input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>描述</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="用途说明" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteItem} onOpenChange={v => !v && setDeleteItem(null)} title="删除 API Key" message={`确定要删除 API Key"${deleteItem?.name}"吗？`} onConfirm={handleDelete} loading={saving} />
    </div>
  );
}
