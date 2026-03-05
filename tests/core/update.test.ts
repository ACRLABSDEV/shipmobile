/**
 * Tests for shipmobile update command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute, detectNativeChanges } from '../../src/core/update.js';
import { setEASUpdateService, resetEASUpdateService, type EASUpdateService, type EASUpdatePublishResult, type EASUpdateRequest } from '../../src/services/eas-update.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function createMockUpdateService(overrides: Partial<EASUpdateService> = {}): EASUpdateService {
  return {
    publishUpdate: vi.fn(async (req: EASUpdateRequest): Promise<EASUpdatePublishResult> => ({
      id: `update-${Date.now()}`,
      group: `group-${Date.now()}`,
      message: req.message,
      runtimeVersion: '1.0.0',
      platforms: [req.platform || 'all'],
      channel: req.channel || 'production',
      createdAt: new Date().toISOString(),
    })),
    listUpdateGroups: vi.fn(async () => []),
    listChannels: vi.fn(async () => []),
    rollbackToGroup: vi.fn(async () => ({
      id: 'rollback-1',
      group: 'group-old',
      runtimeVersion: '1.0.0',
      platforms: ['all'],
      channel: 'production',
      createdAt: new Date().toISOString(),
    })),
    ...overrides,
  };
}

let tmpDir: string;

async function setupProject(dir: string, opts?: { withNativeDir?: boolean; withPlugins?: boolean }): Promise<void> {
  await mkdir(join(dir, '.shipmobile'), { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({
    name: 'test-app', version: '1.0.0',
    dependencies: { expo: '^52.0.0', react: '^18.0.0', 'react-native': '^0.76.0' },
  }));

  const expoConfig: Record<string, unknown> = {
    name: 'test-app', slug: 'test-app', version: '1.0.0',
  };
  if (opts?.withPlugins) {
    expoConfig.plugins = ['expo-camera', 'expo-location'];
  }
  await writeFile(join(dir, 'app.json'), JSON.stringify({ expo: expoConfig }));

  if (opts?.withNativeDir) {
    await mkdir(join(dir, 'ios'), { recursive: true });
    await writeFile(join(dir, 'ios', 'Podfile'), '# Podfile');
  }
}

describe('update', () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shipmobile-update-'));
  });

  afterEach(async () => {
    resetEASUpdateService();
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('detectNativeChanges', () => {
    it('should detect native ios/ directory', async () => {
      await setupProject(tmpDir, { withNativeDir: true });
      const result = await detectNativeChanges(tmpDir);
      expect(result.hasNativeChanges).toBe(true);
      expect(result.changes.some(c => c.includes('ios/'))).toBe(true);
    });

    it('should detect config plugins', async () => {
      await setupProject(tmpDir, { withPlugins: true });
      const result = await detectNativeChanges(tmpDir);
      expect(result.hasNativeChanges).toBe(true);
      expect(result.changes.some(c => c.includes('plugins'))).toBe(true);
    });

    it('should report no native changes for JS-only project', async () => {
      await setupProject(tmpDir);
      const result = await detectNativeChanges(tmpDir);
      expect(result.hasNativeChanges).toBe(false);
      expect(result.changes).toHaveLength(0);
    });

    it('should detect new native modules', async () => {
      await setupProject(tmpDir);
      // Save a cached deps snapshot without the new module
      await writeFile(join(tmpDir, '.shipmobile', 'last-update-deps.json'), JSON.stringify({
        expo: '^52.0.0', react: '^18.0.0', 'react-native': '^0.76.0',
      }));
      // Now add a native module to package.json
      await writeFile(join(tmpDir, 'package.json'), JSON.stringify({
        name: 'test-app', version: '1.0.0',
        dependencies: { expo: '^52.0.0', react: '^18.0.0', 'react-native': '^0.76.0', 'react-native-maps': '^1.0.0' },
      }));

      const result = await detectNativeChanges(tmpDir);
      expect(result.hasNativeChanges).toBe(true);
      expect(result.changes.some(c => c.includes('react-native-maps'))).toBe(true);
    });
  });

  describe('execute', () => {
    it('should publish an update successfully', async () => {
      await setupProject(tmpDir);
      const mock = createMockUpdateService();
      setEASUpdateService(mock);

      const result = await execute({ projectPath: tmpDir });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.published).toBe(true);
        expect(result.data.update).toBeDefined();
        expect(result.data.channel).toBe('production');
      }
      expect(mock.publishUpdate).toHaveBeenCalled();
    });

    it('should use specified channel', async () => {
      await setupProject(tmpDir);
      const mock = createMockUpdateService();
      setEASUpdateService(mock);

      const result = await execute({ projectPath: tmpDir, channel: 'staging' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.channel).toBe('staging');
      }
      expect(mock.publishUpdate).toHaveBeenCalledWith(expect.objectContaining({ channel: 'staging' }));
    });

    it('should pass message and platform', async () => {
      await setupProject(tmpDir);
      const mock = createMockUpdateService();
      setEASUpdateService(mock);

      await execute({ projectPath: tmpDir, message: 'Bug fix', platform: 'ios' });
      expect(mock.publishUpdate).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Bug fix',
        platform: 'ios',
      }));
    });

    it('should include native change detection', async () => {
      await setupProject(tmpDir, { withPlugins: true });
      const mock = createMockUpdateService();
      setEASUpdateService(mock);

      const result = await execute({ projectPath: tmpDir });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.nativeCheck.hasNativeChanges).toBe(true);
      }
    });

    it('should handle auth errors', async () => {
      await setupProject(tmpDir);
      const mock = createMockUpdateService({
        publishUpdate: vi.fn(async () => { throw new Error('EAS authentication failed. Run `shipmobile login --expo` first.'); }),
      });
      setEASUpdateService(mock);

      const result = await execute({ projectPath: tmpDir });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('EAS_AUTH_ERROR');
      }
    });

    it('should handle generic errors', async () => {
      await setupProject(tmpDir);
      const mock = createMockUpdateService({
        publishUpdate: vi.fn(async () => { throw new Error('Network timeout'); }),
      });
      setEASUpdateService(mock);

      const result = await execute({ projectPath: tmpDir });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('UPDATE_FAILED');
      }
    });
  });
});
