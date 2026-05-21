import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { oldPassword, newPassword } = await request.json();
    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: '请填写旧密码和新密码' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码长度至少6位' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user || user.passwordHash !== hashPassword(oldPassword)) {
      return NextResponse.json({ error: '旧密码不正确' }, { status: 400 });
    }

    await db.user.update({
      where: { id: session.userId },
      data: { passwordHash: hashPassword(newPassword) },
    });

    await db.log.create({
      data: {
        logType: 'PASSWORD_CHANGE',
        content: `用户修改密码: ${session.username}`,
        operator: session.username,
      },
    });

    return NextResponse.json({ message: '密码修改成功' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
