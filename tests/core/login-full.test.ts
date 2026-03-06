/**
 * Tests for login core — loginExpo, loginApple, loginGoogle, execute
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock providers
vi.mock('../../src/providers/expo/index.js', () => ({
  validateToken: vi.fn(),
}));
vi.mock('../../src/providers/apple/index.js', () => ({
  validateKey: vi.fn(),
}));
vi.mock('../../src/providers/google/index.js', () => ({
  validateServiceAccount: vi.fn(),
}));

import { loginExpo, loginApple, loginGoogle, execute } from '../../src/core/login.js';
import * as expo from '../../src/providers/expo/index.js';
import * as apple from '../../src/providers/apple/index.js';
import * as google from '../../src/providers/google/index.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'shipmobile-login-'));
  vi.clearAllMocks();
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('loginExpo', () => {
  it('validates token and stores credentials', async () => {
    vi.mocked(expo.validateToken).mockResolvedValue({
      ok: true as const,
      data: { username: 'user1', email: 'u@e.com', plan: 'free', validated: true },
    });

    const result = await loginExpo({ token: 'tok' }, tmpDir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.authenticated.expo).toBe(true);
    expect(result.data.details.expo?.username).toBe('user1');
  });

  it('returns error when token invalid', async () => {
    vi.mocked(expo.validateToken).mockResolvedValue({
      ok: false as const,
      error: { code: 'EXPO_AUTH_INVALID', message: 'Bad token', severity: 'critical' as const },
    });

    const result = await loginExpo({ token: 'bad' }, tmpDir);
    expect(result.ok).toBe(false);
  });
});

describe('loginApple', () => {
  it('validates key and stores credentials', async () => {
    vi.mocked(apple.validateKey).mockResolvedValue({
      ok: true as const,
      data: { teamName: 'MyTeam', validated: true },
    });

    const result = await loginApple({ keyId: 'K', issuerId: 'I', keyPath: '/k.p8' }, tmpDir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.authenticated.apple).toBe(true);
    expect(result.data.details.apple?.teamName).toBe('MyTeam');
  });

  it('returns error when key invalid', async () => {
    vi.mocked(apple.validateKey).mockResolvedValue({
      ok: false as const,
      error: { code: 'APPLE_AUTH_INVALID', message: 'Bad key', severity: 'critical' as const },
    });

    const result = await loginApple({ keyId: 'K', issuerId: 'I', keyPath: '/k.p8' }, tmpDir);
    expect(result.ok).toBe(false);
  });
});

describe('loginGoogle', () => {
  it('validates SA and stores credentials', async () => {
    vi.mocked(google.validateServiceAccount).mockResolvedValue({
      ok: true as const,
      data: { projectId: 'proj', clientEmail: 'e@g.com', validated: true },
    });

    const result = await loginGoogle({ serviceAccountPath: '/sa.json' }, tmpDir);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.authenticated.google).toBe(true);
    expect(result.data.details.google?.projectId).toBe('proj');
  });

  it('returns error when SA invalid', async () => {
    vi.mocked(google.validateServiceAccount).mockResolvedValue({
      ok: false as const,
      error: { code: 'GOOGLE_INVALID_JSON', message: 'Bad JSON', severity: 'critical' as const },
    });

    const result = await loginGoogle({ serviceAccountPath: '/bad' }, tmpDir);
    expect(result.ok).toBe(false);
  });
});

describe('execute (legacy)', () => {
  it('returns error with instructions', async () => {
    const result = await execute();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('LOGIN_NO_INPUT');
  });
});
