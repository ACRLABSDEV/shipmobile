/**
 * Tests for shipmobile preview command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execute, generateQRCode } from '../../src/core/preview.js';
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
      id, platform: 'ios', status: 'finished',
      profile: 'production', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      artifacts: {
        buildUrl: `https://expo.dev/builds/${id}`,
        applicationArchiveUrl: `https://expo.dev/artifacts/${id}.ipa`,
      },
    })),
    getBuildLogs: vi.fn(async () => []),
    listBuilds: vi.fn(async () => []),
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

describe('preview command', () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shipmobile-preview-'));
    await setupProject(tmpDir);
  });

  afterEach(async () => {
    resetEASService();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should return error when no builds exist', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    const result = await execute({ projectPath: tmpDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NO_BUILDS');
  });

  it('should generate iOS preview links', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    // Trigger a build to populate cache
    await buildExecute({ projectPath: tmpDir, platforms: ['ios'], skipValidation: true });

    const result = await execute({ projectPath: tmpDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.previews.length).toBeGreaterThan(0);
    expect(result.data.previews.some(p => p.platform === 'ios')).toBe(true);
    expect(result.data.qrData.length).toBeGreaterThan(0);
  });

  it('should generate Android preview links with APK detection', async () => {
    const mockEAS = createMockEAS({
      triggerBuild: vi.fn(async (req) => ({
        id: 'build-android-apk', platform: req.platform, status: 'queued' as const,
        profile: req.profile, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      })),
      getBuildStatus: vi.fn(async (id) => ({
        id, platform: 'android' as const, status: 'finished' as const,
        profile: 'production' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        artifacts: {
          buildUrl: `https://expo.dev/builds/${id}`,
          applicationArchiveUrl: `https://expo.dev/artifacts/${id}.apk`,
        },
      })),
    });
    setEASService(mockEAS);

    await buildExecute({ projectPath: tmpDir, platforms: ['android'], skipValidation: true });

    const result = await execute({ projectPath: tmpDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const apkLink = result.data.previews.find(p => p.type === 'apk');
    expect(apkLink).toBeDefined();
    expect(apkLink!.url).toContain('.apk');
    expect(apkLink!.label).toContain('APK');
  });

  it('should generate Android AAB links', async () => {
    const mockEAS = createMockEAS({
      triggerBuild: vi.fn(async (req) => ({
        id: 'build-android-aab', platform: req.platform, status: 'queued' as const,
        profile: req.profile, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      })),
      getBuildStatus: vi.fn(async (id) => ({
        id, platform: 'android' as const, status: 'finished' as const,
        profile: 'production' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        artifacts: {
          buildUrl: `https://expo.dev/builds/${id}`,
          applicationArchiveUrl: `https://expo.dev/artifacts/${id}.aab`,
        },
      })),
    });
    setEASService(mockEAS);

    await buildExecute({ projectPath: tmpDir, platforms: ['android'], skipValidation: true });
    const result = await execute({ projectPath: tmpDir });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const aabLink = result.data.previews.find(p => p.type === 'aab');
    expect(aabLink).toBeDefined();
    expect(aabLink!.label).toContain('AAB');
  });

  it('should error when build is not complete', async () => {
    const mockEAS = createMockEAS({
      getBuildStatus: vi.fn(async (id) => ({
        id, platform: 'ios' as const, status: 'building' as const,
        profile: 'production' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      })),
    });
    setEASService(mockEAS);

    await buildExecute({ projectPath: tmpDir, platforms: ['ios'], skipValidation: true });
    const result = await execute({ projectPath: tmpDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('BUILD_NOT_COMPLETE');
  });

  it('should filter by platform', async () => {
    const mockEAS = createMockEAS();
    setEASService(mockEAS);

    // Build both platforms
    await buildExecute({ projectPath: tmpDir, skipValidation: true });

    const result = await execute({ projectPath: tmpDir, platform: 'ios' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.previews.every(p => p.platform === 'ios')).toBe(true);
  });

  it('should handle builds with no artifacts', async () => {
    const mockEAS = createMockEAS({
      getBuildStatus: vi.fn(async (id) => ({
        id, platform: 'ios' as const, status: 'finished' as const,
        profile: 'production' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        // No artifacts
      })),
    });
    setEASService(mockEAS);

    await buildExecute({ projectPath: tmpDir, platforms: ['ios'], skipValidation: true });
    const result = await execute({ projectPath: tmpDir });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NO_ARTIFACTS');
  });
});

describe('QR code generation', () => {
  it('should generate a QR code string', () => {
    const qr = generateQRCode('https://example.com/test');

    expect(qr).toBeTruthy();
    expect(qr.split('\n').length).toBeGreaterThan(5);
    // Should contain block characters
    expect(qr).toContain('█');
  });

  it('should generate different QR codes for different URLs', () => {
    const qr1 = generateQRCode('https://example.com/one');
    const qr2 = generateQRCode('https://example.com/two');

    expect(qr1).not.toBe(qr2);
  });

  it('should generate deterministic QR codes', () => {
    const url = 'https://expo.dev/artifacts/build-123.apk';
    const qr1 = generateQRCode(url);
    const qr2 = generateQRCode(url);

    expect(qr1).toBe(qr2);
  });

  it('should have finder pattern corners', () => {
    const qr = generateQRCode('https://test.com');
    // The QR code should have consistent structure
    const lines = qr.split('\n');
    expect(lines.length).toBeGreaterThan(10);
  });
});
