/**
 * update — publish OTA updates via EAS Update
 */

import { join } from 'node:path';
import { readFile, stat, readdir } from 'node:fs/promises';
import { ok, err, type Result } from '../utils/result.js';
import { getEASUpdateService, type UpdateChannel, type UpdatePlatform, type EASUpdatePublishResult } from '../services/eas-update.js';

export interface UpdateOptions {
  projectPath?: string;
  channel?: UpdateChannel;
  message?: string;
  platform?: UpdatePlatform;
  branch?: string;
  nonInteractive?: boolean;
}

export interface NativeChangeDetection {
  hasNativeChanges: boolean;
  changes: string[];
}

export interface UpdateResult {
  published: boolean;
  nativeCheck: NativeChangeDetection;
  update?: EASUpdatePublishResult;
  channel: string;
  platform: string;
}

/**
 * Native change indicators that require a full rebuild
 */
const NATIVE_CONFIG_KEYS = [
  'plugins',
  'ios.infoPlist',
  'ios.entitlements',
  'ios.buildNumber',
  'android.permissions',
  'android.versionCode',
  'android.googleServicesFile',
  'ios.googleServicesFile',
  'ios.associatedDomains',
  'android.intentFilters',
];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Detect if there are native changes that require a full rebuild
 */
export async function detectNativeChanges(projectDir: string): Promise<NativeChangeDetection> {
  const changes: string[] = [];

  // Check if ios/ or android/ directories exist (ejected or have native code)
  for (const dir of ['ios', 'android']) {
    try {
      const s = await stat(join(projectDir, dir));
      if (s.isDirectory()) {
        changes.push(`Native ${dir}/ directory exists — changes here require a full build`);
      }
    } catch {
      // Directory doesn't exist, that's fine
    }
  }

  // Check app.json / app.config.js for native config changes
  try {
    const appJsonPath = join(projectDir, 'app.json');
    const raw = await readFile(appJsonPath, 'utf-8');
    const appJson = JSON.parse(raw);
    const expo = appJson.expo || appJson;

    // Check for config plugins (require native rebuild)
    if (expo.plugins && Array.isArray(expo.plugins) && expo.plugins.length > 0) {
      changes.push(`Config plugins detected (${expo.plugins.length} plugins) — changes to plugins require a full build`);
    }

    // Check native config keys against cached version
    const cachedConfigPath = join(projectDir, '.shipmobile', 'last-update-config.json');
    try {
      const cachedRaw = await readFile(cachedConfigPath, 'utf-8');
      const cachedConfig = JSON.parse(cachedRaw);

      for (const key of NATIVE_CONFIG_KEYS) {
        const current = JSON.stringify(getNestedValue(expo, key));
        const cached = JSON.stringify(getNestedValue(cachedConfig, key));
        if (current !== cached) {
          changes.push(`Native config changed: ${key}`);
        }
      }
    } catch {
      // No cached config — first update, no comparison possible
    }
  } catch {
    // No app.json
  }

  // Check for new native modules in package.json
  try {
    const pkgPath = join(projectDir, 'package.json');
    const pkgRaw = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const nativeModuleIndicators = ['react-native-', '@react-native/', 'expo-'];
    const cachedDepsPath = join(projectDir, '.shipmobile', 'last-update-deps.json');

    try {
      const cachedDepsRaw = await readFile(cachedDepsPath, 'utf-8');
      const cachedDeps: Record<string, string> = JSON.parse(cachedDepsRaw);

      for (const [name, version] of Object.entries(deps)) {
        if (nativeModuleIndicators.some(i => name.startsWith(i))) {
          if (!cachedDeps[name]) {
            changes.push(`New native module: ${name}@${version}`);
          } else if (cachedDeps[name] !== version) {
            changes.push(`Native module version changed: ${name} (${cachedDeps[name]} → ${version})`);
          }
        }
      }
    } catch {
      // No cached deps
    }
  } catch {
    // No package.json
  }

  return {
    hasNativeChanges: changes.length > 0,
    changes,
  };
}

/**
 * Save current config snapshot for future comparisons
 */
async function saveConfigSnapshot(projectDir: string): Promise<void> {
  const { mkdir, writeFile: write } = await import('node:fs/promises');
  const shipmobileDir = join(projectDir, '.shipmobile');
  await mkdir(shipmobileDir, { recursive: true });

  // Save app.json native config
  try {
    const appJsonRaw = await readFile(join(projectDir, 'app.json'), 'utf-8');
    const appJson = JSON.parse(appJsonRaw);
    const expo = appJson.expo || appJson;
    await write(join(shipmobileDir, 'last-update-config.json'), JSON.stringify(expo, null, 2));
  } catch {
    // ok
  }

  // Save dependencies snapshot
  try {
    const pkgRaw = await readFile(join(projectDir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    await write(join(shipmobileDir, 'last-update-deps.json'), JSON.stringify(deps, null, 2));
  } catch {
    // ok
  }
}

export async function execute(options: UpdateOptions = {}): Promise<Result<UpdateResult>> {
  const projectDir = options.projectPath || process.cwd();
  const channel = options.channel || 'production';
  const platform = options.platform || 'all';

  // Detect native changes
  const nativeCheck = await detectNativeChanges(projectDir);

  if (nativeCheck.hasNativeChanges && !options.nonInteractive) {
    // In interactive mode, we still proceed but warn. The CLI layer handles the prompt.
    // In non-interactive mode with native changes, we warn but continue.
  }

  // Publish the update
  const service = getEASUpdateService();

  try {
    const update = await service.publishUpdate({
      projectDir,
      channel,
      message: options.message,
      platform,
      branch: options.branch,
      nonInteractive: options.nonInteractive,
    });

    // Save config snapshot for future change detection
    await saveConfigSnapshot(projectDir);

    return ok({
      published: true,
      nativeCheck,
      update,
      channel,
      platform,
    });
  } catch (e: unknown) {
    const error = e as Error;
    const isAuthError = error.message.includes('authentication') || error.message.includes('UNAUTHORIZED') || error.message.includes('Not logged in');
    if (isAuthError) {
      return err(
        'EAS_AUTH_ERROR',
        error.message,
        'critical',
        'Run `shipmobile login --expo` to authenticate with EAS.',
      );
    }
    return err(
      'UPDATE_FAILED',
      `OTA update failed: ${error.message}`,
      'critical',
      'Check your EAS configuration and try again.',
    );
  }
}
