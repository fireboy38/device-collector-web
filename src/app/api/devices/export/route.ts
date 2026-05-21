import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const projectId = searchParams.get('project_id');
    const deptId = searchParams.get('department_id');
    const keyword = searchParams.get('keyword')?.trim();

    const where: Prisma.DeviceWhereInput = {};
    if (deptId) {
      where.departmentId = parseInt(deptId);
    } else if (projectId) {
      where.department = { projectId: parseInt(projectId) };
    }
    if (keyword) {
      where.OR = [
        { userName: { contains: keyword } },
        { computerName: { contains: keyword } },
        { ipAddress: { contains: keyword } },
      ];
    }

    const devices = await db.device.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      include: { department: { include: { project: true } } },
    });

    const headers = ['ID', '所属项目', '所属单位', '使用人', '联系电话', '安装位置', '电脑名称', 'IP地址', 'MAC地址', 'DHCP', '操作系统', 'CPU', '内存', '硬盘', '主板', '显卡', '网卡', '子网掩码', '默认网关', 'DNS服务器', '采集时间'];

    const rows = devices.map(d => [
      d.id,
      d.department?.project?.name || '',
      d.department?.name || '',
      d.userName,
      d.userPhone || '',
      d.userPosition || '',
      d.computerName || '',
      d.ipAddress || '',
      d.macAddress || '',
      d.dhcpEnabled || '',
      d.osInfo || '',
      d.cpuInfo || '',
      d.ramInfo || '',
      d.diskInfo || '',
      d.motherboardInfo || '',
      d.gpuInfo || '',
      d.networkAdapter || '',
      d.subnetMask || '',
      d.gateway || '',
      d.dnsServers || '',
      d.collectedAt.toISOString().replace('T', ' ').substring(0, 19),
    ]);

    if (format === 'xlsx') {
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths for better readability
      worksheet['!cols'] = [
        { wch: 6 },   // ID
        { wch: 14 },  // 所属项目
        { wch: 14 },  // 所属单位
        { wch: 10 },  // 使用人
        { wch: 14 },  // 联系电话
        { wch: 14 },  // 安装位置
        { wch: 18 },  // 电脑名称
        { wch: 16 },  // IP地址
        { wch: 20 },  // MAC地址
        { wch: 6 },   // DHCP
        { wch: 24 },  // 操作系统
        { wch: 28 },  // CPU
        { wch: 10 },  // 内存
        { wch: 16 },  // 硬盘
        { wch: 20 },  // 主板
        { wch: 24 },  // 显卡
        { wch: 24 },  // 网卡
        { wch: 16 },  // 子网掩码
        { wch: 16 },  // 默认网关
        { wch: 20 },  // DNS服务器
        { wch: 20 },  // 采集时间
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '设备列表');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('设备列表.xlsx')}`,
        },
      });
    }

    // CSV format (default)
    const bom = '\uFEFF';
    const csvContent = bom + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('设备列表.csv')}`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
