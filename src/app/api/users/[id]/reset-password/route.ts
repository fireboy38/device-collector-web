import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { password } = await request.json();
    const newPwd = password?.trim() || '123456';
    await db.user.update({
      where: { id: parseInt(id) },
      data: { passwordHash: hashPassword(newPwd) }
    });
    return NextResponse.json({ message: `密码已重置为: ${newPwd}` });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
