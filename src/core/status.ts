/**
 * status — check build status, progress, and history
 */

import { ok, err, type Result } from '../utils/result.js';
import {
  getEASService,
  estimateProgress,
  estimateTimeRemaining,
  phaseLabel,
  type BuildPlatform,
  type BuildPhase,
  type EASBuildInfo,
  type EASBuildLogEntry,
} from '../services/eas.js';
import { getLatestBuildIds, getCachedBuild } from './build.js';

export interface StatusInput {
  projectPath?: string;
  buildId?: string;
  logs?: boolean;
  history?: boolean;
  platform?: BuildPlatform;
}

export interface BuildStatusInfo {
  id: string;
  platform: BuildPlatform;
  profile: string;
  phase: BuildPhase;
  phaseLabel: string;
  progress: number;
  startedAt: string;
  elapsedMs: number;
  estimatedRemaining: number | null;
  artifacts?: {
    buildUrl?: string;
    applicationArchiveUrl?: string;
  };
  error?: string;
  distribution?: string;
  isComplete: boolean;
  isError: boolean;
}

export interface StatusResult {
  builds: BuildStatusInfo[];
  logs?: EASBuildLogEntry[];
  history?: HistoryEntry[];
}

export interface HistoryEntry {
  id: string;
  platform: BuildPlatform;
  profile: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  duration?: number;
}

function toBuildStatus(info: EASBuildInfo): BuildStatusInfo {
  const startedAt = info.createdAt;
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const progress = info.progress ?? estimateProgress(info.status);
  const remaining = estimateTimeRemaining(info.status, elapsedMs);

  return {
    id: info.id,
    platform: info.platform,
    profile: info.profile,
    phase: info.status,
    phaseLabel: phaseLabel(info.status),
    progress,
    startedAt,
    elapsedMs,
    estimatedRemaining: remaining,
    artifacts: info.artifacts,
    error: info.error,
    distribution: info.distribution,
    isComplete: info.status === 'finished',
    isError: info.status === 'errored' || info.status === 'canceled',
  };
}

export async function execute(input: StatusInput = {}): Promise<Result<StatusResult>> {
  const projectDir = input.projectPath || process.cwd();
  const eas = getEASService();

  // History mode
  if (input.history) {
    try {
      const builds = await eas.listBuilds(projectDir, {
        platform: input.platform,
        limit: 20,
      });

      const history: HistoryEntry[] = builds.map(b => ({
        id: b.id,
        platform: b.platform,
        profile: b.profile,
        status: b.status,
        createdAt: b.createdAt,
        completedAt: b.completedAt,
        duration: b.metrics?.buildDuration,
      }));

      return ok({ builds: [], history });
    } catch (e: unknown) {
      return err('STATUS_HISTORY_ERROR', `Failed to fetch build history: ${(e as Error).message}`);
    }
  }

  // Specific build or latest
  const buildIds: string[] = [];

  if (input.buildId) {
    buildIds.push(input.buildId);
  } else {
    // Get latest builds from cache
    const latest = await getLatestBuildIds(projectDir);
    if (Object.keys(latest).length === 0) {
      // Fallback: fetch recent builds directly from EAS when cache is missing/stale
      try {
        const recent = await eas.listBuilds(projectDir, { platform: input.platform, limit: 5 });
        if (recent.length === 0) {
          return err(
            'NO_BUILDS',
            'No builds found. Run `shipmobile build` first.',
            'info',
            'Start a build with `shipmobile build`',
          );
        }
        const ids = Array.from(new Set(recent.map((b) => b.id))).filter(Boolean);
        buildIds.push(...ids);
      } catch {
        return err(
          'NO_BUILDS',
          'No builds found. Run `shipmobile build` first.',
          'info',
          'Start a build with `shipmobile build`',
        );
      }
    } else {
      const ids = input.platform
        ? [latest[input.platform]].filter(Boolean) as string[]
        : Object.values(latest);
      buildIds.push(...ids);
    }
  }

  const builds: BuildStatusInfo[] = [];
  let logs: EASBuildLogEntry[] | undefined;

  for (const id of buildIds) {
    try {
      const info = await eas.getBuildStatus(id);
      builds.push(toBuildStatus(info));

      // Fetch logs if requested (only for specific build or first build)
      if (input.logs && !logs) {
        logs = await eas.getBuildLogs(id);
      }
    } catch {
      // Try cached build data
      const cached = await getCachedBuild(projectDir, id);
      if (cached) {
        builds.push(toBuildStatus(cached));
      }
    }
  }

  if (builds.length === 0) {
    return err('STATUS_ERROR', 'Could not fetch status for any builds.');
  }

  return ok({ builds, logs });
}
