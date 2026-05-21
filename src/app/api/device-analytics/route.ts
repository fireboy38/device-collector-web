import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // OS distribution
    const devices = await db.device.findMany({ select: { osInfo: true, collectedAt: true } });

    const osDistribution: Record<string, number> = {};
    devices.forEach(d => {
      let os = '未知';
      if (d.osInfo) {
        const lower = d.osInfo.toLowerCase();
        if (lower.includes('windows 10') || lower.includes('windows10')) os = 'Windows 10';
        else if (lower.includes('windows 11') || lower.includes('windows11')) os = 'Windows 11';
        else if (lower.includes('windows 7') || lower.includes('windows7')) os = 'Windows 7';
        else if (lower.includes('windows')) os = 'Windows (其他)';
        else if (lower.includes('mac') || lower.includes('darwin')) os = 'macOS';
        else if (lower.includes('linux') || lower.includes('ubuntu') || lower.includes('centos')) os = 'Linux';
        else if (lower.includes('麒麟') || lower.includes('kylin')) os = '麒麟OS';
        else os = d.osInfo.length > 20 ? d.osInfo.substring(0, 20) + '...' : d.osInfo;
      }
      osDistribution[os] = (osDistribution[os] || 0) + 1;
    });

    const osData = Object.entries(osDistribution)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Collection timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentDevices = devices.filter(d => d.collectedAt >= thirtyDaysAgo);
    const timelineMap: Record<string, number> = {};
    recentDevices.forEach(d => {
      const dateKey = d.collectedAt.toISOString().slice(0, 10);
      timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
    });

    const timeline = Object.entries(timelineMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ osData, timeline, totalDevices: devices.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
