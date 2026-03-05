/**
 * Tests for EAS Update service abstraction
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  getEASUpdateService,
  setEASUpdateService,
  resetEASUpdateService,
  RealEASUpdateService,
  type EASUpdateService,
} from '../../src/services/eas-update.js';

describe('eas-update service', () => {
  afterEach(() => {
    resetEASUpdateService();
  });

  it('should return the default RealEASUpdateService', () => {
    const service = getEASUpdateService();
    expect(service).toBeInstanceOf(RealEASUpdateService);
  });

  it('should allow setting a custom service', () => {
    const custom: EASUpdateService = {
      publishUpdate: async () => ({ id: 'test', group: 'g', runtimeVersion: '1', platforms: [], channel: 'prod', createdAt: '' }),
      listUpdateGroups: async () => [],
      listChannels: async () => [],
      rollbackToGroup: async () => ({ id: 'test', group: 'g', runtimeVersion: '1', platforms: [], channel: 'prod', createdAt: '' }),
    };
    setEASUpdateService(custom);
    expect(getEASUpdateService()).toBe(custom);
  });

  it('should reset to default service', () => {
    const custom: EASUpdateService = {
      publishUpdate: async () => ({ id: 'test', group: 'g', runtimeVersion: '1', platforms: [], channel: 'prod', createdAt: '' }),
      listUpdateGroups: async () => [],
      listChannels: async () => [],
      rollbackToGroup: async () => ({ id: 'test', group: 'g', runtimeVersion: '1', platforms: [], channel: 'prod', createdAt: '' }),
    };
    setEASUpdateService(custom);
    expect(getEASUpdateService()).toBe(custom);

    resetEASUpdateService();
    expect(getEASUpdateService()).toBeInstanceOf(RealEASUpdateService);
    expect(getEASUpdateService()).not.toBe(custom);
  });

  it('should have the correct interface methods', () => {
    const service = getEASUpdateService();
    expect(typeof service.publishUpdate).toBe('function');
    expect(typeof service.listUpdateGroups).toBe('function');
    expect(typeof service.listChannels).toBe('function');
    expect(typeof service.rollbackToGroup).toBe('function');
  });
});
