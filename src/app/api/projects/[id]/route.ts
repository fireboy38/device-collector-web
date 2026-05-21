import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const { name, code, description } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: '项目名称不能为空' }, { status: 400 });
    }
    await db.project.update({
      where: { id: projectId },
      data: { name: name.trim(), code: code?.trim() || null, description: description?.trim() || null }
    });
    return NextResponse.json({ message: '更新成功' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '项目名称已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const projectId = parseInt(id);
    const userCount = await db.user.count({ where: { projectId } });
    const deptCount = await db.department.count({ where: { projectId } });
    if (userCount > 0 || deptCount > 0) {
      return NextResponse.json({
        error: `该项目下还有 ${userCount} 个用户和 ${deptCount} 个单位，请先删除关联数据`
      }, { status: 400 });
    }
    await db.project.delete({ where: { id: projectId } });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
