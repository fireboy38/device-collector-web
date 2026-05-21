import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

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

    if (format === 'csv') {
      const bom = '\uFEFF';
      const csvContent = bom + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('设备列表.csv')}`,
        },
      });
    }

    // For xlsx, we'll return CSV for now (can add xlsx package later)
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
