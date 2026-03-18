/**
 * .shipmobile/ config directory management
 */

import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { ok, err, type Result } from './result.js';
import { encrypt, decrypt } from './crypto.js';

const CONFIG_DIR = '.shipmobile';
const CONFIG_FILE = 'config.json';
const CREDENTIALS_FILE = 'credentials.json';

export interface ShipMobileConfig {
  projectName?: string;
  bundleId?: string;
  version?: string;
  sdkVersion?: string;
  platforms?: string[];
  workflow?: 'expo-managed' | 'expo-bare' | 'react-native-cli';
  expo?: { projectId?: string; slug?: string };
  apple?: { teamId?: string; bundleId?: string };
  google?: { packageName?: string };
}

export interface CredentialData {
  expo?: {
    token?: string;
    username?: string;
    plan?: string;
    validated?: boolean;
    validatedAt?: string;
  };
  apple?: {
    apiKeyId?: string;
    issuerId?: string;
    keyPath?: string;
    teamName?: string;
    validated?: boolean;
    validatedAt?: string;
  };
  google?: {
    serviceAccountPath?: string;
    projectId?: string;
    validated?: boolean;
    validatedAt?: string;
  };
}

// Keep backward compat
export type ShipMobileCredentials = CredentialData;

function configDir(cwd: string = process.cwd()): string {
  return join(cwd, CONFIG_DIR);
}

async function ensureDir(cwd?: string): Promise<void> {
  const dir = configDir(cwd);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  // Best-effort hardening for existing dirs created with looser perms
  try { await chmod(dir, 0o700); } catch { /* ignore */ }
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

export async function readCredentials(cwd?: string): Promise<Result<CredentialData>> {
  try {
    const raw = await readFile(join(configDir(cwd), CREDENTIALS_FILE), 'utf-8');
    const parsed = JSON.parse(raw) as { encrypted?: string; data?: CredentialData };
    if (parsed.encrypted) {
      const decrypted = decrypt(parsed.encrypted);
      return ok(JSON.parse(decrypted) as CredentialData);
    }
    // Legacy unencrypted format
    return ok(parsed as unknown as CredentialData);
  } catch {
    return ok({});
  }
}

export async function writeCredentials(
  credentials: CredentialData,
  cwd?: string,
): Promise<Result<void>> {
  try {
    await ensureDir(cwd);
    const encrypted = encrypt(JSON.stringify(credentials));
    await writeFile(
      join(configDir(cwd), CREDENTIALS_FILE),
      JSON.stringify({ encrypted, _note: 'Encrypted at rest. Do not edit manually.' }, null, 2),
      { mode: 0o600 },
    );
    return ok(undefined);
  } catch (e) {
    return err('CREDENTIALS_WRITE_ERROR', `Failed to write credentials: ${e}`);
  }
}
