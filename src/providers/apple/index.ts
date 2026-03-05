/**
 * Apple Developer Provider — App Store Connect API authentication
 */

import { readFile } from 'node:fs/promises';
import { sign } from 'jsonwebtoken';
import { ok, err, type Result } from '../../utils/result.js';

export interface AppleAccount {
  teamName: string;
  teamId?: string;
  validated: boolean;
}

export interface AppleKeyConfig {
  keyId: string;
  issuerId: string;
  keyPath: string;
}

/**
 * Generate a JWT for App Store Connect API
 */
export function generateJwt(privateKey: string, keyId: string, issuerId: string): string {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      iss: issuerId,
      iat: now,
      exp: now + 20 * 60, // 20 minutes
      aud: 'appstoreconnect-v1',
    },
    privateKey,
    {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: keyId,
        typ: 'JWT',
      },
    },
  );
}

/**
 * Validate Apple API key by making a test request to App Store Connect
 */
export async function validateKey(config: AppleKeyConfig): Promise<Result<AppleAccount>> {
  try {
    const privateKey = await readFile(config.keyPath, 'utf-8');

    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      return err(
        'APPLE_INVALID_KEY',
        'The .p8 file does not contain a valid private key.',
        'critical',
        'Download a new API key from https://appstoreconnect.apple.com/access/integrations/api',
      );
    }

    const jwt = generateJwt(privateKey, config.keyId, config.issuerId);

    const res = await fetch('https://api.appstoreconnect.apple.com/v1/apps?limit=1', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return err(
          'APPLE_AUTH_INVALID',
          'App Store Connect API key validation failed. Check your key ID and issuer ID.',
          'critical',
          'Verify at https://appstoreconnect.apple.com/access/integrations/api',
        );
      }
      return err('APPLE_API_ERROR', `App Store Connect API returned ${res.status}: ${res.statusText}`);
    }

    return ok({
      teamName: 'Apple Developer',
      validated: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ENOENT')) {
      return err(
        'APPLE_KEY_NOT_FOUND',
        `API key file not found: ${config.keyPath}`,
        'critical',
        'Check the file path and try again.',
      );
    }
    return err('APPLE_VALIDATION_ERROR', `Apple key validation failed: ${msg}`);
  }
}
