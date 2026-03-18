/**
 * Credential encryption — AES-256-GCM at rest
 *
 * NOTE: This is local-only convenience encryption. It prevents plain-text
 * credential storage on disk, which is the primary goal for v0.1. It is NOT
 * meant to protect against targeted attacks — the key is derived from
 * machine-local values that a determined attacker with local access could
 * recover.
 *
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { hostname } from 'node:os';

function deriveKey(): Buffer {
  // Optional stronger mode: user-provided passphrase (recommended for sensitive environments)
  const passphrase = process.env.SHIPMOBILE_PASSPHRASE?.trim();
  if (passphrase) {
    const salt = `shipmobile-passphrase-${hostname()}-${process.env.USER || 'default'}`;
    return scryptSync(passphrase, salt, 32);
  }

  // Default machine-scoped key derivation for local convenience
  const salt = `shipmobile-${hostname()}-${process.env.USER || 'default'}`;
  return scryptSync('shipmobile-local-encryption', salt, 32);
}

export function encrypt(data: string): string {
  const key = deriveKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(data: string): string {
  const key = deriveKey();
  const parts = data.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');
  const [ivHex, authTagHex, encrypted] = parts as [string, string, string];
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
