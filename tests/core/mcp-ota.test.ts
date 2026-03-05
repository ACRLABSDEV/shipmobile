/**
 * Tests for MCP handlers — update and rollback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleUpdate, handleRollback } from '../../src/mcp/handlers.js';
import { setEASUpdateService, resetEASUpdateService, type EASUpdateService, type EASUpdateRequest, type EASUpdatePublishResult } from '../../src/services/eas-update.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function createMockService(overrides: Partial<EASUpdateService> = {}): EASUpdateService {
  return {
    publishUpdate: vi.fn(async (req: EASUpdateRequest): Promise<EASUpdatePublishResult> => ({
      id: 'update-1',
      group: 'group-1',
      message: req.message,
      runtimeVersion: '1.0.0',
      platforms: [req.platform || 'all'],
      channel: req.channel || 'production',
      createdAt: new Date().toISOString(),
    })),
    listUpdateGroups: vi.fn(async () => [
      { id: 'id-a', group: 'group-a', runtimeVersion: '1.0.0', platform: 'all', createdAt: new Date().toISOString(), channel: 'production' },
      { id: 'id-b', group: 'group-b', runtimeVersion: '1.0.0', platform: 'all', createdAt: new Date().toISOString(), channel: 'production' },
    ]),
    listChannels: vi.fn(async () => []),
    rollbackToGroup: vi.fn(async (_dir, groupId) => ({
      id: 'rollback-1',
      group: groupId,
      runtimeVersion: '1.0.0',
      platforms: ['all'],
      channel: 'production',
      createdAt: new Date().toISOString(),
    })),
    ...overrides,
  };
}

let tmpDir: string;

describe('MCP OTA handlers', () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shipmobile-mcp-ota-'));
    await mkdir(join(tmpDir, '.shipmobile'), { recursive: true });
    await writeFile(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test-app', version: '1.0.0',
      dependencies: { expo: '^52.0.0', react: '^18.0.0', 'react-native': '^0.76.0' },
    }));
    await writeFile(join(tmpDir, 'app.json'), JSON.stringify({
      expo: { name: 'test-app', slug: 'test-app', version: '1.0.0' },
    }));
  });

  afterEach(async () => {
    resetEASUpdateService();
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('handleUpdate', () => {
    it('should return success JSON', async () => {
      const mock = createMockService();
      setEASUpdateService(mock);

      const result = await handleUpdate({ project_path: tmpDir });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.published).toBe(true);
      expect(data.channel).toBe('production');
    });

    it('should pass options through', async () => {
      const mock = createMockService();
      setEASUpdateService(mock);

      await handleUpdate({ project_path: tmpDir, channel: 'staging', message: 'Fix', platform: 'ios' });
      expect(mock.publishUpdate).toHaveBeenCalledWith(expect.objectContaining({
        channel: 'staging',
        message: 'Fix',
        platform: 'ios',
      }));
    });

    it('should return error on failure', async () => {
      const mock = createMockService({
        publishUpdate: vi.fn(async () => { throw new Error('Network error'); }),
      });
      setEASUpdateService(mock);

      const result = await handleUpdate({ project_path: tmpDir });
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  describe('handleRollback', () => {
    it('should return success JSON', async () => {
      const mock = createMockService();
      setEASUpdateService(mock);

      const result = await handleRollback({ project_path: tmpDir });
      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.rolledBack).toBe(true);
    });

    it('should pass channel and group', async () => {
      const mock = createMockService();
      setEASUpdateService(mock);

      await handleRollback({ project_path: tmpDir, channel: 'staging', group: 'group-b' });
      expect(mock.rollbackToGroup).toHaveBeenCalledWith(tmpDir, 'group-b', expect.objectContaining({ channel: 'staging' }));
    });

    it('should return error when no updates', async () => {
      const mock = createMockService({ listUpdateGroups: vi.fn(async () => []) });
      setEASUpdateService(mock);

      const result = await handleRollback({ project_path: tmpDir });
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });
});
