'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io as socketIo } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
  LayoutDashboard, FolderKanban, Users, Building2, Monitor, Globe, FileText, KeyRound,
  LogOut, Loader2, Sun, Moon, ChevronDown, Bell, Zap, Settings, Menu, Search,
  Keyboard, Compass, HelpCircle, RefreshCw, Clock, Wifi, WifiOff,
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

// ===== Tab definitions (static, no re-renders) =====
const TABS = [
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

// ===== Main App =====
export default function HomePage() {
  const { user, checking, checkAuth, logout } = useAuthStore();
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: number; type: string; title: string; time: string; read: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof socketIo> | null>(null);

  // Tab badge data
  const [tabBadges, setTabBadges] = useState<{ deviceCount: number; todayLogCount: number; activeApiKeyCount: number }>({ deviceCount: 0, todayLogCount: 0, activeApiKeyCount: 0 });

  // Fetch tab badge counts
  useEffect(() => {
    if (!user) return;
    const fetchBadges = async () => {
      try {
        const [devRes, logRes, keyRes] = await Promise.all([
          fetch('/api/devices?per_page=1').then(r => r.json()),
          fetch('/api/logs?per_page=1').then(r => r.json()),
          fetch('/api/apikeys').then(r => r.json()),
        ]);
        setTabBadges({
          deviceCount: Array.isArray(devRes) ? devRes.length : (devRes.total ?? 0),
          todayLogCount: logRes.total ?? 0,
          activeApiKeyCount: Array.isArray(keyRes) ? keyRes.filter((k: { isActive: number }) => k.isActive === 1).length : 0,
        });
      } catch { /* silently fail */ }
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Global Search state
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    devices: Array<{ id: number; userName: string; computerName: string | null; ipAddress: string | null; osInfo: string | null; departmentName: string | null; projectName: string | null }>;
    projects: Array<{ id: number; name: string; code: string | null; description: string | null }>;
    users: Array<{ id: number; username: string; displayName: string | null; role: string; projectName: string | null }>;
    departments: Array<{ id: number; name: string; code: string | null; projectName: string | null }>;
  }>({ devices: [], projects: [], users: [], departments: [] });

  const handleRefreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await qc.invalidateQueries();
    setLastRefresh(new Date());
    setTimeout(() => setIsRefreshing(false), 600);
  }, [qc]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { setMounted(true); }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Cmd/Ctrl+K: Global search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
        return;
      }

      // Cmd/Ctrl+/: Toggle shortcuts panel
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }

      // Escape: Close dialogs / clear search
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchQuery('');
          setSearchOpen(false);
          setSearchResults({ devices: [], projects: [], users: [], departments: [] });
          searchInputRef.current?.blur();
        }
        if (showShortcuts) setShowShortcuts(false);
        return;
      }

      // Only process the following when no input is focused and search is not open
      if (!searchOpen && !isInputFocused) {
        // Number keys 1-9: Switch to corresponding tab
        if (e.key >= '1' && e.key <= '9' && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const tabIndex = parseInt(e.key) - 1;
          if (tabIndex < TABS.length) {
            e.preventDefault();
            setActiveTab(TABS[tabIndex].value);
          }
          return;
        }

        // Arrow Left/Right: Switch between tabs
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const currentIdx = TABS.findIndex(t => t.value === activeTab);
          if (currentIdx > 0) setActiveTab(TABS[currentIdx - 1].value);
          else setActiveTab(TABS[TABS.length - 1].value);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const currentIdx = TABS.findIndex(t => t.value === activeTab);
          if (currentIdx < TABS.length - 1) setActiveTab(TABS[currentIdx + 1].value);
          else setActiveTab(TABS[0].value);
          return;
        }

        // ?: Open shortcuts help
        if (e.key === '?' || (e.shiftKey && e.key === '/')) {
          e.preventDefault();
          setShowShortcuts(true);
          return;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, showShortcuts, activeTab]);

  // Global Search: debounced fetch
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults({ devices: [], projects: [], users: [], departments: [] });
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
      .then(r => r.json())
      .then(data => {
        setSearchResults(data);
        setSearchLoading(false);
      })
      .catch(() => {
        setSearchResults({ devices: [], projects: [], users: [], departments: [] });
        setSearchLoading(false);
      });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setSearchResults({ devices: [], projects: [], users: [], departments: [] });
      setSearchOpen(false);
      return;
    }
    setSearchOpen(true);
    searchTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

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

  // WebSocket real-time notification connection
  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    // Connect to WebSocket notification service
    const socket = socketIo('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WS] Connected to notification service');
      setWsConnected(true);
      // Subscribe with role info
      socket.emit('subscribe', { role: user.role, userId: user.id });
    });

    socket.on('disconnect', () => {
      console.log('[WS] Disconnected from notification service');
      setWsConnected(false);
    });

    socket.on('notification', (payload: { type: string; title: string; message: string; data?: Record<string, unknown>; timestamp?: string }) => {
      console.log('[WS] Notification received:', payload.type, payload.title);

      // Show toast based on notification type
      const notifyType = payload.type;
      if (notifyType === 'device_submit') {
        toast.success(payload.title, { description: payload.message });
      } else if (notifyType === 'device_edit') {
        toast.info(payload.title, { description: payload.message });
      } else if (notifyType === 'device_delete') {
        toast.warning(payload.title, { description: payload.message });
      } else if (notifyType === 'user_login') {
        toast.info(payload.title, { description: payload.message });
      } else {
        toast.info(payload.title, { description: payload.message });
      }

      // Prepend to notifications list
      const typeMap: Record<string, string> = {
        device_submit: 'success',
        device_edit: 'info',
        device_delete: 'warning',
        user_login: 'info',
      };
      setNotifications(prev => [{
        id: Date.now(),
        type: typeMap[notifyType] || 'info',
        title: payload.message,
        time: payload.timestamp || new Date().toISOString(),
        read: false,
      }, ...prev.slice(0, 19)]);

      // Increment unread count
      setUnreadCount(prev => prev + 1);

      // Invalidate relevant queries to refresh data
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['devices'] });
      qc.invalidateQueries({ queryKey: ['logs'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setWsConnected(false);
    };
  }, [user, qc]);

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

  const tabs = TABS;

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
          {/* Global Search - hidden on mobile */}
          <div className="hidden sm:flex items-center flex-1 justify-center max-w-md mx-4">
            <Popover open={searchOpen && searchQuery.trim().length > 0} onOpenChange={(open) => { setSearchOpen(open); if (!open) { setSearchQuery(''); setSearchResults({ devices: [], projects: [], users: [], departments: [] }); } }}>
              <PopoverTrigger asChild>
                <div className="relative w-[240px] lg:w-[320px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-200/70" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false); setSearchResults({ devices: [], projects: [], users: [], departments: [] }); searchInputRef.current?.blur(); } }}
                    placeholder="搜索设备、项目、用户..."
                    className="w-full h-8 pl-8 pr-3 rounded-lg bg-white/10 border border-white/10 text-sm text-white placeholder:text-emerald-200/50 focus:outline-none focus:ring-1 focus:ring-white/30 focus:bg-white/15 transition-all"
                  />
                  {searchLoading ? (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-200/70 animate-spin" />
                  ) : (
                    <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-emerald-200/50 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 font-mono pointer-events-none">⌘K</kbd>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-[320px] lg:w-[400px] p-0" sideOffset={8}>
                <ScrollArea className="max-h-[400px]">
                  {searchResults.devices.length === 0 && searchResults.projects.length === 0 && searchResults.users.length === 0 && searchResults.departments.length === 0 && !searchLoading && (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                      <Search className="w-6 h-6 mx-auto mb-2 opacity-30" />
                      无搜索结果
                    </div>
                  )}
                  {searchResults.devices.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Monitor className="w-3 h-3 text-emerald-600" />
                        设备
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 px-1 py-0 ml-auto">{searchResults.devices.length}</Badge>
                      </div>
                      {searchResults.devices.map((d) => (
                        <button
                          key={`device-${d.id}`}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2.5"
                          onClick={() => { setActiveTab('devices'); setSearchOpen(false); setSearchQuery(''); setSearchResults({ devices: [], projects: [], users: [], departments: [] }); }}
                        >
                          <div className="w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                            <Monitor className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{d.userName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {d.ipAddress && <span className="font-mono">{d.ipAddress}</span>}
                              {d.ipAddress && d.computerName && ' · '}
                              {d.computerName}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.projects.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-t">
                        <FolderKanban className="w-3 h-3 text-teal-600" />
                        项目
                        <Badge variant="secondary" className="text-[10px] bg-teal-100 text-teal-700 px-1 py-0 ml-auto">{searchResults.projects.length}</Badge>
                      </div>
                      {searchResults.projects.map((p) => (
                        <button
                          key={`project-${p.id}`}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2.5"
                          onClick={() => { setActiveTab('projects'); setSearchOpen(false); setSearchQuery(''); setSearchResults({ devices: [], projects: [], users: [], departments: [] }); }}
                        >
                          <div className="w-7 h-7 rounded-md bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                            <FolderKanban className="w-3.5 h-3.5 text-teal-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {p.code && <span>{p.code}</span>}
                              {p.code && p.description && ' · '}
                              {p.description && <span>{p.description.slice(0, 30)}</span>}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.users.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-t">
                        <Users className="w-3 h-3 text-cyan-600" />
                        用户
                        <Badge variant="secondary" className="text-[10px] bg-cyan-100 text-cyan-700 px-1 py-0 ml-auto">{searchResults.users.length}</Badge>
                      </div>
                      {searchResults.users.map((u) => (
                        <button
                          key={`user-${u.id}`}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2.5"
                          onClick={() => { setActiveTab('users'); setSearchOpen(false); setSearchQuery(''); setSearchResults({ devices: [], projects: [], users: [], departments: [] }); }}
                        >
                          <div className="w-7 h-7 rounded-md bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                            <Users className="w-3.5 h-3.5 text-cyan-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{u.displayName || u.username}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              <span>@{u.username}</span>
                              {u.projectName && <span> · {u.projectName}</span>}
                            </p>
                          </div>
                          <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${u.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-cyan-100 text-cyan-700'}`}>
                            {u.role === 'admin' ? '管理员' : '用户'}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.departments.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-t">
                        <Building2 className="w-3 h-3 text-amber-600" />
                        单位
                        <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0 ml-auto">{searchResults.departments.length}</Badge>
                      </div>
                      {searchResults.departments.map((d) => (
                        <button
                          key={`dept-${d.id}`}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2.5"
                          onClick={() => { setActiveTab('departments'); setSearchOpen(false); setSearchQuery(''); setSearchResults({ devices: [], projects: [], users: [], departments: [] }); }}
                        >
                          <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{d.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {d.code && <span>{d.code}</span>}
                              {d.code && d.projectName && ' · '}
                              {d.projectName && <span>{d.projectName}</span>}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
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

            {/* Notification Bell with real-time indicator */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-emerald-100/80 hover:text-white hover:bg-white/10 h-9 w-9 relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-amber-400 text-amber-900 rounded-full text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {/* Real-time connection indicator */}
                  <span className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-emerald-800 ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      系统通知
                    </h4>
                    <div className="flex items-center gap-2">
                      {wsConnected ? (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <Wifi className="w-3 h-3" />实时
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-600 flex items-center gap-1">
                          <WifiOff className="w-3 h-3" />离线
                        </Badge>
                      )}
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                          {unreadCount} 条未读
                        </Badge>
                      )}
                    </div>
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

            {/* Refresh / Last Updated */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-200/60 hidden sm:flex items-center gap-1">
                <Clock className="w-3 h-3" />
                最近更新 {lastRefresh.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-100/80 hover:text-white hover:bg-white/10 h-9 w-9"
                onClick={handleRefreshAll}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>

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
                    {tab.value === 'devices' && tabBadges.deviceCount > 0 && (
                      <Badge className="h-4 min-w-[18px] px-1 text-[9px] bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 tabular-nums">{tabBadges.deviceCount > 99 ? '99+' : tabBadges.deviceCount}</Badge>
                    )}
                    {tab.value === 'logs' && tabBadges.todayLogCount > 0 && (
                      <Badge className="h-4 min-w-[18px] px-1 text-[9px] bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 tabular-nums">{tabBadges.todayLogCount > 99 ? '99+' : tabBadges.todayLogCount}</Badge>
                    )}
                    {tab.value === 'apikeys' && tabBadges.activeApiKeyCount > 0 && (
                      <Badge className="h-4 min-w-[18px] px-1 text-[9px] bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 tabular-nums">{tabBadges.activeApiKeyCount}</Badge>
                    )}
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
                    {tab.value === 'devices' && tabBadges.deviceCount > 0 && (
                      <Badge className="h-3.5 min-w-[14px] px-0.5 text-[8px] bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 tabular-nums">{tabBadges.deviceCount > 99 ? '99+' : tabBadges.deviceCount}</Badge>
                    )}
                    {tab.value === 'logs' && tabBadges.todayLogCount > 0 && (
                      <Badge className="h-3.5 min-w-[14px] px-0.5 text-[8px] bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 tabular-nums">{tabBadges.todayLogCount > 99 ? '99+' : tabBadges.todayLogCount}</Badge>
                    )}
                    {tab.value === 'apikeys' && tabBadges.activeApiKeyCount > 0 && (
                      <Badge className="h-3.5 min-w-[14px] px-0.5 text-[8px] bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/40 dark:text-emerald-400 tabular-nums">{tabBadges.activeApiKeyCount}</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            )}

            <TabsContent value="dashboard" className="mt-4 sm:mt-6 animate-fade-in"><DashboardTab onTabChange={handleTabChange} /></TabsContent>
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
            <DialogDescription className="sr-only">修改当前用户的登录密码</DialogDescription>
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

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Keyboard className="w-4 h-4 text-emerald-600" />
              </div>
              键盘快捷键
            </DialogTitle>
            <DialogDescription className="sr-only">键盘快捷键帮助面板</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">使用快捷键提升操作效率</p>

          <div className="space-y-5 pt-2">
            {/* 导航 Section */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-3">
                <Compass className="w-3.5 h-3.5" />
                导航
              </h4>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 items-center">
                  <span className="text-sm text-foreground">全局搜索</span>
                  <div className="flex justify-end gap-1">
                    <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">⌘K</kbd>
                    <span className="text-xs text-muted-foreground self-center">/</span>
                    <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">Ctrl+K</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center">
                  <span className="text-sm text-foreground">显示快捷键帮助</span>
                  <div className="flex justify-end gap-1">
                    <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">⌘/</kbd>
                    <span className="text-xs text-muted-foreground self-center">/</span>
                    <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">Ctrl+/</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center">
                  <span className="text-sm text-foreground">切换到对应标签页</span>
                  <div className="flex justify-end">
                    <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">1-9</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center">
                  <span className="text-sm text-foreground">上一个/下一个标签页</span>
                  <div className="flex justify-end gap-1">
                    <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">←</kbd>
                    <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">→</kbd>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* 通用 Section */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-3">
                <HelpCircle className="w-3.5 h-3.5" />
                通用
              </h4>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 items-center">
                  <span className="text-sm text-foreground">关闭对话框/清除搜索</span>
                  <div className="flex justify-end">
                    <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">Esc</kbd>
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center">
                  <span className="text-sm text-foreground">打开帮助</span>
                  <div className="flex justify-end">
                    <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono">?</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
