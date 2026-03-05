/**
 * submit — submit builds to App Store Connect and Google Play Store
 */

import { join } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { ok, err, type Result } from '../utils/result.js';
import { getAppStoreService, type AppStoreSubmission, type AppStoreMetadata } from '../services/appstore.js';
import { getPlayStoreService, type PlayStoreSubmission, type PlayStoreTrack, type PlayStoreMetadata } from '../services/playstore.js';

export type SubmitPlatform = 'ios' | 'android';

export interface SubmitOptions {
  projectPath?: string;
  platform?: SubmitPlatform;
  track?: PlayStoreTrack;
  skipPreflight?: boolean;
}

export interface PreflightCheck {
  name: string;
  passed: boolean;
  message: string;
  severity: 'critical' | 'warning';
}

export interface SubmitResult {
  platform: SubmitPlatform | 'both';
  preflight: PreflightCheck[];
  preflightPassed: boolean;
  ios?: AppStoreSubmission;
  android?: PlayStoreSubmission;
}

interface BuildCacheEntry {
  id: string;
  platform: string;
  status: string;
  artifacts?: {
    buildUrl?: string;
    applicationArchiveUrl?: string;
  };
}

interface PrepareMetadata {
  appName?: { value?: string };
  description?: { value?: string };
  keywords?: { value?: string[] };
  subtitle?: { value?: string };
  category?: { value?: string };
  version?: { value?: string };
}

/**
 * Run pre-flight checks before submission
 */
export async function runPreflight(projectDir: string, platform?: SubmitPlatform): Promise<PreflightCheck[]> {
  const checks: PreflightCheck[] = [];

  // Check 1: Build exists and is successful
  const buildCacheDir = join(projectDir, '.shipmobile', 'build-cache');
  try {
    const latestPath = join(buildCacheDir, 'latest.json');
    const latestRaw = await readFile(latestPath, 'utf-8');
    const latest: Record<string, string> = JSON.parse(latestRaw);

    const platforms: SubmitPlatform[] = platform ? [platform] : ['ios', 'android'];
    for (const p of platforms) {
      const buildId = latest[p];
      if (!buildId) {
        checks.push({
          name: `build-exists-${p}`,
          passed: false,
          message: `No ${p} build found. Run \`shipmobile build --platform ${p}\` first.`,
          severity: 'critical',
        });
        continue;
      }

      try {
        const buildPath = join(buildCacheDir, `${buildId}.json`);
        const buildRaw = await readFile(buildPath, 'utf-8');
        const buildData: BuildCacheEntry = JSON.parse(buildRaw);

        if (buildData.status !== 'finished') {
          checks.push({
            name: `build-successful-${p}`,
            passed: false,
            message: `${p} build "${buildId}" has status "${buildData.status}". Need a successful build.`,
            severity: 'critical',
          });
        } else {
          checks.push({
            name: `build-successful-${p}`,
            passed: true,
            message: `${p} build "${buildId}" is successful.`,
            severity: 'critical',
          });
        }
      } catch {
        checks.push({
          name: `build-exists-${p}`,
          passed: false,
          message: `Cannot read build data for ${p} build "${buildId}".`,
          severity: 'critical',
        });
      }
    }
  } catch {
    checks.push({
      name: 'build-cache',
      passed: false,
      message: 'No build cache found. Run `shipmobile build` first.',
      severity: 'critical',
    });
  }

  // Check 2: Metadata exists
  const metadataPath = join(projectDir, '.shipmobile', 'metadata.json');
  try {
    const metaRaw = await readFile(metadataPath, 'utf-8');
    const meta: PrepareMetadata = JSON.parse(metaRaw);

    // Required fields
    const requiredFields = ['appName', 'description'] as const;
    for (const field of requiredFields) {
      const value = meta[field]?.value;
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        checks.push({
          name: `metadata-${field}`,
          passed: false,
          message: `Missing required metadata field: ${field}. Run \`shipmobile prepare\` to generate.`,
          severity: 'critical',
        });
      } else {
        checks.push({
          name: `metadata-${field}`,
          passed: true,
          message: `Metadata field "${field}" is present.`,
          severity: 'critical',
        });
      }
    }
  } catch {
    checks.push({
      name: 'metadata-exists',
      passed: false,
      message: 'No metadata found. Run `shipmobile prepare` to generate app store metadata.',
      severity: 'critical',
    });
  }

  // Check 3: Assets valid (icon exists)
  try {
    await stat(join(projectDir, 'assets', 'icon.png'));
    checks.push({
      name: 'assets-icon',
      passed: true,
      message: 'App icon found.',
      severity: 'warning',
    });
  } catch {
    checks.push({
      name: 'assets-icon',
      passed: false,
      message: 'App icon not found at assets/icon.png. Run `shipmobile assets` to set up.',
      severity: 'warning',
    });
  }

  // Check 4: Credentials exist
  try {
    const credsPath = join(projectDir, '.shipmobile', 'credentials.json');
    const credsRaw = await readFile(credsPath, 'utf-8');
    const creds = JSON.parse(credsRaw);

    if ((!platform || platform === 'ios') && !creds.apple?.validated) {
      checks.push({
        name: 'credentials-apple',
        passed: false,
        message: 'Apple credentials not configured. Run `shipmobile login --apple`.',
        severity: 'critical',
      });
    } else if (!platform || platform === 'ios') {
      checks.push({
        name: 'credentials-apple',
        passed: true,
        message: 'Apple credentials configured.',
        severity: 'critical',
      });
    }

    if ((!platform || platform === 'android') && !creds.google?.validated) {
      checks.push({
        name: 'credentials-google',
        passed: false,
        message: 'Google Play credentials not configured. Run `shipmobile login --google`.',
        severity: 'critical',
      });
    } else if (!platform || platform === 'android') {
      checks.push({
        name: 'credentials-google',
        passed: true,
        message: 'Google Play credentials configured.',
        severity: 'critical',
      });
    }
  } catch {
    checks.push({
      name: 'credentials',
      passed: false,
      message: 'No credentials found. Run `shipmobile login` to authenticate.',
      severity: 'critical',
    });
  }

  return checks;
}

