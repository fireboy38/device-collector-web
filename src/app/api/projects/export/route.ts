import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    const projects = await db.project.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { users: true, departments: true } },
      },
    });

    // Get device counts per project
    const projectDeviceCounts = await Promise.all(
      projects.map(async (p) => ({
        id: p.id,
        deviceCount: await db.device.count({
          where: { department: { projectId: p.id } },
        }),
      }))
    );
    const deviceCountMap = new Map(projectDeviceCounts.map(p => [p.id, p.deviceCount]));

    const headers = ['ID', '项目名称', '编码', '描述', '用户数', '单位数', '设备数', '创建时间'];

    const rows = projects.map(p => [
      p.id,
      p.name,
      p.code || '',
      p.description || '',
      p._count.users,
      p._count.departments,
      deviceCountMap.get(p.id) || 0,
      p.createdAt.toISOString().replace('T', ' ').substring(0, 19),
    ]);

    if (format === 'xlsx') {
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      worksheet['!cols'] = [
        { wch: 6 },   // ID
        { wch: 20 },  // 项目名称
        { wch: 10 },  // 编码
        { wch: 30 },  // 描述
        { wch: 8 },   // 用户数
        { wch: 8 },   // 单位数
        { wch: 8 },   // 设备数
        { wch: 20 },  // 创建时间
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '项目列表');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('项目列表.xlsx')}`,
        },
      });
    }

    // CSV format (default)
    const bom = '\uFEFF';
    const csvContent = bom + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('项目列表.csv')}`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
