import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const projectId = formData.get('project_id') as string;
    const file = formData.get('file') as File | null;

    // Also support JSON body
    let departments: { projectId: number; name: string; code: string; description: string }[] = [];

    if (!projectId) {
      return NextResponse.json({ error: '请指定所属项目' }, { status: 400 });
    }

    if (file) {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (!cols[0]) continue;
        // Skip header row
        if (i === 0 && ['单位名称', '名称', 'name', 'Name', '部门'].includes(cols[0])) continue;
        departments.push({
          projectId: parseInt(projectId),
          name: cols[0],
          code: cols[1] || '',
          description: cols[2] || '',
        });
      }
    } else {
      const body = await request.json();
      const items = Array.isArray(body) ? body : body.items;
      if (!Array.isArray(items)) {
        return NextResponse.json({ error: '请提供数组数据' }, { status: 400 });
      }
      for (const item of items) {
        const name = typeof item === 'string' ? item : item.name;
        if (!name?.trim()) continue;
        departments.push({
          projectId: parseInt(projectId),
          name: name.trim(),
          code: item.code?.trim() || '',
          description: item.description?.trim() || '',
        });
      }
    }

    if (departments.length === 0) {
      return NextResponse.json({ error: '未找到有效的单位数据' }, { status: 400 });
    }

    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const dept of departments) {
      try {
        await db.department.create({ data: dept });
        successCount++;
      } catch (error: any) {
        if (error.code === 'P2002') {
          skipCount++;
          errors.push(`"${dept.name}" 已存在，已跳过`);
        } else {
          errors.push(`"${dept.name}" 创建失败: ${error.message}`);
        }
      }
    }

    const result: any = {
      message: `导入完成：成功 ${successCount} 个，跳过 ${skipCount} 个`,
      successCount,
      skipCount,
    };
    if (errors.length) result.details = errors;

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
