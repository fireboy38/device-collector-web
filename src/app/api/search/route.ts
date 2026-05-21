import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ devices: [], projects: [], users: [], departments: [] });
  }

  const limit = 5;

  try {
    const [devices, projects, users, departments] = await Promise.all([
      db.device.findMany({
        where: {
          OR: [
            { userName: { contains: q } },
            { computerName: { contains: q } },
            { ipAddress: { contains: q } },
            { macAddress: { contains: q } },
            { osInfo: { contains: q } },
          ],
        },
        include: { department: { include: { project: true } } },
        take: limit,
        orderBy: { collectedAt: 'desc' },
      }),
      db.project.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.findMany({
        where: {
          OR: [
            { username: { contains: q } },
            { displayName: { contains: q } },
          ],
        },
        include: { project: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.department.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { code: { contains: q } },
          ],
        },
        include: { project: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      devices: devices.map((d) => ({
        id: d.id,
        userName: d.userName,
        computerName: d.computerName,
        ipAddress: d.ipAddress,
        osInfo: d.osInfo,
        departmentName: d.department?.name,
        projectName: d.department?.project?.name,
      })),
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
      })),
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        projectName: u.project?.name,
      })),
      departments: departments.map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        projectName: d.project?.name,
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ devices: [], projects: [], users: [], departments: [] });
  }
}
