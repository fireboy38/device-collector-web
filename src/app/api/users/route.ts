import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    const where: any = {};
    if (projectId) where.projectId = parseInt(projectId);

    const users = await db.user.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { project: true },
    });

    // Aggregate login stats from logs table
    const loginLogs = await db.log.findMany({
      where: { logType: 'USER_LOGIN' },
      select: { content: true, createdAt: true },
    });

    // Build a map of user identifier -> { count, lastLoginAt }
    const loginStatsMap = new Map<string, { count: number; lastLoginAt: Date }>();
    for (const log of loginLogs) {
      // Content format: "用户登录: displayName" or "用户登录: username"
      const match = log.content.match(/^用户登录:\s*(.+)$/);
      if (match) {
        const identifier = match[1].trim();
        const existing = loginStatsMap.get(identifier);
        if (existing) {
          existing.count += 1;
          if (log.createdAt > existing.lastLoginAt) {
            existing.lastLoginAt = log.createdAt;
          }
        } else {
          loginStatsMap.set(identifier, { count: 1, lastLoginAt: log.createdAt });
        }
      }
    }

    const result = users.map(u => {
      const identifier = u.displayName || u.username;
      const stats = loginStatsMap.get(identifier);
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        projectId: u.projectId,
        projectName: u.project?.name || null,
        role: u.role,
        createdAt: u.createdAt,
        loginCount: stats?.count ?? 0,
        lastLoginAt: stats?.lastLoginAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { username, password, displayName, projectId, role } = await request.json();
    if (!username?.trim() || !password?.trim()) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }
    const r = (role || 'user');
    const validRole = ['admin', 'user'].includes(r) ? r : 'user';

    const user = await db.user.create({
      data: {
        username: username.trim(),
        passwordHash: hashPassword(password),
        displayName: displayName?.trim() || null,
        projectId: projectId || null,
        role: validRole,
      }
    });
    return NextResponse.json({ message: '添加成功', id: user.id }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
