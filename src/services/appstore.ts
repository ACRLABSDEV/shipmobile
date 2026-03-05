/**
 * App Store Connect Service — abstraction layer for App Store Connect API
 * Fully mockable for testing, similar to src/services/eas.ts
 */

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
 * Real implementation — shells out to xcrun altool / Transporter
 * or calls App Store Connect API v2
 */
class RealAppStoreService implements AppStoreService {
  async uploadBuild(ipaPath: string, appId: string): Promise<AppStoreSubmission> {
    // In production, this would use xcrun altool or the Transporter CLI
    // For now, this is the real implementation stub
    throw new Error(
      `App Store upload not available in this environment. ` +
      `Requires Transporter CLI or xcrun altool. ` +
      `IPA: ${ipaPath}, App ID: ${appId}`,
    );
  }

  async setMetadata(_appId: string, _metadata: AppStoreMetadata): Promise<void> {
    throw new Error(
      'App Store Connect metadata API not available. ' +
      'Requires App Store Connect API key authentication.',
    );
  }

  async submitForReview(_appId: string, _version: string): Promise<AppStoreSubmission> {
    throw new Error(
      'App Store review submission not available. ' +
      'Requires authenticated App Store Connect API access.',
    );
  }

  async getSubmissionStatus(_appId: string): Promise<AppStoreSubmission> {
    throw new Error(
      'App Store status check not available. ' +
      'Requires authenticated App Store Connect API access.',
    );
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
