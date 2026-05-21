import { createHash, randomBytes } from 'crypto';

const SECRET_KEY = 'device-collector-2026';

export function hashPassword(password: string): string {
  return createHash('sha256').update(password + SECRET_KEY).digest('hex');
}

export function generateApiKey(): string {
  return 'dc_' + randomBytes(32).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
