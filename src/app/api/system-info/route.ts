import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const [deviceCount, userCount, projectCount, deptCount, logCount, apiKeyCount] = await Promise.all([
      db.device.count(),
      db.user.count(),
      db.project.count(),
      db.department.count(),
      db.log.count(),
      db.apiKey.count(),
    ]);

    // Get DB size info
    const latestDevice = await db.device.findFirst({ orderBy: { collectedAt: 'desc' } });
    const latestLog = await db.log.findFirst({ orderBy: { createdAt: 'desc' } });

    // Get recent login logs
    const recentLogins = await db.log.findMany({
      where: { logType: 'USER_LOGIN' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      stats: { deviceCount, userCount, projectCount, deptCount, logCount, apiKeyCount },
      latestActivity: {
        lastDeviceCollection: latestDevice?.collectedAt || null,
        lastLogTime: latestLog?.createdAt || null,
      },
      recentLogins: recentLogins.map(l => ({
        content: l.content,
        createdAt: l.createdAt,
        ipAddress: l.ipAddress,
      })),
      systemInfo: {
        version: '2.0.0',
        nodeEnv: process.env.NODE_ENV || 'development',
        dbType: 'SQLite',
        uptime: process.uptime(),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
