/**
 * build — trigger EAS builds with pre-build validation
 */

import { join } from 'node:path';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { ok, err, type Result } from '../utils/result.js';
import { execute as runDoctor } from './doctor.js';
import {
  getEASService,
  estimateTimeRemaining,
  type BuildPlatform,
  type BuildProfile,
  type EASBuildInfo,
} from '../services/eas.js';

export interface BuildInput {
  projectPath?: string;
  platforms?: BuildPlatform[];
  profile?: BuildProfile;
  wait?: boolean;
  skipValidation?: boolean;
}

export interface BuildResult {
  builds: BuildInfo[];
  validated: boolean;
  validationIssues: string[];
}

export interface BuildInfo {
  id: string;
  platform: BuildPlatform;
  profile: BuildProfile;
  status: string;
  estimatedTime?: number;
  artifacts?: {
    buildUrl?: string;
    applicationArchiveUrl?: string;
  };
  error?: string;
}

const BUILD_CACHE_DIR = '.shipmobile/build-cache';

async function saveBuildMetadata(projectDir: string, buildInfo: EASBuildInfo): Promise<void> {
  const cacheDir = join(projectDir, BUILD_CACHE_DIR);
  await mkdir(cacheDir, { recursive: true });

  // Save individual build
  await writeFile(
    join(cacheDir, `${buildInfo.id}.json`),
    JSON.stringify(buildInfo, null, 2),
  );

  // Update latest builds index
  const indexPath = join(cacheDir, 'latest.json');
  let index: Record<string, string> = {};
  try {
    index = JSON.parse(await readFile(indexPath, 'utf-8'));
  } catch {
    // Fresh index
  }
  index[buildInfo.platform] = buildInfo.id;
  await writeFile(indexPath, JSON.stringify(index, null, 2));
}

export async function getLatestBuildIds(projectDir: string): Promise<Record<string, string>> {
  try {
    const indexPath = join(projectDir, BUILD_CACHE_DIR, 'latest.json');
    return JSON.parse(await readFile(indexPath, 'utf-8'));
  } catch {
    return {};
  }
}

export async function getCachedBuild(projectDir: string, buildId: string): Promise<EASBuildInfo | null> {
  try {
    const path = join(projectDir, BUILD_CACHE_DIR, `${buildId}.json`);
    return JSON.parse(await readFile(path, 'utf-8'));
  } catch {
    return null;
  }
}

export async function execute(input: BuildInput = {}): Promise<Result<BuildResult>> {
  const projectDir = input.projectPath || process.cwd();
  const platforms: BuildPlatform[] = input.platforms || ['ios', 'android'];
  const profile: BuildProfile = input.profile || 'production';
  const validationIssues: string[] = [];
  let validated = false;

  // Pre-build validation
  if (!input.skipValidation) {
    const doctorResult = await runDoctor({ projectPath: input.projectPath });
    if (doctorResult.ok) {
      validated = true;
      const criticals = doctorResult.data.critical;
      if (criticals.length > 0) {
        return err(
          'BUILD_VALIDATION_FAILED',
          `Pre-build validation found ${criticals.length} critical issue(s)`,
          'critical',
          `Run \`shipmobile doctor\` for details, then fix critical issues before building.`,
        );
      }
      // Collect warnings
      for (const w of doctorResult.data.warnings) {
        validationIssues.push(w.message);
      }
    }
  }

  const eas = getEASService();
  const builds: BuildInfo[] = [];

  // Trigger builds for each platform
  for (const platform of platforms) {
    try {
      const buildInfo = await eas.triggerBuild({
        platform,
        profile,
        projectDir,
        nonInteractive: true,
      });

      // Persist build metadata
      await saveBuildMetadata(projectDir, buildInfo);

      const elapsed = 0;
      const eta = estimateTimeRemaining(buildInfo.status, elapsed);

      builds.push({
        id: buildInfo.id,
        platform,
        profile,
        status: buildInfo.status,
        estimatedTime: eta ?? undefined,
        artifacts: buildInfo.artifacts,
        error: buildInfo.error,
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
      builds.push({
        id: 'failed',
        platform,
        profile,
        status: 'errored',
        error: error.message,
      });
    }
  }

  // If --wait, poll until all builds complete
  if (input.wait) {
    const pendingIds = builds.filter(b => b.status !== 'errored' && b.status !== 'finished' && b.id !== 'failed').map(b => b.id);

    for (const id of pendingIds) {
      let attempts = 0;
      const maxAttempts = 180; // 30 min at 10s intervals

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10_000));
        attempts++;

        try {
          const status = await eas.getBuildStatus(id);
          await saveBuildMetadata(projectDir, status);

          const build = builds.find(b => b.id === id);
          if (build) {
            build.status = status.status;
            build.artifacts = status.artifacts;
            build.error = status.error;
          }

          if (status.status === 'finished' || status.status === 'errored' || status.status === 'canceled') {
            break;
          }
        } catch {
          // Continue polling on transient errors
        }
      }
    }
  }

  return ok({ builds, validated, validationIssues });
}
