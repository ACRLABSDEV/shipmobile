/**
 * Google Play Store Service — abstraction layer for Play Developer API v3
 * Fully mockable for testing, similar to src/services/eas.ts
 */

import { readFile } from 'node:fs/promises';
import { SignJWT, importPKCS8 } from 'jose';
import { readCredentials } from '../utils/config.js';

const PLAY_API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

export type PlayStoreTrack = 'internal' | 'alpha' | 'beta' | 'production';

export type PlayStoreStatus =
  | 'uploading'
  | 'processing'
  | 'draft'
  | 'inProgress'
  | 'halted'
  | 'completed'
  | 'errored';

export interface PlayStoreSubmitRequest {
  aabPath: string;
  packageName: string;
  track: PlayStoreTrack;
  metadata: PlayStoreMetadata;
  projectDir: string;
}

export interface PlayStoreMetadata {
  title: string;
  shortDescription: string;
  fullDescription: string;
  category?: string;
  defaultLanguage?: string;
  screenshots?: Record<string, string[]>;
  whatsNew?: string;
  version: string;
}

export interface PlayStoreSubmission {
  editId: string;
  packageName: string;
  track: PlayStoreTrack;
  status: PlayStoreStatus;
  versionCode: number;
  version: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface PlayStoreService {
  /** Upload AAB to Google Play */
  uploadBundle(aabPath: string, packageName: string): Promise<PlayStoreSubmission>;
  /** Set store listing metadata */
  setListing(packageName: string, metadata: PlayStoreMetadata): Promise<void>;
  /** Submit to a track (internal, alpha, beta, production) */
  submitToTrack(packageName: string, track: PlayStoreTrack, versionCode: number): Promise<PlayStoreSubmission>;
  /** Check submission status */
  getSubmissionStatus(packageName: string, track: PlayStoreTrack): Promise<PlayStoreSubmission>;
}

export interface GoogleServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

/**
 * Generate a signed JWT for Google OAuth2 token exchange.
 * Exported for testing.
 */
export async function generateGoogleJWT(serviceAccount: GoogleServiceAccount): Promise<string> {
  const key = await importPKCS8(serviceAccount.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({
    scope: ANDROID_PUBLISHER_SCOPE,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience(GOOGLE_TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600) // 1 hour
    .sign(key);

  return jwt;
}

/**
 * Exchange a signed JWT for a Google OAuth2 access token.
 * Exported for testing.
 */
export async function exchangeGoogleToken(jwt: string): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Google OAuth2 token exchange failed (${response.status}): ${text}. ` +
      'Verify your service account key is valid and has the Android Publisher role.',
    );
  }

  const data = await response.json() as { access_token?: string };
  if (!data.access_token) {
    throw new Error('Google OAuth2 response missing access_token. Check service account configuration.');
  }

  return data.access_token;
}

/**
 * Load Google service account from credentials path stored in .shipmobile/credentials.json
 */
async function loadGoogleServiceAccount(cwd?: string): Promise<GoogleServiceAccount> {
  const credResult = await readCredentials(cwd);
  if (!credResult.ok) {
    throw new Error(`Failed to read credentials: ${credResult.error.message}`);
  }

  const google = credResult.data.google;
  if (!google?.validated || !google.serviceAccountPath) {
    throw new Error(
      'Google Play credentials not configured. Run `shipmobile login --google` first to provide your service account JSON.',
    );
  }

  let raw: string;
  try {
    raw = await readFile(google.serviceAccountPath, 'utf-8');
  } catch {
    throw new Error(
      `Failed to read Google service account file at "${google.serviceAccountPath}". ` +
      'Ensure the file exists. Download it from the Google Cloud Console → IAM → Service Accounts.',
    );
  }

  let sa: GoogleServiceAccount;
  try {
    sa = JSON.parse(raw) as GoogleServiceAccount;
  } catch {
    throw new Error(
      `Invalid JSON in service account file at "${google.serviceAccountPath}". ` +
      'Ensure it is a valid Google service account key JSON file.',
    );
  }

  if (!sa.private_key || !sa.client_email) {
    throw new Error(
      'Service account JSON missing required fields (private_key, client_email). ' +
      'Ensure you downloaded the full key file from Google Cloud Console.',
    );
  }

  return sa;
}

/**
 * Real implementation — calls Google Play Developer API v3
 */
class RealPlayStoreService implements PlayStoreService {
  private cwd?: string;
  private cachedToken?: { token: string; expiresAt: number };

  constructor(cwd?: string) {
    this.cwd = cwd;
  }

  private async getAccessToken(): Promise<string> {
    // Reuse cached token if still valid (with 5 min buffer)
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 300_000) {
      return this.cachedToken.token;
    }

    const sa = await loadGoogleServiceAccount(this.cwd);
    const jwt = await generateGoogleJWT(sa);
    const token = await exchangeGoogleToken(jwt);

    this.cachedToken = {
      token,
      expiresAt: Date.now() + 3600_000, // 1 hour
    };

    return token;
  }

  private async apiRequest(
    method: string,
    path: string,
    body?: unknown,
    contentType = 'application/json',
  ): Promise<unknown> {
    const token = await this.getAccessToken();
    const url = `${PLAY_API_BASE}/${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body
        ? contentType === 'application/json'
          ? JSON.stringify(body)
          : (body as BodyInit)
        : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let detail = '';
      try {
        const errBody = JSON.parse(text) as { error?: { message?: string } };
        detail = errBody.error?.message || text;
      } catch {
        detail = text;
      }
      throw new Error(
        `Google Play API error (${response.status} ${response.statusText}): ${detail}. ` +
        `Endpoint: ${method} ${path}`,
      );
    }

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      return response.json();
    }
    return undefined;
  }

  private async createEdit(packageName: string): Promise<string> {
    const resp = await this.apiRequest('POST', `${packageName}/edits`, {}) as {
      id?: string;
    };
    if (!resp?.id) {
      throw new Error('Failed to create edit: no edit ID returned from Google Play API.');
    }
    return resp.id;
  }

  private async commitEdit(packageName: string, editId: string): Promise<void> {
    await this.apiRequest('POST', `${packageName}/edits/${editId}:commit`);
  }

  async uploadBundle(aabPath: string, packageName: string): Promise<PlayStoreSubmission> {
    const editId = await this.createEdit(packageName);

    // Read the AAB file
    let aabBuffer: Buffer;
    try {
      aabBuffer = await readFile(aabPath) as unknown as Buffer;
    } catch {
      throw new Error(
        `Failed to read AAB file at "${aabPath}". Ensure the file exists and is readable.`,
      );
    }

    // Upload the bundle
    const token = await this.getAccessToken();
    const uploadUrl = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}/edits/${editId}/bundles?uploadType=media`;

    const uploadResp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: aabBuffer,
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text().catch(() => '');
      throw new Error(
        `AAB upload failed (${uploadResp.status}): ${errText}. ` +
        `Ensure "${aabPath}" is a valid Android App Bundle.`,
      );
    }

    const uploadData = await uploadResp.json() as { versionCode?: number };
    const versionCode = uploadData.versionCode || 0;

    return {
      editId,
      packageName,
      track: 'internal',
      status: 'draft',
      versionCode,
      version: String(versionCode),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async setListing(packageName: string, metadata: PlayStoreMetadata): Promise<void> {
    const editId = await this.createEdit(packageName);
    const language = metadata.defaultLanguage || 'en-US';

    await this.apiRequest(
      'PUT',
      `${packageName}/edits/${editId}/listings/${language}`,
      {
        title: metadata.title,
        shortDescription: metadata.shortDescription,
        fullDescription: metadata.fullDescription,
      },
    );

    await this.commitEdit(packageName, editId);
  }

  async submitToTrack(
    packageName: string,
    track: PlayStoreTrack,
    versionCode: number,
  ): Promise<PlayStoreSubmission> {
    const editId = await this.createEdit(packageName);

    await this.apiRequest(
      'PUT',
      `${packageName}/edits/${editId}/tracks/${track}`,
      {
        track,
        releases: [
          {
            versionCodes: [versionCode],
            status: 'completed',
          },
        ],
      },
    );

    await this.commitEdit(packageName, editId);

    return {
      editId,
      packageName,
      track,
      status: 'completed',
      versionCode,
      version: String(versionCode),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getSubmissionStatus(
    packageName: string,
    track: PlayStoreTrack,
  ): Promise<PlayStoreSubmission> {
    const editId = await this.createEdit(packageName);

    const resp = await this.apiRequest(
      'GET',
      `${packageName}/edits/${editId}/tracks/${track}`,
    ) as {
      track?: string;
      releases?: Array<{
        versionCodes?: string[];
        status?: string;
      }>;
    };

    const release = resp?.releases?.[0];
    const versionCode = release?.versionCodes?.[0]
      ? parseInt(release.versionCodes[0], 10)
      : 0;

    // Map Google's status to ours
    const statusMap: Record<string, PlayStoreStatus> = {
      draft: 'draft',
      inProgress: 'inProgress',
      halted: 'halted',
      completed: 'completed',
    };

    return {
      editId,
      packageName,
      track,
      status: statusMap[release?.status || ''] || 'draft',
      versionCode,
      version: String(versionCode),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

let _service: PlayStoreService = new RealPlayStoreService();

export function getPlayStoreService(): PlayStoreService {
  return _service;
}

export function setPlayStoreService(service: PlayStoreService): void {
  _service = service;
}

export function resetPlayStoreService(): void {
  _service = new RealPlayStoreService();
}
