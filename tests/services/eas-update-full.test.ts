/**
 * Tests for EAS Update service — service injection
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getEASUpdateService,
  setEASUpdateService,
  resetEASUpdateService,
  type EASUpdateService,
  type EASUpdatePublishResult,
} from '../../src/services/eas-update.js';

afterEach(() => {
  resetEASUpdateService();
});

describe('EAS Update Service injection', () => {
  it('returns default service', () => {
    const s = getEASUpdateService();
    expect(s).toBeDefined();
    expect(s.publishUpdate).toBeDefined();
    expect(s.listUpdateGroups).toBeDefined();
    expect(s.listChannels).toBeDefined();
    expect(s.rollbackToGroup).toBeDefined();
  });

  it('allows replacement and calls mock', async () => {
    const mockResult: EASUpdatePublishResult = {
      id: 'u1', group: 'g1', runtimeVersion: '1.0.0',
      platforms: ['all'], channel: 'production', createdAt: '',
    };
    const mock: EASUpdateService = {
      publishUpdate: vi.fn(async () => mockResult),
      listUpdateGroups: vi.fn(async () => []),
      listChannels: vi.fn(async () => []),
      rollbackToGroup: vi.fn(async () => mockResult),
    };

    setEASUpdateService(mock);
    const result = await getEASUpdateService().publishUpdate({
      projectDir: '/app',
      channel: 'staging',
    });
    expect(result.id).toBe('u1');
    expect(mock.publishUpdate).toHaveBeenCalled();
  });

  it('resets to real service', () => {
    const mock: EASUpdateService = {
      publishUpdate: vi.fn(async () => ({} as EASUpdatePublishResult)),
      listUpdateGroups: vi.fn(async () => []),
      listChannels: vi.fn(async () => []),
      rollbackToGroup: vi.fn(async () => ({} as EASUpdatePublishResult)),
    };
    setEASUpdateService(mock);
    resetEASUpdateService();
    expect(getEASUpdateService().publishUpdate).not.toBe(mock.publishUpdate);
  });
});
