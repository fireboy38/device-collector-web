import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { wsNotify } from '@/lib/ws-notify';
import { getSession } from '@/lib/session';

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
    const authError = await requireAuth(request);
    if (authError) return authError;

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

    // Fetch old device data before updating
    const oldDevice = await db.device.findUnique({ where: { id: deviceId } });

    await db.device.update({ where: { id: deviceId }, data: updateData });

    // Record UPDATE history with field diff
    if (oldDevice) {
      const fieldLabels: Record<string, string> = {
        departmentId: '所属单位', userName: '使用人', userPhone: '联系电话',
        userPosition: '安装位置', computerName: '电脑名称', ipAddress: 'IP地址',
        macAddress: 'MAC地址', dhcpEnabled: 'DHCP', osInfo: '操作系统',
        cpuInfo: 'CPU', ramInfo: '内存', diskInfo: '硬盘',
        motherboardInfo: '主板', gpuInfo: '显卡', networkAdapter: '网卡',
        subnetMask: '子网掩码', gateway: '默认网关', dnsServers: 'DNS服务器',
      };
      const changedFields: Record<string, { old: unknown; new: unknown }> = {};
      for (const key of Object.keys(updateData)) {
        const oldValue = (oldDevice as any)[key];
        const newValue = updateData[key];
        if (String(oldValue ?? '') !== String(newValue ?? '')) {
          changedFields[fieldLabels[key] || key] = { old: oldValue, new: newValue };
        }
      }
      if (Object.keys(changedFields).length > 0) {
        const session = await getSession();
        await db.deviceHistory.create({
          data: {
            deviceId,
            action: 'UPDATE',
            changes: JSON.stringify(changedFields),
            operator: session?.username || 'system',
          }
        });
      }
    }

    await db.log.create({
      data: {
        logType: 'DEVICE_EDIT',
        content: `设备记录编辑 (ID:${deviceId})`,
        detail: `修改字段: ${Object.keys(updateData).join(', ')}`,
      }
    });

    // Send real-time notification
    const deviceForNotify = await db.device.findUnique({ where: { id: deviceId } });
    wsNotify(
      'device_edit',
      '设备信息更新',
      `设备${deviceForNotify?.computerName || `#${deviceId}`}已更新`,
      { deviceId, computerName: deviceForNotify?.computerName }
    );

    return NextResponse.json({ message: '更新成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const deviceId = parseInt(id);

    const device = await db.device.findUnique({
      where: { id: deviceId },
      include: { department: true }
    });

    // Record DELETE history before deleting
    if (device) {
      const session = await getSession();
      await db.deviceHistory.create({
        data: {
          deviceId,
          action: 'DELETE',
          changes: JSON.stringify({ deleted: device }),
          operator: session?.username || 'system',
        }
      });
    }

    await db.device.delete({ where: { id: deviceId } });

    await db.log.create({
      data: {
        logType: 'DEVICE_DELETE',
        content: `设备记录删除 (ID:${deviceId})`,
        detail: `电脑:${device?.computerName || '未知'}, 使用人:${device?.userName || '未知'}`,
      }
    });

    // Send real-time notification
    wsNotify(
      'device_delete',
      '设备已删除',
      `设备${device?.computerName || `#${deviceId}`}已删除`,
      { deviceId, computerName: device?.computerName, userName: device?.userName }
    );

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
