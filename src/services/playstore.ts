/**
 * Google Play Store Service — abstraction layer for Play Developer API
 * Fully mockable for testing, similar to src/services/eas.ts
 */

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

/**
 * Real implementation — calls Google Play Developer API v3
 */
class RealPlayStoreService implements PlayStoreService {
  async uploadBundle(aabPath: string, packageName: string): Promise<PlayStoreSubmission> {
    throw new Error(
      `Play Store upload not available in this environment. ` +
      `Requires Google Play Developer API service account. ` +
      `AAB: ${aabPath}, Package: ${packageName}`,
    );
  }

  async setListing(_packageName: string, _metadata: PlayStoreMetadata): Promise<void> {
    throw new Error(
      'Play Store listing API not available. ' +
      'Requires authenticated Google Play Developer API access.',
    );
  }

  async submitToTrack(_packageName: string, _track: PlayStoreTrack, _versionCode: number): Promise<PlayStoreSubmission> {
    throw new Error(
      'Play Store track submission not available. ' +
      'Requires authenticated Google Play Developer API access.',
    );
  }

  async getSubmissionStatus(_packageName: string, _track: PlayStoreTrack): Promise<PlayStoreSubmission> {
    throw new Error(
      'Play Store status check not available. ' +
      'Requires authenticated Google Play Developer API access.',
    );
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
