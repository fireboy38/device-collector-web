import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { setSession, clearSession } from '@/lib/session';
import { wsNotify } from '@/lib/ws-notify';

// Simple in-memory rate limiting
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 300000; // 5 minutes in ms

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    // Check lockout
    const attempt = loginAttempts.get(username) || { count: 0, lockedUntil: 0 };
    const now = Date.now();
    if (attempt.lockedUntil > now) {
      const remaining = Math.ceil((attempt.lockedUntil - now) / 1000);
      return NextResponse.json({
        error: `登录已锁定，请 ${remaining} 秒后重试`,
        locked: true,
        lockedUntil: new Date(attempt.lockedUntil).toISOString(),
      }, { status: 429 });
    }

    // Reset if lockout expired
    if (attempt.lockedUntil > 0 && attempt.lockedUntil <= now) {
      loginAttempts.set(username, { count: 0, lockedUntil: 0 });
    }

    // Find user
    const user = await db.user.findUnique({
      where: { username: username.trim() },
      include: { project: true }
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      const current = loginAttempts.get(username) || { count: 0, lockedUntil: 0 };
      current.count += 1;
      const attemptsLeft = MAX_ATTEMPTS - current.count;

      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = now + LOCKOUT_DURATION;
        loginAttempts.set(username, current);
        return NextResponse.json({
          error: `连续登录失败 ${current.count} 次，账户已锁定 5 分钟`,
          locked: true,
          lockedUntil: new Date(current.lockedUntil).toISOString(),
        }, { status: 429 });
      }

      loginAttempts.set(username, current);

      await db.log.create({
        data: {
          logType: 'LOGIN_FAILED',
          content: `登录失败: ${username}`,
          detail: `第 ${current.count} 次失败，剩余 ${attemptsLeft} 次`,
        }
      });

      return NextResponse.json({
        error: '用户名或密码错误',
        attemptsLeft,
      }, { status: 401 });
    }

    // Login success - clear attempts
    loginAttempts.delete(username);

    // Set session
    await setSession({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      projectId: user.projectId,
    });

    // Log
    await db.log.create({
      data: {
        logType: 'USER_LOGIN',
        content: `用户登录: ${user.displayName || user.username}`,
        detail: `用户名:${user.username}, 角色:${user.role}`,
        operator: user.username,
      }
    });

    // Send real-time notification
    wsNotify(
      'user_login',
      '用户登录',
      `用户${user.displayName || user.username}已登录`,
      { userId: user.id, username: user.username, role: user.role }
    );

    return NextResponse.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      projectId: user.projectId,
      projectName: user.project?.name || (user.role === 'admin' ? '全部项目' : null),
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
