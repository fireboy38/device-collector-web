'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import LoginPage from '@/components/login-page';
import { DashboardTab } from '@/components/tabs/dashboard-tab';
import { ProjectsTab } from '@/components/tabs/projects-tab';
import { UsersTab } from '@/components/tabs/users-tab';
import { DepartmentsTab } from '@/components/tabs/departments-tab';
import { DevicesTab } from '@/components/tabs/devices-tab';
import { IpMapTab } from '@/components/tabs/ipmap-tab';
import { LogsTab } from '@/components/tabs/logs-tab';
import { ApiKeysTab } from '@/components/tabs/apikeys-tab';
import { SettingsTab } from '@/components/tabs/settings-tab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  LayoutDashboard, FolderKanban, Users, Building2, Monitor, Globe, FileText, KeyRound,
  LogOut, Loader2, Sun, Moon, ChevronDown, Bell, Zap, Settings, Menu,
} from 'lucide-react';

// ===== Helpers =====
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSeconds < 60) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
}

// ===== Main App =====
export default function HomePage() {
  const { user, checking, checkAuth, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: number; type: string; title: string; time: string; read: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { setMounted(true); }, []);

  // Fetch notifications when user is logged in
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = () => {
      fetch('/api/notifications')
        .then(r => r.json())
        .then(data => {
          if (data.notifications) {
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount || 0);
          }
        })
        .catch(() => {});
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

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

  if (checking || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <div className="absolute inset-0 w-8 h-8 animate-ping rounded-full bg-emerald-400/20" />
          </div>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const tabs = [
    { value: 'dashboard', icon: LayoutDashboard, label: '数据概览' },
    { value: 'projects', icon: FolderKanban, label: '项目管理' },
    { value: 'users', icon: Users, label: '用户管理' },
    { value: 'departments', icon: Building2, label: '单位管理' },
    { value: 'devices', icon: Monitor, label: '设备列表' },
    { value: 'ipmap', icon: Globe, label: 'IP 分布' },
    { value: 'logs', icon: FileText, label: '操作日志' },
    { value: 'apikeys', icon: KeyRound, label: 'API 管理' },
    { value: 'settings', icon: Settings, label: '系统设置' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white shadow-lg relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-300/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-black/10">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">设备信息采集器</h1>
              <p className="text-xs text-emerald-100/80 hidden sm:block">统一管理项目、用户、单位信息与终端设备采集数据</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile hamburger menu */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-100/80 hover:text-white hover:bg-white/10 h-9 w-9"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}

            {/* Notification Bell */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-emerald-100/80 hover:text-white hover:bg-white/10 h-9 w-9 relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-amber-400 text-amber-900 rounded-full text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      系统通知
                    </h4>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">
                        {unreadCount} 条未读
                      </Badge>
                    )}
                  </div>
                </div>
                <ScrollArea className="max-h-[320px]">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-xs">
                      暂无通知
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((n) => (
                        <div key={n.id} className="px-3 py-2.5 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start gap-2">
                            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                              n.type === 'success' ? 'bg-emerald-500' :
                              n.type === 'error' ? 'bg-red-500' :
                              n.type === 'warning' ? 'bg-amber-500' :
                              'bg-slate-400'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-relaxed truncate">{n.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {formatRelativeTime(n.time)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <Separator />
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setActiveTab('logs')}
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    查看全部日志
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="text-emerald-100/80 hover:text-white hover:bg-white/10 h-9 w-9"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-emerald-100 hover:text-white hover:bg-white/10 gap-2 h-9 px-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    {(user.displayName || user.username).charAt(0)}
                  </div>
                  <span className="hidden sm:inline text-sm">{user.displayName || user.username}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </Badge>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowChangePwd(true)}>
                  <KeyRound className="w-4 h-4 mr-2" />修改密码
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Animated gradient border */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-60" />

      {/* Mobile Sidebar Navigation */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-4 -mt-4 -mx-4 mb-0">
            <SheetTitle className="text-white flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              设备信息采集器
            </SheetTitle>
            <SheetDescription className="text-emerald-100/70 text-xs">
              导航菜单
            </SheetDescription>
          </SheetHeader>
          <nav className="flex flex-col py-2">
            {tabs.map((tab, index) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 animate-slide-in border-l-3 ${
                  activeTab === tab.value
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400 font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground border-transparent'
                }`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <tab.icon className={`w-4.5 h-4.5 ${
                  activeTab === tab.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                }`} />
                {tab.label}
                {activeTab === tab.value && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            ))}
          </nav>
          <Separator />
          <div className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>v2.0 · 在线</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Tab Navigation */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* Desktop horizontal tabs - hidden on mobile */}
            {!isMobile && (
              <TabsList className="bg-transparent h-12 gap-0 p-0 overflow-x-auto w-full">
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 dark:data-[state=active]:border-emerald-400 rounded-none px-3 sm:px-4 h-12 text-sm gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            )}

            {/* Mobile: compact tab bar with icons only */}
            {isMobile && (
              <TabsList className="bg-transparent h-11 gap-0 p-0 overflow-x-auto w-full flex">
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 dark:data-[state=active]:border-emerald-400 rounded-none px-2 h-11 text-xs gap-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="truncate max-w-[48px]">{tab.label.replace('管理', '').replace('列表', '').replace('分布', '').replace('概览', '')}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            )}

            <TabsContent value="dashboard" className="mt-4 sm:mt-6 animate-fade-in"><DashboardTab /></TabsContent>
            <TabsContent value="projects" className="mt-4 sm:mt-6 animate-fade-in"><ProjectsTab /></TabsContent>
            <TabsContent value="users" className="mt-4 sm:mt-6 animate-fade-in"><UsersTab /></TabsContent>
            <TabsContent value="departments" className="mt-4 sm:mt-6 animate-fade-in"><DepartmentsTab /></TabsContent>
            <TabsContent value="devices" className="mt-4 sm:mt-6 animate-fade-in"><DevicesTab /></TabsContent>
            <TabsContent value="ipmap" className="mt-4 sm:mt-6 animate-fade-in"><IpMapTab /></TabsContent>
            <TabsContent value="logs" className="mt-4 sm:mt-6 animate-fade-in"><LogsTab /></TabsContent>
            <TabsContent value="apikeys" className="mt-4 sm:mt-6 animate-fade-in"><ApiKeysTab /></TabsContent>
            <TabsContent value="settings" className="mt-4 sm:mt-6 animate-fade-in"><SettingsTab /></TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card py-3 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <Zap className="w-3 h-3 text-emerald-500" />
          <span>设备信息采集器 · 管理端 v2.0 · {new Date().getFullYear()} · Powered by Next.js</span>
        </div>
      </footer>

      {/* Change Password Dialog */}
      <Dialog open={showChangePwd} onOpenChange={setShowChangePwd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-emerald-600" />
              </div>
              修改密码
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">旧密码</Label>
              <Input type="password" value={pwdForm.oldPassword} onChange={e => setPwdForm(f => ({ ...f, oldPassword: e.target.value }))} placeholder="请输入当前密码" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">新密码</Label>
              <Input type="password" value={pwdForm.newPassword} onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="至少6位" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">确认新密码</Label>
              <Input type="password" value={pwdForm.confirmPassword} onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="再次输入新密码" onKeyDown={e => e.key === 'Enter' && handleChangePwd()} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowChangePwd(false)}>取消</Button>
            <Button onClick={handleChangePwd} disabled={pwdSaving} className="bg-emerald-600 hover:bg-emerald-700">
              {pwdSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
