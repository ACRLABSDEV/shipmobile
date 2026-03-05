/**
 * Tests for shipmobile reset command
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execute } from '../../src/core/reset.js';
import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let tmpDir: string;

describe('reset', () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shipmobile-reset-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should clear .shipmobile directory', async () => {
    const shipDir = join(tmpDir, '.shipmobile');
    await mkdir(shipDir, { recursive: true });
    await writeFile(join(shipDir, 'config.json'), '{}');

    const result = await execute({ projectPath: tmpDir });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cleared).toBe(true);
    }

    // Verify directory is gone
    await expect(stat(shipDir)).rejects.toThrow();
  });

  it('should handle non-existent .shipmobile gracefully', async () => {
    const result = await execute({ projectPath: tmpDir });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cleared).toBe(false);
      expect(result.data.message).toContain('Nothing to reset');
    }
  });

  it('should remove nested directories', async () => {
    const shipDir = join(tmpDir, '.shipmobile');
    await mkdir(join(shipDir, 'build-cache'), { recursive: true });
    await mkdir(join(shipDir, 'audit-history'), { recursive: true });
    await writeFile(join(shipDir, 'config.json'), '{}');
    await writeFile(join(shipDir, 'build-cache', 'latest.json'), '{}');

    const result = await execute({ projectPath: tmpDir });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cleared).toBe(true);
    }

    await expect(stat(shipDir)).rejects.toThrow();
  });
});
