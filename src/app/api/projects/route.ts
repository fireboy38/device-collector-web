import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { users: true, departments: true } },
      }
    });

    const result = await Promise.all(projects.map(async (p) => {
      const deviceCount = await db.device.count({
        where: { department: { projectId: p.id } }
      });
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        createdAt: p.createdAt,
        userCount: p._count.users,
        deptCount: p._count.departments,
        deviceCount,
      };
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, code, description } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: '项目名称不能为空' }, { status: 400 });
    }
    const project = await db.project.create({
      data: { name: name.trim(), code: code?.trim() || null, description: description?.trim() || null }
    });
    return NextResponse.json({ message: '添加成功', id: project.id }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '项目名称已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
