import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const device = await db.device.findUnique({
      where: { id: parseInt(id) },
      include: {
        department: { include: { project: true } }
      }
    });
    if (!device) {
      return NextResponse.json({ error: '设备不存在' }, { status: 404 });
    }
    return NextResponse.json({
      ...device,
      departmentName: device.department?.name,
      departmentCode: device.department?.code,
      projectId: device.department?.projectId,
      projectName: device.department?.project?.name,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const deviceId = parseInt(id);

    const fieldMap: Record<string, string> = {
      department_id: 'departmentId',
      user_name: 'userName',
      user_phone: 'userPhone',
      user_position: 'userPosition',
      computer_name: 'computerName',
      ip_address: 'ipAddress',
      mac_address: 'macAddress',
      dhcp_enabled: 'dhcpEnabled',
      os_info: 'osInfo',
      cpu_info: 'cpuInfo',
      ram_info: 'ramInfo',
      disk_info: 'diskInfo',
      motherboard_info: 'motherboardInfo',
      gpu_info: 'gpuInfo',
      network_adapter: 'networkAdapter',
      subnet_mask: 'subnetMask',
      gateway: 'gateway',
      dns_servers: 'dnsServers',
    };

    const updateData: any = {};
    for (const [snakeKey, camelKey] of Object.entries(fieldMap)) {
      if (data[snakeKey] !== undefined) {
        updateData[camelKey] = data[snakeKey];
      }
      if (data[camelKey] !== undefined) {
        updateData[camelKey] = data[camelKey];
      }
    }

    // Also handle departmentId directly
    if (data.departmentId) {
      updateData.departmentId = parseInt(data.departmentId);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    await db.device.update({ where: { id: deviceId }, data: updateData });

    await db.log.create({
      data: {
        logType: 'DEVICE_EDIT',
        content: `设备记录编辑 (ID:${deviceId})`,
        detail: `修改字段: ${Object.keys(updateData).join(', ')}`,
      }
    });

    return NextResponse.json({ message: '更新成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const deviceId = parseInt(id);

    const device = await db.device.findUnique({
      where: { id: deviceId },
      include: { department: true }
    });

    await db.device.delete({ where: { id: deviceId } });

    await db.log.create({
      data: {
        logType: 'DEVICE_DELETE',
        content: `设备记录删除 (ID:${deviceId})`,
        detail: `电脑:${device?.computerName || '未知'}, 使用人:${device?.userName || '未知'}`,
      }
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
