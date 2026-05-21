import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get('log_type');
    const keyword = searchParams.get('keyword')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') || '20')));

    const where: any = {};
    if (logType) where.logType = logType;
    if (keyword) {
      where.OR = [
        { content: { contains: keyword } },
        { detail: { contains: keyword } },
        { operator: { contains: keyword } },
      ];
    }

    const [logs, total] = await Promise.all([
      db.log.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.log.count({ where }),
    ]);

    return NextResponse.json({
      items: logs,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    await db.log.deleteMany();
    return NextResponse.json({ message: '日志已清空' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
