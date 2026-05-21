import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { wsNotify } from '@/lib/ws-notify';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const deptId = searchParams.get('department_id');
    const keyword = searchParams.get('keyword')?.trim();
    const osFilter = searchParams.get('os')?.trim();
    const dhcpFilter = searchParams.get('dhcp')?.trim();
    const dateFrom = searchParams.get('date_from')?.trim();
    const dateTo = searchParams.get('date_to')?.trim();

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
        { macAddress: { contains: keyword } },
        { osInfo: { contains: keyword } },
      ];
    }

    if (osFilter) {
      where.osInfo = { contains: osFilter };
    }

    if (dhcpFilter) {
      where.dhcpEnabled = dhcpFilter;
    }

    if (dateFrom || dateTo) {
      where.collectedAt = {};
      if (dateFrom) (where.collectedAt as any).gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        (where.collectedAt as any).lte = toDate;
      }
    }

    const devices = await db.device.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      include: {
        department: {
          include: { project: true }
        }
      },
    });

    const result = devices.map(d => ({
      id: d.id,
      departmentId: d.departmentId,
      departmentName: d.department?.name || null,
      departmentCode: d.department?.code || null,
      projectId: d.department?.projectId || null,
      projectName: d.department?.project?.name || null,
      userName: d.userName,
      userPhone: d.userPhone,
      userPosition: d.userPosition,
      computerName: d.computerName,
      ipAddress: d.ipAddress,
      macAddress: d.macAddress,
      dhcpEnabled: d.dhcpEnabled,
      osInfo: d.osInfo,
      cpuInfo: d.cpuInfo,
      ramInfo: d.ramInfo,
      diskInfo: d.diskInfo,
      motherboardInfo: d.motherboardInfo,
      gpuInfo: d.gpuInfo,
      networkAdapter: d.networkAdapter,
      subnetMask: d.subnetMask,
      gateway: d.gateway,
      dnsServers: d.dnsServers,
      collectedAt: d.collectedAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Devices GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data.department_id || !data.user_name) {
      return NextResponse.json({ error: '缺少必填字段: department_id, user_name' }, { status: 400 });
    }

    const ipAddress = data.ip_address || '';
    const macAddress = data.mac_address || '';
    const force = data.force || false;

    // Check IP/MAC duplicates
    const duplicates: any[] = [];

    if (ipAddress && !['未知', '0.0.0.0', ''].includes(ipAddress)) {
      const ipDups = await db.device.findMany({
        where: { ipAddress, NOT: { ipAddress: '未知' } },
        include: { department: true }
      });
      for (const d of ipDups) {
        duplicates.push({
          type: 'IP地址重复',
          field: 'ip_address',
          value: ipAddress,
          deviceId: d.id,
          computerName: d.computerName,
          userName: d.userName,
          departmentName: d.department?.name,
        });
      }
    }

    if (macAddress && !['未知', '00:00:00:00:00:00', ''].includes(macAddress)) {
      const macDups = await db.device.findMany({
        where: { macAddress, NOT: { macAddress: '未知' } },
        include: { department: true }
      });
      for (const d of macDups) {
        duplicates.push({
          type: 'MAC地址重复',
          field: 'mac_address',
          value: macAddress,
          deviceId: d.id,
          computerName: d.computerName,
          userName: d.userName,
          departmentName: d.department?.name,
        });
      }
    }

    if (duplicates.length > 0 && !force) {
      return NextResponse.json({
        duplicate: true,
        message: '检测到IP或MAC地址与已有设备重复',
        duplicates,
      }, { status: 409 });
    }

    const device = await db.device.create({
      data: {
        departmentId: parseInt(data.department_id),
        userName: data.user_name,
        userPhone: data.user_phone || null,
        userPosition: data.user_position || null,
        computerName: data.computer_name || null,
        ipAddress: data.ip_address || null,
        macAddress: data.mac_address || null,
        dhcpEnabled: data.dhcp_enabled || null,
        osInfo: data.os_info || null,
        cpuInfo: data.cpu_info || null,
        ramInfo: data.ram_info || null,
        diskInfo: data.disk_info || null,
        motherboardInfo: data.motherboard_info || null,
        gpuInfo: data.gpu_info || null,
        networkAdapter: data.network_adapter || null,
        subnetMask: data.subnet_mask || null,
        gateway: data.gateway || null,
        dnsServers: data.dns_servers || null,
      }
    });

    await db.log.create({
      data: {
        logType: 'DEVICE_SUBMIT',
        content: '设备信息提交成功',
        detail: `设备ID:${device.id}, 电脑:${data.computer_name || '未知'}, IP:${ipAddress}`,
        operator: data._username || '未知',
      }
    });

    // Send real-time notification
    wsNotify(
      'device_submit',
      '新设备提交',
      `用户${data.user_name || '未知'}提交了设备${data.computer_name || '未知'}`,
      { deviceId: device.id, userName: data.user_name, computerName: data.computer_name, ipAddress }
    );

    // Record device history
    const session = await getSession();
    await db.deviceHistory.create({
      data: {
        deviceId: device.id,
        action: 'CREATE',
        changes: JSON.stringify({ all: { old: null, new: data } }),
        operator: session?.username || data._username || 'system',
      }
    });

    return NextResponse.json({ message: '提交成功', id: device.id }, { status: 201 });
  } catch (error) {
    console.error('Device POST error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
