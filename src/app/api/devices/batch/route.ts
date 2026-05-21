import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { devices } = await request.json();
    if (!Array.isArray(devices) || devices.length === 0) {
      return NextResponse.json({ error: '请提供要导入的设备数据' }, { status: 400 });
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const dev of devices) {
      try {
        if (!dev.departmentId || !dev.userName) {
          skipped++;
          continue;
        }

        // Check IP duplicate
        if (dev.ipAddress) {
          const ipDup = await db.device.findFirst({ where: { ipAddress: dev.ipAddress } });
          if (ipDup) {
            skipped++;
            errors.push(`${dev.userName} 的IP ${dev.ipAddress} 已存在`);
            continue;
          }
        }

        // Check MAC duplicate
        if (dev.macAddress) {
          const macDup = await db.device.findFirst({ where: { macAddress: dev.macAddress } });
          if (macDup) {
            skipped++;
            errors.push(`${dev.userName} 的MAC ${dev.macAddress} 已存在`);
            continue;
          }
        }

        await db.device.create({
          data: {
            departmentId: parseInt(dev.departmentId),
            userName: dev.userName,
            userPhone: dev.userPhone || null,
            userPosition: dev.userPosition || null,
            computerName: dev.computerName || null,
            ipAddress: dev.ipAddress || null,
            macAddress: dev.macAddress || null,
            dhcpEnabled: dev.dhcpEnabled || null,
            osInfo: dev.osInfo || null,
            cpuInfo: dev.cpuInfo || null,
            ramInfo: dev.ramInfo || null,
            diskInfo: dev.diskInfo || null,
            motherboardInfo: dev.motherboardInfo || null,
            gpuInfo: dev.gpuInfo || null,
            networkAdapter: dev.networkAdapter || null,
            subnetMask: dev.subnetMask || null,
            gateway: dev.gateway || null,
            dnsServers: dev.dnsServers || null,
          },
        });
        created++;
      } catch (e) {
        skipped++;
        errors.push(`设备 ${dev.userName || '未知'} 导入失败`);
      }
    }

    await db.log.create({
      data: {
        logType: 'device',
        content: '批量导入设备',
        detail: `成功导入 ${created} 台，跳过 ${skipped} 台`,
        operator: session.username,
      },
    });

    return NextResponse.json({ created, skipped, errors });
  } catch (error) {
    console.error('Batch import devices error:', error);
    return NextResponse.json({ error: '批量导入失败' }, { status: 500 });
  }
}
