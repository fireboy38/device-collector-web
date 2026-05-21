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

    const users = await db.user.findMany({
      where,
      orderBy: { id: 'asc' },
      include: { project: true },
    });

    // Aggregate login stats from logs table
    const loginLogs = await db.log.findMany({
      where: { logType: 'USER_LOGIN' },
      select: { content: true, createdAt: true },
    });

    const loginStatsMap = new Map<string, { count: number; lastLoginAt: Date }>();
    for (const log of loginLogs) {
      const match = log.content.match(/^用户登录:\s*(.+)$/);
      if (match) {
        const identifier = match[1].trim();
        const existing = loginStatsMap.get(identifier);
        if (existing) {
          existing.count += 1;
          if (log.createdAt > existing.lastLoginAt) {
            existing.lastLoginAt = log.createdAt;
          }
        } else {
          loginStatsMap.set(identifier, { count: 1, lastLoginAt: log.createdAt });
        }
      }
    }

    const headers = ['ID', '用户名', '姓名', '角色', '所属项目', '最后登录', '登录次数', '创建时间'];

    const rows = users.map(u => {
      const identifier = u.displayName || u.username;
      const stats = loginStatsMap.get(identifier);
      return [
        u.id,
        u.username,
        u.displayName || '',
        u.role === 'admin' ? '管理员' : '普通用户',
        u.project?.name || '',
        stats?.lastLoginAt?.toISOString().replace('T', ' ').substring(0, 19) || '',
        stats?.count ?? 0,
        u.createdAt.toISOString().replace('T', ' ').substring(0, 19),
      ];
    });

    if (format === 'xlsx') {
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      worksheet['!cols'] = [
        { wch: 6 },   // ID
        { wch: 16 },  // 用户名
        { wch: 12 },  // 姓名
        { wch: 10 },  // 角色
        { wch: 16 },  // 所属项目
        { wch: 20 },  // 最后登录
        { wch: 10 },  // 登录次数
        { wch: 20 },  // 创建时间
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '用户列表');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('用户列表.xlsx')}`,
        },
      });
    }

    // CSV format (default)
    const bom = '\uFEFF';
    const csvContent = bom + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('用户列表.csv')}`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
