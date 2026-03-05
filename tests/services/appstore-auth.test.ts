/**
 * Tests for App Store Connect auth flow (JWT generation)
 * Uses real jose crypto but does NOT call Apple's API
 */

import { describe, it, expect } from 'vitest';
import { generateAppStoreJWT } from '../../src/services/appstore.js';
import { generateKeyPair, exportPKCS8, decodeJwt, decodeProtectedHeader } from 'jose';

describe('App Store Connect Auth', () => {
  it('should generate a valid JWT with correct claims', async () => {
    // Generate a test ES256 key pair
    const { privateKey } = await generateKeyPair('ES256', { extractable: true });
    const pkcs8 = await exportPKCS8(privateKey);

    const token = await generateAppStoreJWT({
      keyId: 'TEST_KEY_123',
      issuerId: 'test-issuer-id-456',
      privateKey: pkcs8,
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    // Verify header
    const header = decodeProtectedHeader(token);
    expect(header.alg).toBe('ES256');
    expect(header.kid).toBe('TEST_KEY_123');
    expect(header.typ).toBe('JWT');

    // Verify payload
    const payload = decodeJwt(token);
    expect(payload.iss).toBe('test-issuer-id-456');
    expect(payload.aud).toBe('appstoreconnect-v2');
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
    // exp should be ~20 minutes after iat
    expect((payload.exp as number) - (payload.iat as number)).toBe(20 * 60);
  });

  it('should reject invalid private key', async () => {
    await expect(
      generateAppStoreJWT({
        keyId: 'KEY',
        issuerId: 'ISS',
        privateKey: 'not-a-valid-key',
      }),
    ).rejects.toThrow();
  });
});
