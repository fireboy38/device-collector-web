import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authError = await requireAuth(request);
    if (authError) return authError;

    const { id } = await params;
    const deviceId = parseInt(id);

    if (isNaN(deviceId)) {
      return NextResponse.json({ error: '无效的设备ID' }, { status: 400 });
    }

    const histories = await db.deviceHistory.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const result = histories.map(h => ({
      ...h,
      changes: JSON.parse(h.changes),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Device history GET error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
