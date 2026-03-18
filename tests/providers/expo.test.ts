/**
 * Tests for Expo provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateToken, checkEasCli } from '../../src/providers/expo/index.js';

describe('Expo Provider', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('validateToken', () => {
    it('returns account info on success', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          username: 'testuser',
          email: 'test@example.com',
          accounts: [{ plan: 'production' }],
        }),
      }) as unknown as typeof fetch;

      const result = await validateToken('valid-token');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.username).toBe('testuser');
      expect(result.data.plan).toBe('production');
      expect(result.data.validated).toBe(true);
    });

    it('returns error on 401', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }) as unknown as typeof fetch;

      const result = await validateToken('bad-token');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('EXPO_AUTH_INVALID');
    });

    it('returns error on other HTTP errors', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }) as unknown as typeof fetch;

      const result = await validateToken('token');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('EXPO_AUTH_ERROR');
    });

    it('returns error on network failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

      const result = await validateToken('token');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('EXPO_NETWORK_ERROR');
    });

    it('supports nested data payload shape', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            username: 'nesteduser',
            email: 'nested@example.com',
            accounts: [{ plan: 'pro' }],
          },
        }),
      }) as unknown as typeof fetch;

      const result = await validateToken('token');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.username).toBe('nesteduser');
      expect(result.data.plan).toBe('pro');
    });

    it('handles missing username gracefully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }) as unknown as typeof fetch;

      const result = await validateToken('token');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.username).toBe('unknown');
      expect(result.data.plan).toBe('free');
    });
  });
});
