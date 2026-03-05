/**
 * App Store Connect Service — abstraction layer for App Store Connect API
 * Fully mockable for testing, similar to src/services/eas.ts
 */

import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SignJWT, importPKCS8 } from 'jose';
import { readCredentials } from '../utils/config.js';

const execFileAsync = promisify(execFile);

const APP_STORE_CONNECT_BASE = 'https://api.appstoreconnect.apple.com';

export type SubmissionStatus =
  | 'preparing'
  | 'uploading'
  | 'processing'
  | 'waiting_for_review'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'errored';

export interface AppStoreSubmitRequest {
  ipaPath: string;
  appId: string;
  metadata: AppStoreMetadata;
  projectDir: string;
}

export interface AppStoreMetadata {
  appName: string;
  description: string;
  keywords?: string[];
  subtitle?: string;
  privacyPolicyUrl?: string;
  category?: string;
  screenshots?: Record<string, string[]>;
  whatsNew?: string;
  version: string;
}

export interface AppStoreSubmission {
  id: string;
  appId: string;
  version: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  reviewUrl?: string;
  error?: string;
}

export interface AppStoreService {
  /** Upload IPA to App Store Connect via Transporter or API */
  uploadBuild(ipaPath: string, appId: string): Promise<AppStoreSubmission>;
  /** Attach metadata to the submission */
  setMetadata(appId: string, metadata: AppStoreMetadata): Promise<void>;
  /** Submit the build for App Review */
  submitForReview(appId: string, version: string): Promise<AppStoreSubmission>;
  /** Check submission status */
  getSubmissionStatus(appId: string): Promise<AppStoreSubmission>;
}

/**
 * Map App Store Connect API version state to our SubmissionStatus
 */
function mapAppStoreState(state: string): SubmissionStatus {
  const stateMap: Record<string, SubmissionStatus> = {
    PREPARE_FOR_SUBMISSION: 'preparing',
    WAITING_FOR_REVIEW: 'waiting_for_review',
    IN_REVIEW: 'in_review',
    PENDING_DEVELOPER_RELEASE: 'approved',
    READY_FOR_SALE: 'approved',
    REJECTED: 'rejected',
    DEVELOPER_REJECTED: 'rejected',
    PROCESSING_FOR_APP_STORE: 'processing',
  };
  return stateMap[state] || 'preparing';
}

/**
 * Generate a signed JWT for App Store Connect API authentication.
 * Exported for testing.
 */
export async function generateAppStoreJWT(opts: {
  keyId: string;
  issuerId: string;
  privateKey: string;
}): Promise<string> {
  // Apple P8 keys are PEM-encoded PKCS#8 EC private keys
  const key = await importPKCS8(opts.privateKey, 'ES256');

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: opts.keyId, typ: 'JWT' })
    .setIssuer(opts.issuerId)
    .setIssuedAt(now)
    .setExpirationTime(now + 20 * 60) // 20 minutes max
    .setAudience('appstoreconnect-v2')
    .sign(key);

  return jwt;
}

/**
 * Load Apple credentials from .shipmobile/credentials.json and read the P8 key file.
 */
async function loadAppleCredentials(cwd?: string): Promise<{
  keyId: string;
  issuerId: string;
  privateKey: string;
}> {
  const credResult = await readCredentials(cwd);
  if (!credResult.ok) {
    throw new Error(`Failed to read credentials: ${credResult.error.message}`);
  }

  const apple = credResult.data.apple;
  if (!apple?.validated || !apple.apiKeyId || !apple.issuerId || !apple.keyPath) {
    throw new Error(
      'Apple credentials not configured. Run `shipmobile login --apple` first to provide your App Store Connect API key.',
    );
  }

  let privateKey: string;
  try {
    privateKey = await readFile(apple.keyPath, 'utf-8');
  } catch {
    throw new Error(
      `Failed to read Apple P8 key file at "${apple.keyPath}". ` +
      'Ensure the file exists and is readable. ' +
      'You can download it from https://appstoreconnect.apple.com/access/integrations/api',
    );
  }

  return {
    keyId: apple.apiKeyId,
    issuerId: apple.issuerId,
    privateKey,
  };
}

/**
 * Real implementation — uses xcrun altool for uploads and
 * App Store Connect API v2 for metadata/submission/status
 */
class RealAppStoreService implements AppStoreService {
  private cwd?: string;

