/**
 * Tests for EAS service utilities
 */

import { describe, it, expect } from 'vitest';
import { estimateProgress, estimateTimeRemaining, phaseLabel } from '../../src/services/eas.js';

describe('EAS service utilities', () => {
  describe('estimateProgress', () => {
    it('should return 0 for queued', () => {
      expect(estimateProgress('queued')).toBe(0);
    });

    it('should return 100 for finished', () => {
      expect(estimateProgress('finished')).toBe(100);
    });

    it('should return 100 for errored', () => {
      expect(estimateProgress('errored')).toBe(100);
    });

    it('should return increasing values for sequential phases', () => {
      const phases = ['queued', 'provisioning', 'installing_dependencies', 'building', 'uploading', 'finished'] as const;
      let lastProgress = -1;
      for (const phase of phases) {
        const p = estimateProgress(phase);
        expect(p).toBeGreaterThan(lastProgress);
        lastProgress = p;
      }
    });
  });

  describe('estimateTimeRemaining', () => {
    it('should return null for completed phases', () => {
      expect(estimateTimeRemaining('finished', 300000)).toBeNull();
      expect(estimateTimeRemaining('errored', 300000)).toBeNull();
    });

    it('should return null for queued (0 progress)', () => {
      expect(estimateTimeRemaining('queued', 10000)).toBeNull();
    });

    it('should return a positive number for in-progress phases', () => {
      const remaining = estimateTimeRemaining('building', 120000);
      expect(remaining).not.toBeNull();
      expect(remaining!).toBeGreaterThanOrEqual(0);
    });
  });

  describe('phaseLabel', () => {
    it('should return human-readable labels', () => {
      expect(phaseLabel('queued')).toBe('Queued');
      expect(phaseLabel('building')).toBe('Building');
      expect(phaseLabel('finished')).toBe('Complete');
      expect(phaseLabel('errored')).toBe('Error');
      expect(phaseLabel('installing_dependencies')).toBe('Installing dependencies');
    });
  });
});
