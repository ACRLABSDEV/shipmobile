/**
 * reset — clear all local ShipMobile config and start fresh
 */

import { join } from 'node:path';
import { rm, stat } from 'node:fs/promises';
import { ok, err, type Result } from '../utils/result.js';

export interface ResetResult {
  cleared: boolean;
  path: string;
  message: string;
}

export interface ResetOptions {
  projectPath?: string;
  force?: boolean;
}

export async function execute(options: ResetOptions = {}): Promise<Result<ResetResult>> {
  const projectDir = options.projectPath ?? process.cwd();
  const configDir = join(projectDir, '.shipmobile');

  // Check if .shipmobile exists
  try {
    const s = await stat(configDir);
    if (!s.isDirectory()) {
      return err(
        'RESET_NOT_DIR',
        `.shipmobile exists but is not a directory at: ${configDir}`,
        'critical',
        'Remove the file manually and run `shipmobile init` to start fresh.',
      );
    }
  } catch {
    return ok({
      cleared: false,
      path: configDir,
      message: 'No .shipmobile directory found. Nothing to reset.',
    });
  }

  // Remove the directory
  try {
    await rm(configDir, { recursive: true, force: true });
    return ok({
      cleared: true,
      path: configDir,
      message: 'All ShipMobile configuration cleared. Run `shipmobile init` to start fresh.',
    });
  } catch (e) {
    return err(
      'RESET_FAILED',
      `Failed to remove .shipmobile directory: ${e instanceof Error ? e.message : String(e)}`,
      'critical',
      'Try removing the directory manually: rm -rf .shipmobile',
    );
  }
}
