import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { execute, detectWorkflow } from '../../src/core/init.js';

const FIXTURES = join(__dirname, '..', 'fixtures');

describe('init', () => {
  describe('detectWorkflow', () => {
    it('detects expo managed workflow', async () => {
      const result = await detectWorkflow(join(FIXTURES, 'valid-expo'));
      expect(result).toBe('expo-managed');
    });

    it('detects not-rn for empty dir', async () => {
      const result = await detectWorkflow('/tmp');
      // /tmp has no package.json
      expect(result).toBe('not-rn');
    });
  });

  describe('execute', () => {
    it('initializes valid expo project', async () => {
      const result = await execute({ projectPath: join(FIXTURES, 'valid-expo') });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.project.name).toBe('my-test-app');
      expect(result.data.project.workflow).toBe('expo-managed');
      expect(result.data.project.bundleId).toBe('com.test.mytestapp');
      expect(result.data.project.sdkVersion).toBe('52.0.0');
      expect(result.data.project.platforms).toEqual(['ios', 'android']);
    });

    it('fails on non-RN project', async () => {
      const result = await execute({ projectPath: '/tmp' });
      expect(result.ok).toBe(false);
    });

    it('returns MCP-compatible structure', async () => {
      const result = await execute({ projectPath: join(FIXTURES, 'valid-expo') });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data).toHaveProperty('project');
      expect(result.data).toHaveProperty('issues');
      expect(result.data).toHaveProperty('config');
      expect(result.data.project).toHaveProperty('name');
      expect(result.data.project).toHaveProperty('bundleId');
      expect(result.data.project).toHaveProperty('sdkVersion');
      expect(result.data.project).toHaveProperty('platforms');
      expect(result.data.project).toHaveProperty('workflow');
    });

    it('accepts custom bundle ID', async () => {
      const result = await execute({
        projectPath: join(FIXTURES, 'valid-expo'),
        bundleId: 'com.custom.app',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.project.bundleId).toBe('com.custom.app');
    });
  });
});
