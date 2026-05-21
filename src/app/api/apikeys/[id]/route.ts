import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const { isActive, name, permissions, description } = await request.json();

    const data: any = {};
    if (isActive !== undefined) data.isActive = isActive ? 1 : 0;
    if (name !== undefined) data.name = name;
    if (permissions !== undefined) data.permissions = permissions;
    if (description !== undefined) data.description = description;

    await db.apiKey.update({ where: { id: parseInt(id) }, data });
    return NextResponse.json({ message: '更新成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    await db.apiKey.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
