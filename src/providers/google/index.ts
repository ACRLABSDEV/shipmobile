/**
 * Google Play Provider — service account authentication
 */

import { readFile } from 'node:fs/promises';
import { ok, err, type Result } from '../../utils/result.js';

export interface GoogleAccount {
  projectId: string;
  clientEmail: string;
  validated: boolean;
}

export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
}

/**
 * Validate a Google Play service account JSON key
 */
export async function validateServiceAccount(keyPath: string): Promise<Result<GoogleAccount>> {
  try {
    const raw = await readFile(keyPath, 'utf-8');
    let key: ServiceAccountKey;

    try {
      key = JSON.parse(raw) as ServiceAccountKey;
    } catch {
      return err(
        'GOOGLE_INVALID_JSON',
        'Service account file is not valid JSON.',
        'critical',
        'Download a new service account key from Google Cloud Console.',
      );
    }

    if (key.type !== 'service_account') {
      return err(
        'GOOGLE_INVALID_KEY_TYPE',
        `Expected key type "service_account", got "${key.type}".`,
        'critical',
        'Make sure you downloaded a service account key, not an OAuth key.',
      );
    }

    if (!key.project_id || !key.client_email || !key.private_key) {
      return err(
        'GOOGLE_INCOMPLETE_KEY',
        'Service account key is missing required fields.',
        'critical',
        'Download a new service account key from Google Cloud Console.',
      );
    }

    return ok({
      projectId: key.project_id,
      clientEmail: key.client_email,
      validated: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ENOENT')) {
      return err(
        'GOOGLE_KEY_NOT_FOUND',
        `Service account file not found: ${keyPath}`,
        'critical',
        'Check the file path and try again.',
      );
    }
    return err('GOOGLE_VALIDATION_ERROR', `Google service account validation failed: ${msg}`);
  }
}
