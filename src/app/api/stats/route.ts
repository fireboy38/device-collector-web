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

    return NextResponse.json({
      deviceCount,
      todayCount,
      projectCount,
      deptCount,
      userCount,
      projectStats,
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
