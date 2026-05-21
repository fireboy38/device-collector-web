import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [deviceCount, todayCount, projectCount, deptCount, userCount] = await Promise.all([
      db.device.count(),
      db.device.count({
        where: {
          collectedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          }
        }
      }),
      db.project.count(),
      db.department.count(),
      db.user.count(),
    ]);

    // Device count by project
    const projects = await db.project.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { departments: true } },
      }
    });

    const projectStats = await Promise.all(projects.map(async (p) => {
      const count = await db.device.count({
        where: { department: { projectId: p.id } }
      });
      return {
        id: p.id,
        name: p.name,
        code: p.code,
        deviceCount: count,
        deptCount: p._count.departments,
      };
    }));

    // Recent devices
    const recentDevices = await db.device.findMany({
      take: 5,
      orderBy: { collectedAt: 'desc' },
      include: { department: { include: { project: true } } },
    });

    // 7-day collection trend
    const trendData: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await db.device.count({
        where: {
          collectedAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      });

      trendData.push({
        date: dayStart.toISOString().split('T')[0],
        count,
      });
    }

    return NextResponse.json({
      deviceCount,
      todayCount,
      projectCount,
      deptCount,
      userCount,
      projectStats,
      trendData,
      recentDevices: recentDevices.map(d => ({
        id: d.id,
        userName: d.userName,
        computerName: d.computerName,
        ipAddress: d.ipAddress,
        projectName: d.department?.project?.name,
        departmentName: d.department?.name,
        collectedAt: d.collectedAt,
      })),
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
