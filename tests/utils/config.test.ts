import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readConfig, writeConfig, readCredentials, writeCredentials } from '../../src/utils/config.js';

describe('config', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'shipmobile-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('readConfig returns empty object for missing config', async () => {
    const result = await readConfig(tempDir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({});
  });

  it('writeConfig + readConfig round-trip', async () => {
    const config = {
      projectName: 'test-app',
      bundleId: 'com.test.app',
      version: '1.0.0',
      platforms: ['ios', 'android'] as string[],
      workflow: 'expo-managed' as const,
    };
    const writeResult = await writeConfig(config, tempDir);
    expect(writeResult.ok).toBe(true);

    const readResult = await readConfig(tempDir);
    expect(readResult.ok).toBe(true);
    if (!readResult.ok) return;
    expect(readResult.data).toEqual(config);
  });

  it('writeCredentials + readCredentials round-trip', async () => {
    const creds = {
      expo: {
        token: 'test-token-123',
        username: 'testuser',
        validated: true,
        validatedAt: '2026-01-01T00:00:00Z',
      },
    };
    const writeResult = await writeCredentials(creds, tempDir);
    expect(writeResult.ok).toBe(true);

    const readResult = await readCredentials(tempDir);
    expect(readResult.ok).toBe(true);
    if (!readResult.ok) return;
    expect(readResult.data).toEqual(creds);
  });

  it('credentials are encrypted on disk', async () => {
    const creds = {
      expo: {
        token: 'super-secret-token-xyz',
        username: 'myuser',
        validated: true,
      },
    };
    await writeCredentials(creds, tempDir);

    const raw = await readFile(join(tempDir, '.shipmobile', 'credentials.json'), 'utf-8');
    // Raw file should NOT contain plaintext token
    expect(raw).not.toContain('super-secret-token-xyz');
    expect(raw).not.toContain('myuser');
    // Should have encrypted field
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveProperty('encrypted');
    expect(parsed.encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
  });

  it('readCredentials returns empty object for missing file', async () => {
    const result = await readCredentials(tempDir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({});
  });
});
