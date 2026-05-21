import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    const where: any = {};
    if (projectId) where.projectId = parseInt(projectId);

    const departments = await db.department.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { project: true },
    });

    const result = departments.map(d => ({
      id: d.id,
      projectId: d.projectId,
      projectName: d.project?.name || null,
      name: d.name,
      code: d.code,
      description: d.description,
      createdAt: d.createdAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { name, code, description, projectId } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: '单位名称不能为空' }, { status: 400 });
    }
    if (!projectId) {
      return NextResponse.json({ error: '请选择所属项目' }, { status: 400 });
    }

    const dept = await db.department.create({
      data: {
        projectId: parseInt(projectId),
        name: name.trim(),
        code: code?.trim() || null,
        description: description?.trim() || null,
      }
    });

    await db.log.create({
      data: {
        logType: 'DEPT_ADD',
        content: `单位新增: ${name}`,
        detail: `编码:${code || '无'}, 项目ID:${projectId}`,
      }
    });

    return NextResponse.json({ message: '添加成功', id: dept.id }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: '单位名称已存在' }, { status: 409 });
    }
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