  constructor(cwd?: string) {
    this.cwd = cwd;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const creds = await loadAppleCredentials(this.cwd);
    const token = await generateAppStoreJWT(creds);
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiRequest(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const headers = await this.getAuthHeaders();
    const url = `${APP_STORE_CONNECT_BASE}${path}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let detail = '';
      try {
        const errBody = JSON.parse(text) as { errors?: Array<{ detail?: string }> };
        detail = errBody.errors?.map((e) => e.detail).join('; ') || text;
      } catch {
        detail = text;
      }
      throw new Error(
        `App Store Connect API error (${response.status} ${response.statusText}): ${detail}. ` +
        `Endpoint: ${method} ${path}`,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return undefined;
  }

  async uploadBuild(ipaPath: string, appId: string): Promise<AppStoreSubmission> {
    // Upload uses xcrun altool (requires macOS with Xcode)
    const creds = await loadAppleCredentials(this.cwd);

    try {
      await execFileAsync('xcrun', [
        'altool',
        '--upload-app',
        '--type', 'ios',
        '--file', ipaPath,
        '--apiKey', creds.keyId,
        '--apiIssuer', creds.issuerId,
      ], { timeout: 600_000 }); // 10 min timeout for upload
    } catch (e: unknown) {
      const error = e as { stderr?: string; message?: string };
      const msg = error.stderr || error.message || 'Unknown error';

      if (msg.includes('not found') || msg.includes('ENOENT')) {
        throw new Error(
          'xcrun altool not found. Upload requires macOS with Xcode Command Line Tools installed. ' +
          'Install with: xcode-select --install',
        );
      }
      throw new Error(
        `IPA upload failed: ${msg}. ` +
        `Ensure the IPA at "${ipaPath}" is valid and your API key has the App Manager role.`,
      );
    }

    return {
      id: `upload-${Date.now()}`,
      appId,
      version: 'pending',
      status: 'uploading',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async setMetadata(appId: string, metadata: AppStoreMetadata): Promise<void> {
    // First, get the latest editable app store version
    const versionsResp = await this.apiRequest(
      'GET',
      `/v1/apps/${appId}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION&include=appStoreVersionLocalizations`,
    ) as {
      data: Array<{
        id: string;
        relationships?: {
          appStoreVersionLocalizations?: {
            data?: Array<{ id: string }>;
          };
        };
      }>;
      included?: Array<{
        id: string;
        type: string;
        attributes?: { locale?: string };
      }>;
    };

    let versionId: string;
    if (versionsResp.data.length === 0) {
      // Create a new version
      const createResp = await this.apiRequest('POST', '/v1/appStoreVersions', {
        data: {
          type: 'appStoreVersions',
          attributes: {
            versionString: metadata.version,
            platform: 'IOS',
          },
          relationships: {
            app: {
              data: { type: 'apps', id: appId },
            },
          },
        },
      }) as { data: { id: string } };
      versionId = createResp.data.id;
    } else {
      versionId = versionsResp.data[0]!.id;
    }

    // Get localizations for this version
    const locResp = await this.apiRequest(
      'GET',
      `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
    ) as { data: Array<{ id: string; attributes?: { locale?: string } }> };

    const enLoc = locResp.data.find(
      (l) => l.attributes?.locale === 'en-US' || l.attributes?.locale === 'en',
    );

    if (enLoc) {
      // Update existing localization
      await this.apiRequest(
        'PATCH',
        `/v1/appStoreVersionLocalizations/${enLoc.id}`,
        {
          data: {
            type: 'appStoreVersionLocalizations',
            id: enLoc.id,
            attributes: {
              description: metadata.description,
              keywords: metadata.keywords?.join(', '),
              whatsNew: metadata.whatsNew,
            },
          },
        },
      );
    } else {
      // Create localization
      await this.apiRequest('POST', '/v1/appStoreVersionLocalizations', {
        data: {
          type: 'appStoreVersionLocalizations',
          attributes: {
            locale: 'en-US',
            description: metadata.description,
            keywords: metadata.keywords?.join(', '),
            whatsNew: metadata.whatsNew,
          },
          relationships: {
            appStoreVersion: {
              data: { type: 'appStoreVersions', id: versionId },
            },
          },
        },
      });
    }
  }

  async submitForReview(appId: string, version: string): Promise<AppStoreSubmission> {
    // Find the version to submit
    const versionsResp = await this.apiRequest(
      'GET',
      `/v1/apps/${appId}/appStoreVersions?filter[versionString]=${version}&filter[appStoreState]=PREPARE_FOR_SUBMISSION`,
    ) as { data: Array<{ id: string }> };

    if (versionsResp.data.length === 0) {
      throw new Error(
        `No version "${version}" found in PREPARE_FOR_SUBMISSION state for app ${appId}. ` +
        'Ensure you have uploaded a build and set metadata before submitting.',
      );
    }

    const versionId = versionsResp.data[0]!.id;

    // Create submission
    await this.apiRequest('POST', '/v1/appStoreVersionSubmissions', {
      data: {
        type: 'appStoreVersionSubmissions',
        relationships: {
          appStoreVersion: {
            data: { type: 'appStoreVersions', id: versionId },
          },
        },
      },
    });

    return {
      id: versionId,
      appId,
      version,
      status: 'waiting_for_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getSubmissionStatus(appId: string): Promise<AppStoreSubmission> {
    const versionsResp = await this.apiRequest(
      'GET',
      `/v1/apps/${appId}/appStoreVersions?limit=1&sort=-createdDate`,
    ) as {
      data: Array<{
        id: string;
        attributes?: {
          versionString?: string;
          appStoreState?: string;
          createdDate?: string;
        };
      }>;
    };

    if (versionsResp.data.length === 0) {
      throw new Error(
        `No versions found for app ${appId}. Submit a version first.`,
      );
    }

    const ver = versionsResp.data[0]!;
    const attrs = ver.attributes || {};

    return {
      id: ver.id,
      appId,
      version: attrs.versionString || 'unknown',
      status: mapAppStoreState(attrs.appStoreState || ''),
      createdAt: attrs.createdDate || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

let _service: AppStoreService = new RealAppStoreService();

export function getAppStoreService(): AppStoreService {
  return _service;
}

export function setAppStoreService(service: AppStoreService): void {
  _service = service;
}

export function resetAppStoreService(): void {
  _service = new RealAppStoreService();
}
