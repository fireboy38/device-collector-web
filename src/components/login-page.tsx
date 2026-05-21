'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Monitor, Eye, EyeOff, Loader2, Shield, Lock, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const { login, loading } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  // Load saved username on mount
  const [initialUsername] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dc_login_username') || '';
    }
    return '';
  });
  useEffect(() => { setUsername(initialUsername); }, [initialUsername]);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return;
    const endTime = new Date(lockedUntil).getTime();
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setLocked(false);
        setLockedUntil(null);
        setCountdown(0);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLocked(false);
    setAttemptsLeft(null);

    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    const result = await login(username, password);
    if (!result.success) {
      if (result.locked) {
        setLocked(true);
        setLockedUntil(result.lockedUntil || null);
      }
      if (result.attemptsLeft !== undefined) {
        setAttemptsLeft(result.attemptsLeft);
      }
      setError(result.error || '登录失败');
    } else {
      localStorage.setItem('dc_login_username', username);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 mb-4">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">设备信息采集器</h1>
          <p className="text-slate-400 text-sm mt-1">管理端登录</p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-900/70 backdrop-blur-xl border-slate-700/50 shadow-2xl">
          <CardHeader className="pb-2" />
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${locked ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                  {locked ? <Lock className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{locked && countdown > 0 ? `账户已锁定，请 ${countdown} 秒后重试` : error}</span>
                </div>
              )}

              {attemptsLeft !== null && attemptsLeft > 0 && !locked && (
                <div className="text-amber-400 text-xs text-center">
                  剩余尝试次数: {attemptsLeft} 次
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300 text-xs uppercase tracking-wider">用户名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="bg-slate-800/60 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-xs uppercase tracking-wider">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="bg-slate-800/60 border-slate-600/50 text-white placeholder:text-slate-500 pr-10 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || locked}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-5 shadow-lg shadow-emerald-500/20 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登 录'
                )}
              </Button>
            </form>

            {/* Demo info */}
            <div className="mt-6 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
              <p className="text-xs text-slate-400 leading-relaxed">
                💡 默认管理员账号：<span className="text-emerald-400 font-medium">admin</span> / <span className="text-emerald-400 font-medium">123456</span>
              </p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Shield className="w-3 h-3" />
              <span>通信加密 · 登录防护 · 操作审计</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          设备信息采集器 · 管理端 v2.0
        </p>
      </div>
    </div>
  );
}
