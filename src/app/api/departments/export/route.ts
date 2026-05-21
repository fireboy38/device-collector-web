import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const projectId = searchParams.get('project_id');

    const where: any = {};
    if (projectId) where.projectId = parseInt(projectId);

    const departments = await db.department.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { project: true },
    });

    const headers = ['ID', '单位名称', '编码', '描述', '所属项目', '创建时间'];

    const rows = departments.map(d => [
      d.id,
      d.name,
      d.code || '',
      d.description || '',
      d.project?.name || '',
      d.createdAt.toISOString().replace('T', ' ').substring(0, 19),
    ]);

    if (format === 'xlsx') {
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      worksheet['!cols'] = [
        { wch: 6 },   // ID
        { wch: 20 },  // 单位名称
        { wch: 10 },  // 编码
        { wch: 30 },  // 描述
        { wch: 16 },  // 所属项目
        { wch: 20 },  // 创建时间
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '单位列表');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('单位列表.xlsx')}`,
        },
      });
    }

    // CSV format (default)
    const bom = '\uFEFF';
    const csvContent = bom + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('单位列表.csv')}`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
