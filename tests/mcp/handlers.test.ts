/**
 * Tests for MCP handlers — all handler functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all core modules
vi.mock('../../src/core/login.js', () => ({
  getStatus: vi.fn(),
  loginExpo: vi.fn(),
  loginApple: vi.fn(),
  loginGoogle: vi.fn(),
}));

vi.mock('../../src/core/init.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/doctor.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/audit/index.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/assets.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/prepare.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/build.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/status.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/preview.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/submit.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/reset.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/update.js', () => ({
  execute: vi.fn(),
}));

vi.mock('../../src/core/rollback.js', () => ({
  execute: vi.fn(),
}));

import {
  handleLogin,
  handleInit,
  handleDoctor,
  handleAudit,
  handleAssets,
  handlePrepare,
  handleBuild,
  handleStatus,
  handlePreview,
  handleSubmit,
  handleReset,
  handleUpdate,
  handleRollback,
} from '../../src/mcp/handlers.js';

import * as login from '../../src/core/login.js';
import * as init from '../../src/core/init.js';
import * as doctor from '../../src/core/doctor.js';
import * as audit from '../../src/core/audit/index.js';
import * as assets from '../../src/core/assets.js';
import * as prepare from '../../src/core/prepare.js';
import * as build from '../../src/core/build.js';
import * as status from '../../src/core/status.js';
import * as preview from '../../src/core/preview.js';
import * as submit from '../../src/core/submit.js';
import * as reset from '../../src/core/reset.js';
import * as update from '../../src/core/update.js';
import * as rollback from '../../src/core/rollback.js';

function okResult(data: unknown) {
  return { ok: true as const, data };
}

function errResult(message: string) {
  return { ok: false as const, error: { code: 'TEST_ERR', message, severity: 'critical' as const } };
}

describe('MCP Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- handleLogin ---
  describe('handleLogin', () => {
    it('returns status when status=true', async () => {
      vi.mocked(login.getStatus).mockResolvedValue(okResult({
        authenticated: { apple: false, expo: true, google: false },
        details: { expo: { username: 'test' } },
        issues: [],
      }));

      const result = await handleLogin({ provider: 'expo', status: true });
      expect(result.content[0].type).toBe('text');
      const data = JSON.parse(result.content[0].text);
      expect(data.authenticated.expo).toBe(true);
      expect(login.getStatus).toHaveBeenCalled();
    });

    it('returns error when status fails', async () => {
      vi.mocked(login.getStatus).mockResolvedValue(errResult('No creds'));

      const result = await handleLogin({ provider: 'expo', status: true });
      expect((result as { isError?: boolean }).isError).toBe(true);
    });

    it('handles expo login', async () => {
      vi.mocked(login.loginExpo).mockResolvedValue(okResult({
        authenticated: { apple: false, expo: true, google: false },
        details: { expo: { username: 'user1' } },
        issues: [],
      }));

      const result = await handleLogin({ provider: 'expo', expo_token: 'tok123' });
      const data = JSON.parse(result.content[0].text);
      expect(data.authenticated.expo).toBe(true);
      expect(login.loginExpo).toHaveBeenCalledWith({ token: 'tok123' }, undefined);
    });

    it('returns error when expo_token missing', async () => {
      const result = await handleLogin({ provider: 'expo' });
      expect((result as { isError?: boolean }).isError).toBe(true);
      expect(result.content[0].text).toContain('expo_token is required');
    });

    it('handles apple login', async () => {
      vi.mocked(login.loginApple).mockResolvedValue(okResult({
        authenticated: { apple: true, expo: false, google: false },
        details: { apple: { teamName: 'Team' } },
        issues: [],
      }));

      const result = await handleLogin({
        provider: 'apple',
        apple_key_id: 'K1',
        apple_issuer_id: 'I1',
        apple_key_path: '/key.p8',
      });
      const data = JSON.parse(result.content[0].text);
      expect(data.authenticated.apple).toBe(true);
    });

    it('returns error when apple fields missing', async () => {
      const result = await handleLogin({ provider: 'apple' });
      expect((result as { isError?: boolean }).isError).toBe(true);
      expect(result.content[0].text).toContain('apple_key_id');
    });

    it('handles google login', async () => {
      vi.mocked(login.loginGoogle).mockResolvedValue(okResult({
        authenticated: { apple: false, expo: false, google: true },
        details: { google: { projectId: 'proj', clientEmail: 'e@g.com' } },
        issues: [],
      }));

      const result = await handleLogin({ provider: 'google', google_service_account: '/sa.json' });
      const data = JSON.parse(result.content[0].text);
      expect(data.authenticated.google).toBe(true);
    });

    it('returns error when google_service_account missing', async () => {
      const result = await handleLogin({ provider: 'google' });
      expect((result as { isError?: boolean }).isError).toBe(true);
    });

    it('returns error on expo login failure', async () => {
      vi.mocked(login.loginExpo).mockResolvedValue(errResult('Bad token'));

      const result = await handleLogin({ provider: 'expo', expo_token: 'bad' });
      expect((result as { isError?: boolean }).isError).toBe(true);
    });

    it('returns error on apple login failure', async () => {
      vi.mocked(login.loginApple).mockResolvedValue(errResult('Bad key'));

      const result = await handleLogin({
        provider: 'apple',
        apple_key_id: 'K1',
        apple_issuer_id: 'I1',
        apple_key_path: '/key.p8',
      });
      expect((result as { isError?: boolean }).isError).toBe(true);
    });

    it('returns error on google login failure', async () => {
      vi.mocked(login.loginGoogle).mockResolvedValue(errResult('Bad sa'));

      const result = await handleLogin({ provider: 'google', google_service_account: '/sa.json' });
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handleInit ---
  describe('handleInit', () => {
    it('calls init.execute and returns JSON', async () => {
      vi.mocked(init.execute).mockResolvedValue(okResult({ initialized: true }));

      const result = await handleInit({ project_path: '/app' });
      const data = JSON.parse(result.content[0].text);
      expect(data.initialized).toBe(true);
      expect(init.execute).toHaveBeenCalledWith({
        projectPath: '/app',
        bundleId: undefined,
        platforms: undefined,
      });
    });

    it('returns error on failure', async () => {
      vi.mocked(init.execute).mockResolvedValue(errResult('Not a project'));

      const result = await handleInit({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handleDoctor ---
  describe('handleDoctor', () => {
    it('calls doctor.execute with fix option', async () => {
      vi.mocked(doctor.execute).mockResolvedValue(okResult({ healthy: true, checks: [] }));

      const result = await handleDoctor({ fix: true });
      expect(doctor.execute).toHaveBeenCalledWith({ projectPath: undefined, fix: true });
      const data = JSON.parse(result.content[0].text);
      expect(data.healthy).toBe(true);
    });

    it('returns error on failure', async () => {
      vi.mocked(doctor.execute).mockResolvedValue(errResult('Broken'));

      const result = await handleDoctor({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handleAudit ---
  describe('handleAudit', () => {
    it('passes all options through', async () => {
      vi.mocked(audit.execute).mockResolvedValue(okResult({ score: 95 }));

      await handleAudit({ project_path: '/app', category: 'memory', fix: true, diff: true });
      expect(audit.execute).toHaveBeenCalledWith({
        projectPath: '/app',
        category: 'memory',
        fix: true,
        diff: true,
      });
    });

    it('returns error on failure', async () => {
      vi.mocked(audit.execute).mockResolvedValue(errResult('Parse error'));

      const result = await handleAudit({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handleAssets ---
  describe('handleAssets', () => {
    it('maps all path args', async () => {
      vi.mocked(assets.execute).mockResolvedValue(okResult({ processed: true }));

      await handleAssets({
        project_path: '/app',
        icon_path: '/icon.png',
        splash_path: '/splash.png',
        screenshots_dir: '/ss',
        foreground_path: '/fg.png',
        background_path: '/bg.png',
      });
      expect(assets.execute).toHaveBeenCalledWith({
        projectPath: '/app',
        iconPath: '/icon.png',
        splashPath: '/splash.png',
        screenshotsDir: '/ss',
        foregroundPath: '/fg.png',
        backgroundPath: '/bg.png',
      });
    });

    it('returns error on failure', async () => {
      vi.mocked(assets.execute).mockResolvedValue(errResult('No icon'));

      const result = await handleAssets({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handlePrepare ---
  describe('handlePrepare', () => {
    it('maps args correctly', async () => {
      vi.mocked(prepare.execute).mockResolvedValue(okResult({ metadata: {} }));

      await handlePrepare({
        project_path: '/app',
        app_name: 'MyApp',
        description: 'desc',
        keywords: ['k1'],
        category: 'games',
      });
      expect(prepare.execute).toHaveBeenCalledWith({
        projectPath: '/app',
        appName: 'MyApp',
        description: 'desc',
        keywords: ['k1'],
        category: 'games',
      });
    });

    it('returns error on failure', async () => {
      vi.mocked(prepare.execute).mockResolvedValue(errResult('No metadata'));

      const result = await handlePrepare({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handleBuild ---
  describe('handleBuild', () => {
    it('maps build options', async () => {
      vi.mocked(build.execute).mockResolvedValue(okResult({ builds: [] }));

      await handleBuild({
        project_path: '/app',
        platforms: ['ios'],
        profile: 'preview',
        wait: true,
      });
      expect(build.execute).toHaveBeenCalledWith({
        projectPath: '/app',
        platforms: ['ios'],
        profile: 'preview',
        wait: true,
      });
    });

    it('returns error on failure', async () => {
      vi.mocked(build.execute).mockResolvedValue(errResult('Build failed'));

      const result = await handleBuild({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handleStatus ---
  describe('handleStatus', () => {
    it('maps status options', async () => {
      vi.mocked(status.execute).mockResolvedValue(okResult({ status: 'building' }));

      await handleStatus({
        build_id: 'b1',
        project_path: '/app',
        logs: true,
        history: true,
        platform: 'android',
      });
      expect(status.execute).toHaveBeenCalledWith({
        projectPath: '/app',
        buildId: 'b1',
        logs: true,
        history: true,
        platform: 'android',
      });
    });

    it('returns error on failure', async () => {
      vi.mocked(status.execute).mockResolvedValue(errResult('Not found'));

      const result = await handleStatus({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handlePreview ---
  describe('handlePreview', () => {
    it('maps preview options', async () => {
      vi.mocked(preview.execute).mockResolvedValue(okResult({ url: 'https://...' }));

      await handlePreview({ build_id: 'b1', project_path: '/app', platform: 'ios' });
      expect(preview.execute).toHaveBeenCalledWith({
        projectPath: '/app',
        buildId: 'b1',
        platform: 'ios',
      });
    });

    it('returns error on failure', async () => {
      vi.mocked(preview.execute).mockResolvedValue(errResult('No build'));

      const result = await handlePreview({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handleSubmit ---
  describe('handleSubmit', () => {
    it('maps submit options', async () => {
      vi.mocked(submit.execute).mockResolvedValue(okResult({ submitted: true }));

      await handleSubmit({
        project_path: '/app',
        platform: 'android',
        track: 'beta',
        skip_preflight: true,
      });
      expect(submit.execute).toHaveBeenCalledWith({
        projectPath: '/app',
        platform: 'android',
        track: 'beta',
        skipPreflight: true,
      });
    });

    it('returns error on failure', async () => {
      vi.mocked(submit.execute).mockResolvedValue(errResult('Submit failed'));

      const result = await handleSubmit({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });

  // --- handleReset ---
  describe('handleReset', () => {
    it('maps reset options', async () => {
      vi.mocked(reset.execute).mockResolvedValue(okResult({ reset: true }));

      await handleReset({ project_path: '/app', force: true });
      expect(reset.execute).toHaveBeenCalledWith({
        projectPath: '/app',
        force: true,
      });
    });

    it('returns error on failure', async () => {
      vi.mocked(reset.execute).mockResolvedValue(errResult('Reset failed'));

      const result = await handleReset({});
      expect((result as { isError?: boolean }).isError).toBe(true);
    });
  });
});
