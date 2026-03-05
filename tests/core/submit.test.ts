/**
 * Tests for shipmobile submit command
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execute, runPreflight } from '../../src/core/submit.js';
import { setAppStoreService, resetAppStoreService, type AppStoreService, type AppStoreSubmission } from '../../src/services/appstore.js';
import { setPlayStoreService, resetPlayStoreService, type PlayStoreService, type PlayStoreSubmission } from '../../src/services/playstore.js';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vi } from 'vitest';

function createMockAppStore(overrides: Partial<AppStoreService> = {}): AppStoreService {
  const submission: AppStoreSubmission = {
    id: 'sub-ios-123',
    appId: 'com.test.app',
    version: '1.0.0',
    status: 'waiting_for_review',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewUrl: 'https://appstoreconnect.apple.com/review/123',
  };
  return {
    uploadBuild: vi.fn(async () => submission),
    setMetadata: vi.fn(async () => {}),
    submitForReview: vi.fn(async () => submission),
    getSubmissionStatus: vi.fn(async () => submission),
    ...overrides,
  };
}

function createMockPlayStore(overrides: Partial<PlayStoreService> = {}): PlayStoreService {
  const submission: PlayStoreSubmission = {
    editId: 'edit-123',
    packageName: 'com.test.app',
    track: 'production',
    status: 'completed',
    versionCode: 1,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return {
    uploadBundle: vi.fn(async () => submission),
    setListing: vi.fn(async () => {}),
    submitToTrack: vi.fn(async () => submission),
    getSubmissionStatus: vi.fn(async () => submission),
    ...overrides,
  };
}

let tmpDir: string;

async function setupProject(dir: string, options: {
  builds?: boolean;
  metadata?: boolean;
  credentials?: boolean;
  icon?: boolean;
  buildStatus?: string;
} = {}) {
  const shipDir = join(dir, '.shipmobile');
  await mkdir(shipDir, { recursive: true });

  // Config
  await writeFile(join(shipDir, 'config.json'), JSON.stringify({
    projectName: 'test-app',
    bundleId: 'com.test.app',
    version: '1.0.0',
    platforms: ['ios', 'android'],
    google: { packageName: 'com.test.app' },
  }));

  if (options.builds !== false) {
    const buildCacheDir = join(shipDir, 'build-cache');
    await mkdir(buildCacheDir, { recursive: true });
    await writeFile(join(buildCacheDir, 'latest.json'), JSON.stringify({
      ios: 'build-ios-1',
      android: 'build-android-1',
    }));
    const status = options.buildStatus ?? 'finished';
    await writeFile(join(buildCacheDir, 'build-ios-1.json'), JSON.stringify({
      id: 'build-ios-1', platform: 'ios', status,
      artifacts: { applicationArchiveUrl: '/path/to/app.ipa' },
    }));
    await writeFile(join(buildCacheDir, 'build-android-1.json'), JSON.stringify({
      id: 'build-android-1', platform: 'android', status,
      artifacts: { applicationArchiveUrl: '/path/to/app.aab' },
    }));
  }

  if (options.metadata !== false) {
    await writeFile(join(shipDir, 'metadata.json'), JSON.stringify({
      appName: { value: 'Test App' },
      description: { value: 'A test application' },
      keywords: { value: ['test', 'app'] },
      category: { value: 'Utilities' },
    }));
  }

  if (options.credentials !== false) {
    await writeFile(join(shipDir, 'credentials.json'), JSON.stringify({
      apple: { validated: true, apiKeyId: 'key-123' },
      google: { validated: true, serviceAccountPath: '/path/to/sa.json' },
    }));
  }

  if (options.icon !== false) {
    await mkdir(join(dir, 'assets'), { recursive: true });
    // Create a minimal PNG (1x1 pixel)
    await writeFile(join(dir, 'assets', 'icon.png'), Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    ));
  }
}

describe('submit', () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shipmobile-submit-'));
  });

  afterEach(async () => {
    resetAppStoreService();
    resetPlayStoreService();
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('preflight checks', () => {
    it('should pass all preflight checks with valid project', async () => {
      await setupProject(tmpDir);
      const checks = await runPreflight(tmpDir);
      const failed = checks.filter(c => !c.passed);
      expect(failed).toHaveLength(0);
    });

    it('should fail when no build cache exists', async () => {
      await setupProject(tmpDir, { builds: false });
      const checks = await runPreflight(tmpDir);
      const failed = checks.filter(c => !c.passed && c.name === 'build-cache');
      expect(failed.length).toBeGreaterThan(0);
    });

    it('should fail when build is not finished', async () => {
      await setupProject(tmpDir, { buildStatus: 'errored' });
      const checks = await runPreflight(tmpDir);
      const failed = checks.filter(c => !c.passed && c.name.startsWith('build-successful'));
      expect(failed.length).toBeGreaterThan(0);
    });

    it('should fail when metadata is missing', async () => {
      await setupProject(tmpDir, { metadata: false });
      const checks = await runPreflight(tmpDir);
      const failed = checks.filter(c => !c.passed && c.name.startsWith('metadata'));
      expect(failed.length).toBeGreaterThan(0);
    });

    it('should fail when credentials are missing', async () => {
      await setupProject(tmpDir, { credentials: false });
      const checks = await runPreflight(tmpDir);
      const failed = checks.filter(c => !c.passed && c.name.startsWith('credentials'));
      expect(failed.length).toBeGreaterThan(0);
    });

    it('should warn when icon is missing', async () => {
      await setupProject(tmpDir, { icon: false });
      const checks = await runPreflight(tmpDir);
      const iconCheck = checks.find(c => c.name === 'assets-icon');
      expect(iconCheck?.passed).toBe(false);
      expect(iconCheck?.severity).toBe('warning');
    });
  });

  describe('execute', () => {
    it('should fail execute when preflight fails', async () => {
      await setupProject(tmpDir, { builds: false });
      const result = await execute({ projectPath: tmpDir });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PREFLIGHT_FAILED');
      }
    });

    it('should submit to both stores successfully', async () => {
      await setupProject(tmpDir);
      const mockAppStore = createMockAppStore();
      const mockPlayStore = createMockPlayStore();
      setAppStoreService(mockAppStore);
      setPlayStoreService(mockPlayStore);

      const result = await execute({ projectPath: tmpDir });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.ios?.status).toBe('waiting_for_review');
        expect(result.data.android?.status).toBe('completed');
        expect(mockAppStore.uploadBuild).toHaveBeenCalled();
        expect(mockPlayStore.uploadBundle).toHaveBeenCalled();
      }
    });

    it('should submit iOS only when platform is ios', async () => {
      await setupProject(tmpDir);
      const mockAppStore = createMockAppStore();
      const mockPlayStore = createMockPlayStore();
      setAppStoreService(mockAppStore);
      setPlayStoreService(mockPlayStore);

      const result = await execute({ projectPath: tmpDir, platform: 'ios' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.ios).toBeDefined();
        expect(result.data.android).toBeUndefined();
        expect(mockPlayStore.uploadBundle).not.toHaveBeenCalled();
      }
    });

    it('should submit Android only when platform is android', async () => {
      await setupProject(tmpDir);
      const mockAppStore = createMockAppStore();
      const mockPlayStore = createMockPlayStore();
      setAppStoreService(mockAppStore);
      setPlayStoreService(mockPlayStore);

      const result = await execute({ projectPath: tmpDir, platform: 'android' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.android).toBeDefined();
        expect(result.data.ios).toBeUndefined();
        expect(mockAppStore.uploadBuild).not.toHaveBeenCalled();
      }
    });

    it('should skip preflight when skipPreflight is true', async () => {
      await setupProject(tmpDir, { builds: false, metadata: false, credentials: false });
      const mockAppStore = createMockAppStore();
      const mockPlayStore = createMockPlayStore();
      setAppStoreService(mockAppStore);
      setPlayStoreService(mockPlayStore);

      const result = await execute({ projectPath: tmpDir, skipPreflight: true });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.preflight).toHaveLength(0);
      }
    });

    it('should handle App Store submission failure', async () => {
      await setupProject(tmpDir);
      const mockAppStore = createMockAppStore({
        uploadBuild: vi.fn(async () => { throw new Error('Network timeout'); }),
      });
      setAppStoreService(mockAppStore);

      const result = await execute({ projectPath: tmpDir, platform: 'ios' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('APPSTORE_SUBMIT_FAILED');
        expect(result.error.message).toContain('Network timeout');
      }
    });

    it('should handle Play Store submission failure', async () => {
      await setupProject(tmpDir);
      const mockPlayStore = createMockPlayStore({
        uploadBundle: vi.fn(async () => { throw new Error('Invalid credentials'); }),
      });
      setPlayStoreService(mockPlayStore);

      const result = await execute({ projectPath: tmpDir, platform: 'android' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('PLAYSTORE_SUBMIT_FAILED');
        expect(result.error.message).toContain('Invalid credentials');
      }
    });
  });
});
