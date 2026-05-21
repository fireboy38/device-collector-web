import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, code, description, projectId } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: '单位名称不能为空' }, { status: 400 });
    }

    await db.department.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
        projectId: projectId || null,
      }
    });

    await db.log.create({
      data: { logType: 'DEPT_EDIT', content: `单位编辑 (ID:${id})`, detail: `名称:${name}` }
    });

    return NextResponse.json({ message: '更新成功' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '单位名称已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.department.delete({ where: { id: parseInt(id) } });
    await db.log.create({
      data: { logType: 'DEPT_DELETE', content: `单位删除 (ID:${id})` }
    });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
