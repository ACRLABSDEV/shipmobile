/**
 * Tests for Google Play auth flow (JWT generation, token exchange)
 * Uses real jose crypto but mocks the token exchange HTTP call
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateGoogleJWT, exchangeGoogleToken, type GoogleServiceAccount } from '../../src/services/playstore.js';
import { generateKeyPair, exportPKCS8, decodeJwt, decodeProtectedHeader } from 'jose';

describe('Google Play Auth', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function makeTestServiceAccount(): Promise<GoogleServiceAccount> {
    const { privateKey } = await generateKeyPair('RS256', { extractable: true });
    const pkcs8 = await exportPKCS8(privateKey);

    return {
      type: 'service_account',
      project_id: 'test-project',
      private_key_id: 'key-id-123',
      private_key: pkcs8,
      client_email: 'test@test-project.iam.gserviceaccount.com',
      client_id: '123456789',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };
  }

  it('should generate a valid Google JWT with correct claims', async () => {
    const sa = await makeTestServiceAccount();
    const token = await generateGoogleJWT(sa);

    expect(token).toBeDefined();
    expect(token.split('.')).toHaveLength(3);

    const header = decodeProtectedHeader(token);
    expect(header.alg).toBe('RS256');
    expect(header.typ).toBe('JWT');

    const payload = decodeJwt(token);
    expect(payload.iss).toBe(sa.client_email);
    expect(payload.sub).toBe(sa.client_email);
    expect(payload.aud).toBe('https://oauth2.googleapis.com/token');
    expect(payload.scope).toBe('https://www.googleapis.com/auth/androidpublisher');
    expect((payload.exp as number) - (payload.iat as number)).toBe(3600);
  });

  it('should exchange JWT for access token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'ya29.test-token' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const token = await exchangeGoogleToken('test-jwt-assertion');

    expect(token).toBe('ya29.test-token');
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(opts.method).toBe('POST');

    const body = opts.body as URLSearchParams;
    expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
    expect(body.get('assertion')).toBe('test-jwt-assertion');
  });

  it('should throw on failed token exchange', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"error":"invalid_grant"}',
    }));

    await expect(exchangeGoogleToken('bad-jwt')).rejects.toThrow('Google OAuth2 token exchange failed');
  });

  it('should throw on missing access_token in response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
      headers: new Headers({ 'content-type': 'application/json' }),
    }));

    await expect(exchangeGoogleToken('jwt')).rejects.toThrow('missing access_token');
  });

  it('should reject invalid private key', async () => {
    const sa = await makeTestServiceAccount();
    sa.private_key = 'not-a-valid-key';

    await expect(generateGoogleJWT(sa)).rejects.toThrow();
  });
});
