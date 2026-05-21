import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateApiKey } from '@/lib/auth';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const keys = await db.apiKey.findMany({ orderBy: { id: 'asc' } });
    const result = keys.map(k => ({
      ...k,
      apiKey: k.apiKey.substring(0, 8) + '...' + k.apiKey.substring(k.apiKey.length - 4),
    }));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { name, permissions, description, expiresAt } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: '名称不能为空' }, { status: 400 });
    }

    const key = generateApiKey();
    const apiKey = await db.apiKey.create({
      data: {
        name: name.trim(),
        apiKey: key,
        description: description?.trim() || null,
        permissions: permissions || 'read',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    });

    await db.log.create({
      data: {
        logType: 'APIKEY_CREATE',
        content: `API Key创建: ${name}`,
      }
    });

    // Return the FULL key only on creation
    return NextResponse.json({ ...apiKey, apiKey: key }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
