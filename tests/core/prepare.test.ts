import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import {
  execute,
  validateMetadata,
  LIMITS,
  BANNED_KEYWORDS,
  _inferCategory,
  _extractKeywords,
  _formatAppName,
} from '../../src/core/prepare.js';
import type { Metadata } from '../../src/core/prepare.js';

const TMP = join(__dirname, '..', '.tmp-prepare-test');

describe('Prepare Command', () => {
  beforeEach(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  describe('execute', () => {
    it('should generate metadata from package.json', async () => {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({
        name: 'my-cool-app',
        dependencies: { 'expo-camera': '^14.0.0', 'expo-location': '^17.0.0' },
      }));

      const result = await execute({ projectPath: TMP });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.metadata.appName.value).toBe('My Cool App');
      expect(result.data.savedTo).toContain('metadata.json');
      expect(existsSync(result.data.savedTo)).toBe(true);
    });

    it('should extract app name from app.json', async () => {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({ name: 'test', dependencies: {} }));
      writeFileSync(join(TMP, 'app.json'), JSON.stringify({
        expo: { name: 'HabitFlow', description: 'Track your daily habits' },
      }));

      const result = await execute({ projectPath: TMP });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.metadata.appName.value).toBe('HabitFlow');
      expect(result.data.metadata.shortDescription.value).toContain('Track');
    });

    it('should use user overrides', async () => {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({ name: 'test', dependencies: {} }));

      const result = await execute({
        projectPath: TMP,
        appName: 'Custom Name',
        description: 'Custom description',
        keywords: ['custom', 'app'],
        category: 'Entertainment',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.metadata.appName.value).toBe('Custom Name');
      expect(result.data.metadata.appName.source).toBe('user');
      expect(result.data.metadata.category.value).toBe('Entertainment');
      expect(result.data.metadata.keywords.value).toBe('custom, app');
    });

    it('should detect permissions and generate privacy policy', async () => {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({
        name: 'test',
        dependencies: { 'expo-camera': '^14.0.0', 'expo-location': '^17.0.0' },
      }));

      const result = await execute({ projectPath: TMP });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.privacy.permissions).toContain('Camera');
      expect(result.data.privacy.permissions).toContain('Location');
      expect(result.data.privacy.policyHtml).toContain('Privacy Policy');
      expect(existsSync(join(TMP, 'privacy-policy.html'))).toBe(true);
    });

    it('should save metadata.json to .shipmobile directory', async () => {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({ name: 'test', dependencies: {} }));

      const result = await execute({ projectPath: TMP });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const saved = JSON.parse(readFileSync(result.data.savedTo, 'utf-8'));
      expect(saved.appName).toBeDefined();
      expect(saved.category).toBeDefined();
    });

    it('should extract keywords from README', async () => {
      writeFileSync(join(TMP, 'package.json'), JSON.stringify({ name: 'test', dependencies: {} }));
      writeFileSync(join(TMP, 'README.md'), `# FitTracker\n\nA fitness tracker app for daily workout and health monitoring.`);

      const result = await execute({ projectPath: TMP });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.metadata.keywords.value.length).toBeGreaterThan(0);
    });
  });

  describe('validateMetadata', () => {
    function makeMetadata(overrides: Partial<Record<keyof Metadata, string>> = {}): Metadata {
      return {
        appName: { value: overrides.appName ?? 'Test App', source: 'user' },
        subtitle: { value: overrides.subtitle ?? 'A test app', source: 'user' },
        shortDescription: { value: overrides.shortDescription ?? 'Short desc', source: 'user' },
        longDescription: { value: overrides.longDescription ?? 'Long description here', source: 'user' },
        keywords: { value: overrides.keywords ?? 'test, app', source: 'user' },
        category: { value: overrides.category ?? 'Utilities', source: 'user' },
        ageRating: { value: overrides.ageRating ?? '4+', source: 'user' },
      };
    }

    it('should pass for valid metadata', () => {
      const issues = validateMetadata(makeMetadata());
      const errors = issues.filter(i => i.severity === 'error');
      expect(errors.length).toBe(0);
    });

    it('should catch app name too long', () => {
      const issues = validateMetadata(makeMetadata({ appName: 'A'.repeat(31) }));
      expect(issues.some(i => i.field === 'appName' && i.severity === 'error')).toBe(true);
    });

    it('should catch empty app name', () => {
      const issues = validateMetadata(makeMetadata({ appName: '' }));
      expect(issues.some(i => i.field === 'appName' && i.severity === 'error')).toBe(true);
    });

    it('should catch subtitle too long', () => {
      const issues = validateMetadata(makeMetadata({ subtitle: 'S'.repeat(31) }));
      expect(issues.some(i => i.field === 'subtitle' && i.severity === 'error')).toBe(true);
    });

    it('should catch description too long', () => {
      const issues = validateMetadata(makeMetadata({ longDescription: 'D'.repeat(4001) }));
      expect(issues.some(i => i.field === 'longDescription' && i.severity === 'error')).toBe(true);
    });

    it('should catch empty description', () => {
      const issues = validateMetadata(makeMetadata({ longDescription: '' }));
      expect(issues.some(i => i.field === 'longDescription' && i.severity === 'error')).toBe(true);
    });

    it('should catch keywords too long', () => {
      const issues = validateMetadata(makeMetadata({ keywords: 'k'.repeat(101) }));
      expect(issues.some(i => i.field === 'keywords' && i.severity === 'error')).toBe(true);
    });

    it('should warn about banned keywords', () => {
      const issues = validateMetadata(makeMetadata({ longDescription: 'This is the best app ever' }));
      expect(issues.some(i => i.severity === 'warning' && i.message.includes('best'))).toBe(true);
    });

    it('should catch empty category', () => {
      const issues = validateMetadata(makeMetadata({ category: '' }));
      expect(issues.some(i => i.field === 'category' && i.severity === 'error')).toBe(true);
    });

    it('should respect character limits', () => {
      expect(LIMITS.title).toBe(30);
      expect(LIMITS.subtitle).toBe(30);
      expect(LIMITS.longDescription).toBe(4000);
      expect(LIMITS.keywords).toBe(100);
    });
  });

  describe('inferCategory', () => {
    it('should infer Health & Fitness from health deps', () => {
      const cat = _inferCategory(['react-native-health', 'react-native-ble-plx']);
      expect(cat).toBe('Health & Fitness');
    });

    it('should infer Photo & Video from camera deps', () => {
      const cat = _inferCategory(['expo-camera']);
      expect(cat).toBe('Photo & Video');
    });

    it('should return null for unknown deps', () => {
      const cat = _inferCategory(['lodash', 'axios']);
      expect(cat).toBeNull();
    });
  });

  describe('extractKeywords', () => {
    it('should extract relevant keywords from README text', () => {
      const kw = _extractKeywords('Build a fitness tracker with workout logging', 'FitApp');
      expect(kw).toContain('fitness');
      expect(kw).toContain('tracker');
    });

    it('should include app name words', () => {
      const kw = _extractKeywords('Some readme content', 'Health Buddy');
      expect(kw).toContain('health');
      expect(kw).toContain('buddy');
    });

    it('should limit to 10 keywords', () => {
      const longText = 'tracker fitness health social photo camera music video game shopping food recipe travel map weather news education finance productivity utility chat messaging calendar notes todo task habit meditation workout running cycling yoga';
      const kw = _extractKeywords(longText, '');
      expect(kw.length).toBeLessThanOrEqual(10);
    });
  });

  describe('formatAppName', () => {
    it('should format hyphenated names', () => {
      expect(_formatAppName('my-cool-app')).toBe('My Cool App');
    });

    it('should format underscored names', () => {
      expect(_formatAppName('my_cool_app')).toBe('My Cool App');
    });

    it('should strip npm scope', () => {
      expect(_formatAppName('@myorg/my-app')).toBe('My App');
    });
  });

  describe('banned keywords', () => {
    it('should have a populated banned list', () => {
      expect(BANNED_KEYWORDS.length).toBeGreaterThan(5);
    });

    it('should include common offenders', () => {
      expect(BANNED_KEYWORDS).toContain('free');
      expect(BANNED_KEYWORDS).toContain('best');
      expect(BANNED_KEYWORDS).toContain('#1');
    });
  });
});
