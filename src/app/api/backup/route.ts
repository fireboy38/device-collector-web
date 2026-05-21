import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Export all data as JSON
    const [projects, users, departments, devices, logs, apiKeys] = await Promise.all([
      db.project.findMany(),
      db.user.findMany(),
      db.department.findMany(),
      db.device.findMany(),
      db.log.findMany(),
      db.apiKey.findMany(),
    ]);

    const backup = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      data: { projects, users, departments, devices, logs, apiKeys },
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`设备采集备份_${new Date().toISOString().slice(0, 10)}.json`)}`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    if (!body.data) {
      return NextResponse.json({ error: '无效的备份文件格式' }, { status: 400 });
    }

    const { projects, users, departments, devices, logs, apiKeys } = body.data;
    const result = { projects: 0, users: 0, departments: 0, devices: 0, logs: 0, apiKeys: 0 };

    // Restore in order respecting foreign keys
    // First clear existing data (in reverse order)
    await db.log.deleteMany();
    await db.device.deleteMany();
    await db.apiKey.deleteMany();
    await db.department.deleteMany();
    await db.user.deleteMany();
    await db.project.deleteMany();

    // Then restore
    if (projects?.length) {
      for (const p of projects) {
        await db.project.create({
          data: {
            name: p.name,
            code: p.code,
            description: p.description,
            createdAt: new Date(p.createdAt || p.created_at),
          },
        });
        result.projects++;
      }
    }
    if (users?.length) {
      for (const u of users) {
        await db.user.create({
          data: {
            username: u.username,
            passwordHash: u.passwordHash || u.password_hash,
            displayName: u.displayName || u.display_name,
            projectId: u.projectId || u.project_id,
            role: u.role,
            createdAt: new Date(u.createdAt || u.created_at),
          },
        });
        result.users++;
      }
    }
    if (departments?.length) {
      for (const d of departments) {
        await db.department.create({
          data: {
            projectId: d.projectId || d.project_id,
            name: d.name,
            code: d.code,
            description: d.description,
            createdAt: new Date(d.createdAt || d.created_at),
          },
        });
        result.departments++;
      }
    }
    if (devices?.length) {
      for (const d of devices) {
        await db.device.create({
          data: {
            departmentId: d.departmentId || d.department_id,
            userName: d.userName || d.user_name,
            userPhone: d.userPhone || d.user_phone,
            userPosition: d.userPosition || d.user_position,
            computerName: d.computerName || d.computer_name,
            ipAddress: d.ipAddress || d.ip_address,
            macAddress: d.macAddress || d.mac_address,
            dhcpEnabled: d.dhcpEnabled || d.dhcp_enabled,
            osInfo: d.osInfo || d.os_info,
            cpuInfo: d.cpuInfo || d.cpu_info,
            ramInfo: d.ramInfo || d.ram_info,
            diskInfo: d.diskInfo || d.disk_info,
            motherboardInfo: d.motherboardInfo || d.motherboard_info,
            gpuInfo: d.gpuInfo || d.gpu_info,
            networkAdapter: d.networkAdapter || d.network_adapter,
            subnetMask: d.subnetMask || d.subnet_mask,
            gateway: d.gateway,
            dnsServers: d.dnsServers || d.dns_servers,
            collectedAt: new Date(d.collectedAt || d.collected_at),
          },
        });
        result.devices++;
      }
    }
    if (logs?.length) {
      for (const l of logs) {
        await db.log.create({
          data: {
            logType: l.logType || l.log_type,
            content: l.content,
            detail: l.detail,
            operator: l.operator,
            ipAddress: l.ipAddress || l.ip_address,
            createdAt: new Date(l.createdAt || l.created_at),
          },
        });
        result.logs++;
      }
    }
    if (apiKeys?.length) {
      for (const k of apiKeys) {
        await db.apiKey.create({
          data: {
            name: k.name,
            apiKey: k.apiKey || k.api_key,
            description: k.description,
            permissions: k.permissions,
            isActive: k.isActive ?? k.is_active ?? 1,
            lastUsedAt: k.lastUsedAt || k.last_used_at ? new Date(k.lastUsedAt || k.last_used_at) : null,
            createdAt: new Date(k.createdAt || k.created_at),
            expiresAt: k.expiresAt || k.expires_at ? new Date(k.expiresAt || k.expires_at) : null,
          },
        });
        result.apiKeys++;
      }
    }

    return NextResponse.json({ message: '数据恢复成功', result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
