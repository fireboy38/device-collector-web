import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  displayName: string | null;
  role: string;
  projectId: number | null;
  projectName: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  checking: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; locked?: boolean; lockedUntil?: string; attemptsLeft?: number }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  checking: true,

  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ user: data, loading: false });
        return { success: true };
      }
      set({ loading: false });
      return {
        success: false,
        error: data.error || '登录失败',
        locked: data.locked || false,
        lockedUntil: data.lockedUntil,
        attemptsLeft: data.attemptsLeft,
      };
    } catch {
      set({ loading: false });
      return { success: false, error: '网络错误，无法连接到服务器' };
    }
  },

  logout: async () => {
    await fetch('/api/logout', { method: 'POST' });
    set({ user: null });
  },

  checkAuth: async () => {
    set({ checking: true });
    try {
      const res = await fetch('/api/current-user');
      if (res.ok) {
        const data = await res.json();
        set({ user: data, checking: false });
      } else {
        set({ user: null, checking: false });
      }
    } catch {
      set({ user: null, checking: false });
    }
  },
}));
