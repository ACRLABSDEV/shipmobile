/**
 * Tests for Google Play Store service
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getPlayStoreService,
  setPlayStoreService,
  resetPlayStoreService,
  type PlayStoreService,
  type PlayStoreSubmission,
} from '../../src/services/playstore.js';

describe('PlayStoreService', () => {
  afterEach(() => {
    resetPlayStoreService();
  });

  it('should return default service', () => {
    const service = getPlayStoreService();
    expect(service).toBeDefined();
    expect(service.uploadBundle).toBeDefined();
    expect(service.setListing).toBeDefined();
    expect(service.submitToTrack).toBeDefined();
    expect(service.getSubmissionStatus).toBeDefined();
  });

  it('should allow replacing the service for testing', async () => {
    const mockSubmission: PlayStoreSubmission = {
      editId: 'edit-123',
      packageName: 'com.test.app',
      track: 'production',
      status: 'completed',
      versionCode: 1,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockService: PlayStoreService = {
      uploadBundle: vi.fn(async () => mockSubmission),
      setListing: vi.fn(async () => {}),
      submitToTrack: vi.fn(async () => mockSubmission),
      getSubmissionStatus: vi.fn(async () => mockSubmission),
    };

    setPlayStoreService(mockService);
    const service = getPlayStoreService();
    const result = await service.uploadBundle('/path/to/aab', 'com.test.app');
    expect(result.editId).toBe('edit-123');
    expect(mockService.uploadBundle).toHaveBeenCalledWith('/path/to/aab', 'com.test.app');
  });

  it('should reset to real service', () => {
    const mockService: PlayStoreService = {
      uploadBundle: vi.fn(async () => ({} as PlayStoreSubmission)),
      setListing: vi.fn(async () => {}),
      submitToTrack: vi.fn(async () => ({} as PlayStoreSubmission)),
      getSubmissionStatus: vi.fn(async () => ({} as PlayStoreSubmission)),
    };

    setPlayStoreService(mockService);
    resetPlayStoreService();

    const service = getPlayStoreService();
    expect(service.uploadBundle('/test', 'com.test')).rejects.toThrow();
  });
});
