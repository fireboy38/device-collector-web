import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = parseInt(id);
    const { displayName, projectId, role, password } = await request.json();

    const validRole = ['admin', 'user'].includes(role || 'user') ? (role || 'user') : 'user';

    const data: any = {
      displayName: displayName?.trim() || null,
      projectId: projectId || null,
      role: validRole,
    };
    if (password?.trim()) {
      data.passwordHash = hashPassword(password);
    }

    await db.user.update({ where: { id: userId }, data });
    return NextResponse.json({ message: '更新成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.user.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
