import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Get recent important logs as notifications
    const recentLogs = await db.log.findMany({
      where: {
        logType: { in: ['USER_LOGIN', 'LOGIN_FAILED', 'DEVICE_SUBMIT', 'DEVICE_DELETE', 'DUPLICATE_WARNING'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const notifications = recentLogs.map(log => ({
      id: log.id,
      type: log.logType === 'USER_LOGIN' ? 'success' :
            log.logType === 'LOGIN_FAILED' ? 'error' :
            log.logType === 'DUPLICATE_WARNING' ? 'warning' : 'info',
      title: log.content,
      time: log.createdAt,
      read: false,
    }));

    const unreadCount = notifications.length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
