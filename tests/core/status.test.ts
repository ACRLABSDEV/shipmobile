/**
 * Tests for shipmobile status command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute } from '../../src/core/status.js';
import { execute as buildExecute } from '../../src/core/build.js';
import { setEASService, resetEASService, type EASService, type EASBuildInfo } from '../../src/services/eas.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function createMockEAS(overrides: Partial<EASService> = {}): EASService {
  return {
    triggerBuild: vi.fn(async (req) => ({
      id: `build-${req.platform}-1`, platform: req.platform, status: 'queued' as const,
      profile: req.profile, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })),
    getBuildStatus: vi.fn(async (id): Promise<EASBuildInfo> => ({
      id, platform: 'ios', status: 'building',
      profile: 'production', createdAt: new Date(Date.now() - 120000).toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    getBuildLogs: vi.fn(async () => [
      { timestamp: new Date().toISOString(), message: 'Installing dependencies...', phase: 'install' },
      { timestamp: new Date().toISOString(), message: 'Building app...', phase: 'build' },
    ]),
    listBuilds: vi.fn(async (): Promise<EASBuildInfo[]> => [
      { id: 'hist-1', platform: 'ios', status: 'finished', profile: 'production',
        createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(), metrics: { buildDuration: 480 } },
      { id: 'hist-2', platform: 'android', status: 'finished', profile: 'production',
        createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(), metrics: { buildDuration: 300 } },
    ]),
    cancelBuild: vi.fn(async () => {}),
    ...overrides,
  };
}

let tmpDir: string;

async function setupProject(dir: string): Promise<void> {
  await mkdir(join(dir, '.shipmobile'), { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({
    name: 'test-app', version: '1.0.0',
    dependencies: { expo: '^52.0.0', react: '^18.0.0', 'react-native': '^0.76.0' },
  }));
  await writeFile(join(dir, 'app.json'), JSON.stringify({
    expo: { name: 'test-app', slug: 'test-app', version: '1.0.0', sdkVersion: '52.0.0',
      ios: { bundleIdentifier: 'com.test.app' }, android: { package: 'com.test.app' } },
  }));
  await writeFile(join(dir, 'eas.json'), JSON.stringify({ build: { production: {} } }));
  await mkdir(join(dir, 'node_modules'), { recursive: true });
}

describe('status command', () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shipmobile-status-'));
    await setupProject(tmpDir);
  });

  afterEach(async () => {
    resetEASService();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should return error when no builds exist', async () => {
    const mockEAS = createMockEAS({
      listBuilds: vi.fn(async () => []),
    });
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NO_BUILDS');
  });

  it('should fallback to EAS list when local cache is missing', async () => {
    const mockEAS = createMockEAS({
      listBuilds: vi.fn(async (): Promise<EASBuildInfo[]> => [
        {
          id: 'remote-latest-1',
          platform: 'ios',
          status: 'building',
          profile: 'production',
          createdAt: new Date(Date.now() - 120000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]),
      getBuildStatus: vi.fn(async (id): Promise<EASBuildInfo> => ({
        id,
        platform: 'ios',
        status: 'building',
        profile: 'production',
        createdAt: new Date(Date.now() - 120000).toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    });
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.builds[0]?.id).toBe('remote-latest-1');
  });

  it('should return build status for latest builds', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    // First trigger a build to populate the cache
    await buildExecute({ projectPath: tmpDir, platforms: ['ios'], skipValidation: true });

    const result = await execute({ projectPath: tmpDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.builds).toHaveLength(1);
    expect(result.data.builds[0]!.phase).toBe('building');
    expect(result.data.builds[0]!.progress).toBeGreaterThan(0);
  });

  it('should return status for specific build ID', async () => {
    const mockEAS = createMockEAS({
      getBuildStatus: vi.fn(async (id) => ({
        id, platform: 'android' as const, status: 'finished' as const,
        profile: 'production' as const, createdAt: new Date(Date.now() - 300000).toISOString(),
        updatedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
        artifacts: { buildUrl: 'https://expo.dev/builds/specific-1', applicationArchiveUrl: 'https://expo.dev/artifacts/app.apk' },
      })),
    });
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, buildId: 'specific-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.builds[0]!.id).toBe('specific-1');
    expect(result.data.builds[0]!.isComplete).toBe(true);
    expect(result.data.builds[0]!.artifacts?.applicationArchiveUrl).toContain('.apk');
  });

  it('should include logs when requested', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    // Trigger a build first
    await buildExecute({ projectPath: tmpDir, platforms: ['ios'], skipValidation: true });

    const result = await execute({ projectPath: tmpDir, logs: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.logs).toBeDefined();
    expect(result.data.logs!.length).toBeGreaterThan(0);
  });

  it('should return build history', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, history: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.history).toBeDefined();
    expect(result.data.history!.length).toBe(2);
    expect(result.data.history![0]!.id).toBe('hist-1');
    expect(result.data.history![0]!.duration).toBe(480);
  });

  it('should calculate progress correctly for different phases', async () => {
    const phases: Array<{ phase: string; minProgress: number }> = [
      { phase: 'queued', minProgress: 0 },
      { phase: 'provisioning', minProgress: 10 },
      { phase: 'installing_dependencies', minProgress: 30 },
      { phase: 'building', minProgress: 55 },
      { phase: 'uploading', minProgress: 85 },
      { phase: 'finished', minProgress: 100 },
    ];

    for (const { phase, minProgress } of phases) {
      const mockEAS = createMockEAS({
        getBuildStatus: vi.fn(async (id) => ({
          id, platform: 'ios' as const, status: phase as 'queued' | 'provisioning' | 'installing_dependencies' | 'building' | 'uploading' | 'finished' | 'errored' | 'canceled',
          profile: 'production' as const, createdAt: new Date(Date.now() - 60000).toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      });
      setEASService(mockEAS);

      const result = await execute({ projectPath: tmpDir, buildId: 'test-phase' });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.data.builds[0]!.progress).toBe(minProgress);
    }
  });

  it('should detect completed and errored builds', async () => {
    const mockEAS = createMockEAS({
      getBuildStatus: vi.fn(async (id) => ({
        id, platform: 'ios' as const, status: 'errored' as const,
        profile: 'production' as const, createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), error: 'Build failed: missing provisioning profile',
      })),
    });
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, buildId: 'errored-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.builds[0]!.isError).toBe(true);
    expect(result.data.builds[0]!.error).toContain('provisioning profile');
  });
});
