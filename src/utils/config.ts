/**
 * .shipmobile/ config directory management
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ok, err, type Result } from './result.js';

const CONFIG_DIR = '.shipmobile';
const CONFIG_FILE = 'config.json';
const CREDENTIALS_FILE = 'credentials.json';

export interface ShipMobileConfig {
  projectName?: string;
  expo?: { projectId?: string; slug?: string };
  apple?: { teamId?: string; bundleId?: string };
  google?: { packageName?: string };
}

export interface ShipMobileCredentials {
  expo?: { token?: string };
  apple?: { apiKeyId?: string; issuerId?: string };
  google?: { serviceAccountPath?: string };
}

function configDir(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_DIR);
}

async function ensureDir(cwd?: string): Promise<void> {
  await mkdir(configDir(cwd), { recursive: true });
}

export async function readConfig(cwd?: string): Promise<Result<ShipMobileConfig>> {
  try {
    const raw = await readFile(join(configDir(cwd), CONFIG_FILE), 'utf-8');
    return ok(JSON.parse(raw) as ShipMobileConfig);
  } catch {
    return ok({});
  }
}

export async function writeConfig(
  config: ShipMobileConfig,
  cwd?: string,
): Promise<Result<void>> {
  try {
    await ensureDir(cwd);
    await writeFile(join(configDir(cwd), CONFIG_FILE), JSON.stringify(config, null, 2));
    return ok(undefined);
  } catch (e) {
    return err('CONFIG_WRITE_ERROR', `Failed to write config: ${e}`);
  }
}

export async function readCredentials(cwd?: string): Promise<Result<ShipMobileCredentials>> {
  try {
    const raw = await readFile(join(configDir(cwd), CREDENTIALS_FILE), 'utf-8');
    return ok(JSON.parse(raw) as ShipMobileCredentials);
  } catch {
    return ok({});
  }
}

export async function writeCredentials(
  credentials: ShipMobileCredentials,
  cwd?: string,
): Promise<Result<void>> {
  try {
    await ensureDir(cwd);
    await writeFile(join(configDir(cwd), CREDENTIALS_FILE), JSON.stringify(credentials, null, 2));
    return ok(undefined);
  } catch (e) {
    return err('CREDENTIALS_WRITE_ERROR', `Failed to write credentials: ${e}`);
  }
}
