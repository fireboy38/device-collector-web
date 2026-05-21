import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { setSession } from '@/lib/session';

export async function GET() {
  try {
    // Check if already seeded
    const projectCount = await db.project.count();
    if (projectCount > 0) {
      return NextResponse.json({ message: 'Database already seeded', projectCount });
    }

    // Seed projects
    const p1 = await db.project.create({ data: { name: '总部设备管理', code: 'HQ', description: '总部办公设备资产管理' } });
    const p2 = await db.project.create({ data: { name: '研发中心设备管理', code: 'RD', description: '研发中心设备资产管理' } });
    const p3 = await db.project.create({ data: { name: '分公司设备管理', code: 'BRANCH', description: '分公司设备资产管理' } });

    // Seed users (default password: 123456)
    const defaultPwd = hashPassword('123456');
    await db.user.createMany({
      data: [
        { username: 'admin', passwordHash: defaultPwd, displayName: '系统管理员', projectId: null, role: 'admin' },
        { username: 'zhangsan', passwordHash: defaultPwd, displayName: '张三', projectId: p1.id, role: 'user' },
        { username: 'lisi', passwordHash: defaultPwd, displayName: '李四', projectId: p2.id, role: 'user' },
        { username: 'wangwu', passwordHash: defaultPwd, displayName: '王五', projectId: p3.id, role: 'user' },
      ]
    });

    // Seed departments
    await db.department.createMany({
      data: [
        { projectId: p1.id, name: '信息技术部', code: 'IT-001', description: '信息技术部门' },
        { projectId: p1.id, name: '财务部', code: 'FIN-001', description: '财务管理部门' },
        { projectId: p1.id, name: '人力资源部', code: 'HR-001', description: '人力资源管理' },
        { projectId: p1.id, name: '行政部', code: 'ADM-001', description: '行政管理部' },
        { projectId: p2.id, name: '前端开发组', code: 'RD-FE', description: '前端开发团队' },
        { projectId: p2.id, name: '后端开发组', code: 'RD-BE', description: '后端开发团队' },
        { projectId: p2.id, name: '测试组', code: 'RD-QA', description: '质量保证团队' },
        { projectId: p3.id, name: '华北分公司', code: 'BR-NORTH', description: '华北地区' },
        { projectId: p3.id, name: '华南分公司', code: 'BR-SOUTH', description: '华南地区' },
        { projectId: p3.id, name: '华东分公司', code: 'BR-EAST', description: '华东地区' },
      ]
    });

    // Seed API key
    const { generateApiKey } = await import('@/lib/auth');
    await db.apiKey.create({
      data: {
        name: '默认API密钥',
        apiKey: generateApiKey(),
        description: '系统自动生成的默认API密钥，拥有完整读写权限',
        permissions: 'read,write',
      }
    });

    // Seed some sample devices
    const depts = await db.department.findMany();
    if (depts.length > 0) {
      await db.device.createMany({
        data: [
          { departmentId: depts[0].id, userName: '张三', userPhone: '13800138001', userPosition: '3楼301', computerName: 'PC-IT-001', ipAddress: '192.168.1.101', macAddress: 'AA:BB:CC:DD:EE:01', dhcpEnabled: '是', osInfo: 'Windows 11 Pro (Build 22631)', cpuInfo: 'Intel(R) Core(TM) i7-12700', ramInfo: '16.0 GB', diskInfo: 'Samsung SSD 870 (512GB)', motherboardInfo: 'ASUS PRIME B660M-A', gpuInfo: 'NVIDIA GeForce RTX 3060', networkAdapter: 'Intel(R) Ethernet Connection I219-V', subnetMask: '255.255.255.0', gateway: '192.168.1.1', dnsServers: '192.168.1.1, 8.8.8.8' },
          { departmentId: depts[1].id, userName: '李四', userPhone: '13800138002', userPosition: '5楼502', computerName: 'PC-FIN-001', ipAddress: '192.168.1.102', macAddress: 'AA:BB:CC:DD:EE:02', dhcpEnabled: '否', osInfo: 'Windows 10 Pro (Build 19045)', cpuInfo: 'Intel(R) Core(TM) i5-10500', ramInfo: '8.0 GB', diskInfo: 'WDC WD10EZEX (1TB)', motherboardInfo: 'Gigabyte B460M DS3H', gpuInfo: 'Intel(R) UHD Graphics 630', networkAdapter: 'Realtek PCIe GbE Family Controller', subnetMask: '255.255.255.0', gateway: '192.168.1.1', dnsServers: '192.168.1.1' },
          { departmentId: depts[4].id, userName: '王五', userPhone: '13800138003', userPosition: '2楼201', computerName: 'PC-RD-FE-001', ipAddress: '192.168.2.101', macAddress: 'AA:BB:CC:DD:EE:03', dhcpEnabled: '是', osInfo: 'macOS Sonoma 14.3', cpuInfo: 'Apple M2 Pro', ramInfo: '16.0 GB', diskInfo: 'Apple SSD AP0512 (512GB)', motherboardInfo: 'Apple Mac Mini (2023)', gpuInfo: 'Apple M2 Pro 16-Core GPU', networkAdapter: 'Apple Ethernet', subnetMask: '255.255.255.0', gateway: '192.168.2.1', dnsServers: '192.168.2.1, 8.8.8.8' },
          { departmentId: depts[5].id, userName: '赵六', userPhone: '13800138004', userPosition: '2楼203', computerName: 'PC-RD-BE-001', ipAddress: '192.168.2.102', macAddress: 'AA:BB:CC:DD:EE:04', dhcpEnabled: '是', osInfo: 'Ubuntu 22.04 LTS', cpuInfo: 'AMD Ryzen 7 5800X', ramInfo: '32.0 GB', diskInfo: 'Samsung 980 PRO (1TB)', motherboardInfo: 'ASUS ROG STRIX B550-F', gpuInfo: 'NVIDIA GeForce RTX 3080', networkAdapter: 'Intel(R) I211 Gigabit Network', subnetMask: '255.255.255.0', gateway: '192.168.2.1', dnsServers: '192.168.2.1' },
          { departmentId: depts[7].id, userName: '钱七', userPhone: '13800138005', userPosition: '1楼103', computerName: 'PC-BR-N-001', ipAddress: '10.0.1.101', macAddress: 'AA:BB:CC:DD:EE:05', dhcpEnabled: '是', osInfo: 'Windows 11 Pro (Build 22631)', cpuInfo: 'Intel(R) Core(TM) i5-12400', ramInfo: '8.0 GB', diskInfo: 'Kingston A2000 (256GB)', motherboardInfo: 'MSI PRO B660M-A', gpuInfo: 'Intel(R) UHD Graphics 730', networkAdapter: 'Realtek PCIe GbE Family Controller', subnetMask: '255.255.255.0', gateway: '10.0.1.1', dnsServers: '10.0.1.1' },
        ]
      });
    }

    // Seed some logs
    await db.log.createMany({
      data: [
        { logType: 'SYSTEM', content: '系统初始化', detail: '数据库初始化完成，示例数据已创建' },
        { logType: 'USER_LOGIN', content: '用户登录: 系统管理员', detail: '用户名:admin, 角色:admin', operator: 'admin' },
      ]
    });

    return NextResponse.json({ message: 'Database seeded successfully!' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
