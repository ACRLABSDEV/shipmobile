/**
 * Tests for EAS Build service — utility functions and service injection
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  estimateProgress,
  estimateTimeRemaining,
  phaseLabel,
  getEASService,
  setEASService,
  resetEASService,
  type EASService,
  type EASBuildInfo,
  type EASBuildRequest,
  type BuildPhase,
} from '../../src/services/eas.js';

afterEach(() => {
  resetEASService();
});

describe('estimateProgress', () => {
  it.each([
    ['queued', 0],
    ['provisioning', 10],
    ['installing_dependencies', 30],
    ['building', 55],
    ['uploading', 85],
    ['finished', 100],
    ['errored', 100],
    ['canceled', 100],
  ] as [BuildPhase, number][])('returns %d for %s', (phase, expected) => {
    expect(estimateProgress(phase)).toBe(expected);
  });
});

describe('estimateTimeRemaining', () => {
  it('returns null for queued', () => {
    expect(estimateTimeRemaining('queued', 5000)).toBeNull();
  });

  it('returns null for finished', () => {
    expect(estimateTimeRemaining('finished', 60000)).toBeNull();
  });

  it('returns positive number for in-progress phases', () => {
    const result = estimateTimeRemaining('building', 60000);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThanOrEqual(0);
  });
});

describe('phaseLabel', () => {
  it.each([
    ['queued', 'Queued'],
    ['building', 'Building'],
    ['finished', 'Complete'],
    ['errored', 'Error'],
  ] as [BuildPhase, string][])('returns "%s" for %s', (phase, label) => {
    expect(phaseLabel(phase)).toBe(label);
  });
});

describe('EAS Service injection', () => {
  it('returns default service', () => {
    const s = getEASService();
    expect(s).toBeDefined();
    expect(s.triggerBuild).toBeDefined();
  });

  it('allows replacement', async () => {
    const mockBuild: EASBuildInfo = {
      id: 'b1', platform: 'ios', status: 'finished', profile: 'production',
      createdAt: '', updatedAt: '',
    };
    const mock: EASService = {
      triggerBuild: vi.fn(async () => mockBuild),
      getBuildStatus: vi.fn(async () => mockBuild),
      getBuildLogs: vi.fn(async () => []),
      listBuilds: vi.fn(async () => []),
      cancelBuild: vi.fn(async () => {}),
    };

    setEASService(mock);
    const result = await getEASService().triggerBuild({} as EASBuildRequest);
    expect(result.id).toBe('b1');
  });

  it('resets to real service', () => {
    const mock: EASService = {
      triggerBuild: vi.fn(async () => ({} as EASBuildInfo)),
      getBuildStatus: vi.fn(async () => ({} as EASBuildInfo)),
      getBuildLogs: vi.fn(async () => []),
      listBuilds: vi.fn(async () => []),
      cancelBuild: vi.fn(async () => {}),
    };
    setEASService(mock);
    resetEASService();
    // After reset, should not be our mock
    expect(getEASService().triggerBuild).not.toBe(mock.triggerBuild);
  });
});
