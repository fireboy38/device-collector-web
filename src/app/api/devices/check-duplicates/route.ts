import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET() {
  try {
    // Find IP duplicates
    const ipDups = await db.$queryRaw<Array<{ip_address: string; id: number; computer_name: string | null; user_name: string; department_id: number}>>`
      SELECT d1.id, d1.computer_name, d1.user_name, d1.ip_address, d1.mac_address, d1.department_id
      FROM devices d1
      INNER JOIN devices d2 ON d1.ip_address = d2.ip_address AND d1.id != d2.id
      WHERE d1.ip_address IS NOT NULL AND d1.ip_address != '' AND d1.ip_address != '未知' AND d1.ip_address != '0.0.0.0'
      GROUP BY d1.ip_address, d1.id
      ORDER BY d1.ip_address
    `;

    // Find MAC duplicates
    const macDups = await db.$queryRaw<Array<{mac_address: string; id: number; computer_name: string | null; user_name: string; department_id: number}>>`
      SELECT d1.id, d1.computer_name, d1.user_name, d1.ip_address, d1.mac_address, d1.department_id
      FROM devices d1
      INNER JOIN devices d2 ON d1.mac_address = d2.mac_address AND d1.id != d2.id
      WHERE d1.mac_address IS NOT NULL AND d1.mac_address != '' AND d1.mac_address != '未知' AND d1.mac_address != '00:00:00:00:00:00'
      GROUP BY d1.mac_address, d1.id
      ORDER BY d1.mac_address
    `;

    // Get department/project info for duplicates
    const allDupIds = [...new Set([...ipDups.map(d => d.id), ...macDups.map(d => d.id)])];
    const deviceDetails = allDupIds.length > 0 ? await db.device.findMany({
      where: { id: { in: allDupIds } },
      include: { department: { include: { project: true } } }
    }) : [];

    const detailMap = new Map(deviceDetails.map(d => [d.id, d]));

    // Group by IP
    const ipGroups: Record<string, any[]> = {};
    for (const r of ipDups) {
      const ip = r.ip_address;
      if (!ipGroups[ip]) ipGroups[ip] = [];
      const detail = detailMap.get(r.id);
      ipGroups[ip].push({
        id: r.id,
        computerName: r.computer_name,
        userName: r.user_name,
        ipAddress: r.ip_address,
        macAddress: r.mac_address,
        departmentName: detail?.department?.name,
        projectName: detail?.department?.project?.name,
      });
    }

    // Group by MAC
    const macGroups: Record<string, any[]> = {};
    for (const r of macDups) {
      const mac = r.mac_address;
      if (!macGroups[mac]) macGroups[mac] = [];
      const detail = detailMap.get(r.id);
      macGroups[mac].push({
        id: r.id,
        computerName: r.computer_name,
        userName: r.user_name,
        ipAddress: r.ip_address,
        macAddress: r.mac_address,
        departmentName: detail?.department?.name,
        projectName: detail?.department?.project?.name,
      });
    }

    return NextResponse.json({
      ipDuplicates: ipGroups,
      macDuplicates: macGroups,
      ipDuplicateCount: Object.keys(ipGroups).length,
      macDuplicateCount: Object.keys(macGroups).length,
      totalDuplicateDevices: allDupIds.length,
    });
  } catch (error) {
    console.error('Check duplicates error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
