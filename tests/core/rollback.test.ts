/**
 * Tests for shipmobile rollback command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '../../src/core/rollback.js';
import { setEASUpdateService, resetEASUpdateService, type EASUpdateService, type EASUpdateGroup } from '../../src/services/eas-update.js';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const makeGroup = (id: string, message?: string): EASUpdateGroup => ({
  id: `id-${id}`,
  group: `group-${id}`,
  message,
  runtimeVersion: '1.0.0',
  platform: 'all',
  createdAt: new Date().toISOString(),
  channel: 'production',
});

function createMockService(groups: EASUpdateGroup[] = [], overrides: Partial<EASUpdateService> = {}): EASUpdateService {
  return {
    publishUpdate: vi.fn(async () => ({
      id: 'new', group: 'new-group', runtimeVersion: '1.0.0', platforms: ['all'], channel: 'production', createdAt: new Date().toISOString(),
    })),
    listUpdateGroups: vi.fn(async () => groups),
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

describe('rollback', () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shipmobile-rollback-'));
    await mkdir(join(tmpDir, '.shipmobile'), { recursive: true });
  });

  afterEach(async () => {
    resetEASUpdateService();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should roll back to previous update group', async () => {
    const groups = [makeGroup('latest', 'Latest'), makeGroup('previous', 'Previous')];
    const mock = createMockService(groups);
    setEASUpdateService(mock);

    const result = await execute({ projectPath: tmpDir });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rolledBack).toBe(true);
      expect(result.data.update).toBeDefined();
    }
    expect(mock.rollbackToGroup).toHaveBeenCalledWith(tmpDir, 'group-previous', expect.anything());
  });

  it('should roll back to specific group ID', async () => {
    const groups = [makeGroup('latest'), makeGroup('mid'), makeGroup('old')];
    const mock = createMockService(groups);
    setEASUpdateService(mock);

    const result = await execute({ projectPath: tmpDir, group: 'group-old' });
    expect(result.ok).toBe(true);
    expect(mock.rollbackToGroup).toHaveBeenCalledWith(tmpDir, 'group-old', expect.anything());
  });

  it('should error when no updates exist', async () => {
    const mock = createMockService([]);
    setEASUpdateService(mock);

    const result = await execute({ projectPath: tmpDir });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NO_UPDATES');
    }
  });

  it('should error when only one update exists', async () => {
    const mock = createMockService([makeGroup('only')]);
    setEASUpdateService(mock);

    const result = await execute({ projectPath: tmpDir });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NO_PREVIOUS_UPDATE');
    }
  });

  it('should use specified channel', async () => {
    const groups = [makeGroup('a'), makeGroup('b')];
    const mock = createMockService(groups);
    setEASUpdateService(mock);

    await execute({ projectPath: tmpDir, channel: 'staging' });
    expect(mock.listUpdateGroups).toHaveBeenCalledWith(tmpDir, { channel: 'staging', limit: 10 });
    expect(mock.rollbackToGroup).toHaveBeenCalledWith(tmpDir, 'group-b', expect.objectContaining({ channel: 'staging' }));
  });

  it('should pass platform option', async () => {
    const groups = [makeGroup('a'), makeGroup('b')];
    const mock = createMockService(groups);
    setEASUpdateService(mock);

    await execute({ projectPath: tmpDir, platform: 'ios' });
    expect(mock.rollbackToGroup).toHaveBeenCalledWith(tmpDir, 'group-b', expect.objectContaining({ platform: 'ios' }));
  });

  it('should handle rollback failure', async () => {
    const groups = [makeGroup('a'), makeGroup('b')];
    const mock = createMockService(groups, {
      rollbackToGroup: vi.fn(async () => { throw new Error('EAS rollback failed'); }),
    });
    setEASUpdateService(mock);

    const result = await execute({ projectPath: tmpDir });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('ROLLBACK_FAILED');
    }
  });

  it('should include available groups in result', async () => {
    const groups = [makeGroup('a'), makeGroup('b'), makeGroup('c')];
    const mock = createMockService(groups);
    setEASUpdateService(mock);

    const result = await execute({ projectPath: tmpDir });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.availableGroups).toHaveLength(3);
    }
  });
});
