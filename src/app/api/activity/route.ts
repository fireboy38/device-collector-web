import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Fetch last 10 activity events from logs
    const logs = await db.log.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        logType: true,
        content: true,
        operator: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    // Map log types to activity types with icons and colors
    const typeConfig: Record<string, { icon: string; color: string; label: string }> = {
      USER_LOGIN: { icon: 'logIn', color: 'emerald', label: '用户登录' },
      LOGIN_FAILED: { icon: 'shieldOff', color: 'red', label: '登录失败' },
      LOGIN_LOCKOUT: { icon: 'lock', color: 'red', label: '账户锁定' },
      DEVICE_SUBMIT: { icon: 'monitor', color: 'emerald', label: '设备提交' },
      DEVICE_EDIT: { icon: 'pencil', color: 'amber', label: '设备编辑' },
      DEVICE_DELETE: { icon: 'trash', color: 'red', label: '设备删除' },
      DEPT_ADD: { icon: 'building', color: 'teal', label: '单位添加' },
      DEPT_EDIT: { icon: 'pencil', color: 'amber', label: '单位编辑' },
      DEPT_DELETE: { icon: 'trash', color: 'red', label: '单位删除' },
      APIKEY_CREATE: { icon: 'key', color: 'purple', label: '密钥创建' },
      PASSWORD_CHANGE: { icon: 'key', color: 'amber', label: '密码修改' },
      DUPLICATE_WARNING: { icon: 'alertTriangle', color: 'amber', label: '重复警告' },
      DUPLICATE_CONFIRMED: { icon: 'checkCircle', color: 'emerald', label: '重复确认' },
      SYSTEM: { icon: 'settings', color: 'slate', label: '系统操作' },
    };

    const activities = logs.map(log => {
      const config = typeConfig[log.logType] || { icon: 'activity', color: 'slate', label: log.logType };
      return {
        id: log.id,
        type: log.logType,
        icon: config.icon,
        color: config.color,
        label: config.label,
        description: log.content,
        operator: log.operator,
        ipAddress: log.ipAddress,
        timestamp: log.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    return NextResponse.json({ activities: [] }, { status: 500 });
  }
}
