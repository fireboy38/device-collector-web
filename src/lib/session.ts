import { cookies } from 'next/headers';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const SESSION_SECRET = 'device-collector-session-2026-secure';

interface SessionData {
  userId: number;
  username: string;
  displayName: string | null;
  role: string;
  projectId: number | null;
}

function encryptSession(data: SessionData): string {
  const json = JSON.stringify(data);
  const iv = randomBytes(16);
  const key = createHash('sha256').update(SESSION_SECRET).digest();
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(json, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}

function decryptSession(token: string): SessionData | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 2) return null;
    const iv = Buffer.from(parts[0], 'base64');
    const key = createHash('sha256').update(SESSION_SECRET).digest();
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(parts[1], 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

export async function setSession(data: SessionData): Promise<void> {
  const token = encryptSession(data);
  const cookieStore = await cookies();
  cookieStore.set('dc_session', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('dc_session')?.value;
  if (!token) return null;
  return decryptSession(token);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('dc_session');
}
