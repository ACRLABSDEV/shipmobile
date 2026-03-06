/**
 * Tests for Apple provider
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateKey } from '../../src/providers/apple/index.js';

// Mock fs and jose
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('jose', () => {
  const instance = {
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuer: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setAudience: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt'),
  };
  return {
    importPKCS8: vi.fn().mockResolvedValue('mock-key'),
    SignJWT: vi.fn().mockImplementation(() => instance),
  };
});

import { readFile } from 'node:fs/promises';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Apple Provider', () => {
  const config = {
    keyId: 'KEY123',
    issuerId: 'ISS456',
    keyPath: '/path/to/key.p8',
  };

  describe('validateKey', () => {
    it('returns success when API returns 200', async () => {
      vi.mocked(readFile).mockResolvedValue('-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      }) as unknown as typeof fetch;

      const result = await validateKey(config);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.teamName).toBe('Apple Developer');
      expect(result.data.validated).toBe(true);
    });

    it('returns error when key file missing', async () => {
      const err = new Error('ENOENT: no such file');
      vi.mocked(readFile).mockRejectedValue(err);

      const result = await validateKey(config);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('APPLE_KEY_NOT_FOUND');
    });

    it('returns error for invalid key format', async () => {
      vi.mocked(readFile).mockResolvedValue('not a valid key');

      const result = await validateKey(config);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('APPLE_INVALID_KEY');
    });

    it('returns error when jwt generation or API fails', async () => {
      vi.mocked(readFile).mockResolvedValue('-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----');
      // Even with mocked jose, the internal flow may throw — we just verify it returns an error result
      const result = await validateKey(config);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.message).toBeDefined();
    });
  });
});
