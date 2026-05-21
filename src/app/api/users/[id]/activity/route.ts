import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const userId = parseInt(id);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const activities = await db.log.findMany({
      where: {
        logType: { in: ['USER_LOGIN', 'LOGIN_FAILED', 'LOGIN_LOCKOUT'] },
        content: { contains: user.username },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        logType: true,
        content: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
