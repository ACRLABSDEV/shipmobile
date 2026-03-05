import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { getStatus } from '../../src/core/login.js';
import { writeCredentials } from '../../src/utils/config.js';

describe('login', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'shipmobile-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('getStatus', () => {
    it('returns all disconnected when no credentials', async () => {
      const result = await getStatus(tempDir);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.authenticated.expo).toBe(false);
      expect(result.data.authenticated.apple).toBe(false);
      expect(result.data.authenticated.google).toBe(false);
      expect(result.data.issues.length).toBeGreaterThan(0);
    });

    it('shows expo as connected when credentials exist', async () => {
      await writeCredentials({
        expo: {
          token: 'test-token',
          username: 'testuser',
          plan: 'free',
          validated: true,
          validatedAt: new Date().toISOString(),
        },
      }, tempDir);

      const result = await getStatus(tempDir);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.authenticated.expo).toBe(true);
      expect(result.data.details.expo?.username).toBe('testuser');
    });

    it('returns MCP-compatible structure', async () => {
      const result = await getStatus(tempDir);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data).toHaveProperty('authenticated');
      expect(result.data).toHaveProperty('details');
      expect(result.data).toHaveProperty('issues');
      expect(result.data.authenticated).toHaveProperty('apple');
      expect(result.data.authenticated).toHaveProperty('expo');
      expect(result.data.authenticated).toHaveProperty('google');
    });
  });
});
