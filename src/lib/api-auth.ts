import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function requireAuth(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  return null;
}

export async function requireAdmin(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }
  return null;
}