function loadMetadataForAppStore(meta: PrepareMetadata, version: string): AppStoreMetadata {
  return {
    appName: meta.appName?.value ?? '',
    description: meta.description?.value ?? '',
    keywords: meta.keywords?.value,
    subtitle: meta.subtitle?.value,
    category: meta.category?.value,
    version,
  };
}

function loadMetadataForPlayStore(meta: PrepareMetadata, version: string): PlayStoreMetadata {
  return {
    title: meta.appName?.value ?? '',
    shortDescription: (meta.description?.value ?? '').slice(0, 80),
    fullDescription: meta.description?.value ?? '',
    category: meta.category?.value,
    version,
  };
}

export async function execute(options: SubmitOptions = {}): Promise<Result<SubmitResult>> {
  const projectDir = options.projectPath ?? process.cwd();
  const platform = options.platform;
  const track = options.track ?? 'production';

  // Run preflight checks
  const preflight = options.skipPreflight ? [] : await runPreflight(projectDir, platform);
  const criticalFailures = preflight.filter(c => !c.passed && c.severity === 'critical');
  const preflightPassed = criticalFailures.length === 0;

  if (!preflightPassed && !options.skipPreflight) {
    const failureMessages = criticalFailures.map(c => c.message).join('\n');
    return err(
      'PREFLIGHT_FAILED',
      `Pre-flight checks failed:\n${failureMessages}`,
      'critical',
      'Fix the above issues and try again, or use --skip-preflight to bypass.',
    );
  }

  // Load metadata
  let metadata: PrepareMetadata = {};
  try {
    const metadataPath = join(projectDir, '.shipmobile', 'metadata.json');
    metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
  } catch {
    // Metadata might not exist if preflight was skipped
  }

  // Load version from config or app.json
  let version = '1.0.0';
  try {
    const configRaw = await readFile(join(projectDir, '.shipmobile', 'config.json'), 'utf-8');
    const config = JSON.parse(configRaw);
    version = config.version ?? version;
  } catch {
    try {
      const appJsonRaw = await readFile(join(projectDir, 'app.json'), 'utf-8');
      const appJson = JSON.parse(appJsonRaw);
      version = appJson.expo?.version ?? appJson.version ?? version;
    } catch {
      // use default
    }
  }

  // Load build info
  let latestBuilds: Record<string, string> = {};
  try {
    const latestPath = join(projectDir, '.shipmobile', 'build-cache', 'latest.json');
    latestBuilds = JSON.parse(await readFile(latestPath, 'utf-8'));
  } catch {
    // No builds cached
  }

  const result: SubmitResult = {
    platform: platform ?? 'both',
    preflight,
    preflightPassed,
  };

  // Submit to App Store
  if (!platform || platform === 'ios') {
    const buildId = latestBuilds['ios'];
    if (buildId) {
      try {
        const buildPath = join(projectDir, '.shipmobile', 'build-cache', `${buildId}.json`);
        const buildData: BuildCacheEntry = JSON.parse(await readFile(buildPath, 'utf-8'));
        const ipaPath = buildData.artifacts?.applicationArchiveUrl ?? '';
        const appStoreService = getAppStoreService();
        const appStoreMeta = loadMetadataForAppStore(metadata, version);

        const submission = await appStoreService.uploadBuild(ipaPath, appStoreMeta.appName);
        await appStoreService.setMetadata(submission.appId, appStoreMeta);
        const finalSubmission = await appStoreService.submitForReview(submission.appId, version);
        result.ios = finalSubmission;
      } catch (e) {
        return err(
          'APPSTORE_SUBMIT_FAILED',
          `App Store submission failed: ${e instanceof Error ? e.message : String(e)}`,
          'critical',
          'Check your Apple credentials and try again. Run `shipmobile login --apple` to re-authenticate.',
        );
      }
    }
  }

  // Submit to Google Play
  if (!platform || platform === 'android') {
    const buildId = latestBuilds['android'];
    if (buildId) {
      try {
        const buildPath = join(projectDir, '.shipmobile', 'build-cache', `${buildId}.json`);
        const buildData: BuildCacheEntry = JSON.parse(await readFile(buildPath, 'utf-8'));
        const aabPath = buildData.artifacts?.applicationArchiveUrl ?? '';
        const playStoreService = getPlayStoreService();
        const playMeta = loadMetadataForPlayStore(metadata, version);

        const configRaw = await readFile(join(projectDir, '.shipmobile', 'config.json'), 'utf-8').catch(() => '{}');
        const config = JSON.parse(configRaw);
        const packageName = config.google?.packageName ?? config.bundleId ?? '';

        const submission = await playStoreService.uploadBundle(aabPath, packageName);
        await playStoreService.setListing(packageName, playMeta);
        const finalSubmission = await playStoreService.submitToTrack(packageName, track, submission.versionCode);
        result.android = finalSubmission;
      } catch (e) {
        return err(
          'PLAYSTORE_SUBMIT_FAILED',
          `Google Play submission failed: ${e instanceof Error ? e.message : String(e)}`,
          'critical',
          'Check your Google Play credentials and try again. Run `shipmobile login --google` to re-authenticate.',
        );
      }
    }
  }

  return ok(result);
}
