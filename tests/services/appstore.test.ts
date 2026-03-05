/**
 * Tests for App Store Connect service
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getAppStoreService,
  setAppStoreService,
  resetAppStoreService,
  type AppStoreService,
  type AppStoreSubmission,
} from '../../src/services/appstore.js';

describe('AppStoreService', () => {
  afterEach(() => {
    resetAppStoreService();
  });

  it('should return default service', () => {
    const service = getAppStoreService();
    expect(service).toBeDefined();
    expect(service.uploadBuild).toBeDefined();
    expect(service.setMetadata).toBeDefined();
    expect(service.submitForReview).toBeDefined();
    expect(service.getSubmissionStatus).toBeDefined();
  });

  it('should allow replacing the service for testing', async () => {
    const mockSubmission: AppStoreSubmission = {
      id: 'test-sub',
      appId: 'com.test.app',
      version: '1.0.0',
      status: 'waiting_for_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockService: AppStoreService = {
      uploadBuild: vi.fn(async () => mockSubmission),
      setMetadata: vi.fn(async () => {}),
      submitForReview: vi.fn(async () => mockSubmission),
      getSubmissionStatus: vi.fn(async () => mockSubmission),
    };

    setAppStoreService(mockService);
    const service = getAppStoreService();
    const result = await service.uploadBuild('/path/to/ipa', 'com.test.app');
    expect(result.id).toBe('test-sub');
    expect(mockService.uploadBuild).toHaveBeenCalledWith('/path/to/ipa', 'com.test.app');
  });

  it('should reset to real service', () => {
    const mockService: AppStoreService = {
      uploadBuild: vi.fn(async () => ({} as AppStoreSubmission)),
      setMetadata: vi.fn(async () => {}),
      submitForReview: vi.fn(async () => ({} as AppStoreSubmission)),
      getSubmissionStatus: vi.fn(async () => ({} as AppStoreSubmission)),
    };

    setAppStoreService(mockService);
    resetAppStoreService();

    const service = getAppStoreService();
    // Real service should throw (not available in test environment)
    expect(service.uploadBuild('/test', 'com.test')).rejects.toThrow();
  });
});
