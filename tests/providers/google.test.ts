/**
 * Tests for Google provider
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';
import { validateServiceAccount } from '../../src/providers/google/index.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Google Provider', () => {
  const validSA = JSON.stringify({
    type: 'service_account',
    project_id: 'my-project',
    private_key_id: 'key123',
    private_key: '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
    client_email: 'sa@my-project.iam.gserviceaccount.com',
    client_id: '12345',
  });

  describe('validateServiceAccount', () => {
    it('returns account info on valid SA', async () => {
      vi.mocked(readFile).mockResolvedValue(validSA);

      const result = await validateServiceAccount('/path/to/sa.json');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.projectId).toBe('my-project');
      expect(result.data.clientEmail).toBe('sa@my-project.iam.gserviceaccount.com');
      expect(result.data.validated).toBe(true);
    });

    it('returns error on file not found', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await validateServiceAccount('/bad/path');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('GOOGLE_KEY_NOT_FOUND');
    });

    it('returns error on invalid JSON', async () => {
      vi.mocked(readFile).mockResolvedValue('not json');

      const result = await validateServiceAccount('/path');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('GOOGLE_INVALID_JSON');
    });

    it('returns error on wrong key type', async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        type: 'authorized_user',
        project_id: 'p',
        client_email: 'e',
        private_key: 'k',
      }));

      const result = await validateServiceAccount('/path');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('GOOGLE_INVALID_KEY_TYPE');
    });

    it('returns error on missing fields', async () => {
      vi.mocked(readFile).mockResolvedValue(JSON.stringify({
        type: 'service_account',
      }));

      const result = await validateServiceAccount('/path');
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.code).toBe('GOOGLE_INCOMPLETE_KEY');
    });
  });
});
