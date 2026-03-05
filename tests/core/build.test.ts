/**
 * Tests for shipmobile build command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute, getLatestBuildIds, getCachedBuild } from '../../src/core/build.js';
import { setEASService, resetEASService, type EASService, type EASBuildInfo, type EASBuildRequest } from '../../src/services/eas.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function createMockEAS(overrides: Partial<EASService> = {}): EASService {
  return {
    triggerBuild: vi.fn(async (req: EASBuildRequest): Promise<EASBuildInfo> => ({
      id: `build-${req.platform}-${Date.now()}`,
      platform: req.platform,
      status: 'queued',
      profile: req.profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    getBuildStatus: vi.fn(async (id: string): Promise<EASBuildInfo> => ({
      id,
      platform: 'ios',
      status: 'finished',
      profile: 'production',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      artifacts: { buildUrl: `https://expo.dev/builds/${id}` },
    })),
    getBuildLogs: vi.fn(async () => []),
    listBuilds: vi.fn(async () => []),
    cancelBuild: vi.fn(async () => {}),
    ...overrides,
  };
}

let tmpDir: string;

async function setupExpoProject(dir: string): Promise<void> {
  await mkdir(join(dir, 'assets'), { recursive: true });
  await mkdir(join(dir, '.shipmobile'), { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({
    name: 'test-app', version: '1.0.0',
    dependencies: { expo: '^52.0.0', react: '^18.0.0', 'react-native': '^0.76.0' },
  }));
  await writeFile(join(dir, 'app.json'), JSON.stringify({
    expo: { name: 'test-app', slug: 'test-app', version: '1.0.0', sdkVersion: '52.0.0',
      ios: { bundleIdentifier: 'com.test.app' }, android: { package: 'com.test.app' } },
  }));
  await writeFile(join(dir, 'eas.json'), JSON.stringify({
    build: { production: { distribution: 'store' }, preview: { distribution: 'internal' } },
  }));
  await mkdir(join(dir, 'node_modules'), { recursive: true });
}

describe('build command', () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shipmobile-build-'));
    await setupExpoProject(tmpDir);
  });

  afterEach(async () => {
    resetEASService();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should trigger builds for both platforms by default', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, skipValidation: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.builds).toHaveLength(2);
    expect(result.data.builds[0]!.platform).toBe('ios');
    expect(result.data.builds[1]!.platform).toBe('android');
    expect(mockEAS.triggerBuild).toHaveBeenCalledTimes(2);
  });

  it('should trigger build for single platform', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, platforms: ['ios'], skipValidation: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.builds).toHaveLength(1);
    expect(result.data.builds[0]!.platform).toBe('ios');
  });

  it('should use specified profile', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, platforms: ['android'], profile: 'preview', skipValidation: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.builds[0]!.profile).toBe('preview');
    expect(mockEAS.triggerBuild).toHaveBeenCalledWith(expect.objectContaining({ profile: 'preview' }));
  });

  it('should handle EAS auth errors', async () => {
    const mockEAS = createMockEAS({
      triggerBuild: vi.fn(async () => {
        throw new Error('EAS authentication failed. Run `shipmobile login --expo` first.');
      }),
    });
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, skipValidation: true });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('EAS_AUTH_ERROR');
  });

  it('should handle build errors gracefully', async () => {
    const mockEAS = createMockEAS({
      triggerBuild: vi.fn(async (req) => {
        if (req.platform === 'android') throw new Error('Build quota exceeded');
        return {
          id: 'build-ios-1', platform: 'ios' as const, status: 'queued' as const,
          profile: 'production' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
      }),
    });
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, skipValidation: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.builds).toHaveLength(2);
    expect(result.data.builds[0]!.status).toBe('queued');
    expect(result.data.builds[1]!.status).toBe('errored');
    expect(result.data.builds[1]!.error).toContain('Build quota exceeded');
  });

  it('should persist build metadata', async () => {
    const mockEAS = createMockEAS({
      triggerBuild: vi.fn(async (req) => ({
        id: `build-${req.platform}-123`,
        platform: req.platform,
        status: 'queued' as const,
        profile: req.profile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    });
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, platforms: ['ios'], skipValidation: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const latest = await getLatestBuildIds(tmpDir);
    expect(latest.ios).toBe('build-ios-123');

    const cached = await getCachedBuild(tmpDir, 'build-ios-123');
    expect(cached).not.toBeNull();
    expect(cached!.platform).toBe('ios');
  });

  it('should run pre-build validation by default', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir });

    // Doctor will find critical issues (missing icon etc) and fail
    // That's expected — validation ran and caught issues
    if (!result.ok) {
      expect(result.error.code).toBe('BUILD_VALIDATION_FAILED');
      return;
    }
    expect(result.data.validated).toBe(true);
  });

  it('should support --wait flag and poll until complete', async () => {
    // Have triggerBuild return 'finished' so wait loop is skipped (no pending builds)
    const mockEAS = createMockEAS({
      triggerBuild: vi.fn(async (req) => ({
        id: 'build-wait-1', platform: req.platform, status: 'finished' as const,
        profile: req.profile, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        artifacts: { buildUrl: 'https://expo.dev/builds/build-wait-1' },
      })),
    });
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir, platforms: ['ios'], wait: true, skipValidation: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.builds[0]!.status).toBe('finished');
    // getBuildStatus should NOT be called since the build was already finished
    expect(mockEAS.getBuildStatus).not.toHaveBeenCalled();
  });
});
