/**
 * EAS Service — abstraction layer for EAS Build API interactions
 * Shells out to eas-cli or uses REST API. Fully mockable for testing.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type BuildPlatform = 'ios' | 'android';
export type BuildProfile = 'development' | 'preview' | 'production';
export type BuildPhase =
  | 'queued'
  | 'provisioning'
  | 'installing_dependencies'
  | 'building'
  | 'uploading'
  | 'finished'
  | 'errored'
  | 'canceled';

export interface EASBuildRequest {
  platform: BuildPlatform;
  profile: BuildProfile;
  projectDir: string;
  nonInteractive?: boolean;
}

export interface EASBuildInfo {
  id: string;
  platform: BuildPlatform;
  status: BuildPhase;
  profile: BuildProfile;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  artifacts?: {
    buildUrl?: string;
    applicationArchiveUrl?: string;
  };
  metrics?: {
    buildDuration?: number;
  };
  /** Estimated progress 0-100 */
  progress?: number;
  /** Queue position if queued */
  queuePosition?: number;
  /** Distribution type (e.g. 'internal', 'store') */
  distribution?: string;
}

export interface EASBuildLogEntry {
  timestamp: string;
  message: string;
  phase: string;
}

export interface EASService {
  triggerBuild(request: EASBuildRequest): Promise<EASBuildInfo>;
  getBuildStatus(buildId: string): Promise<EASBuildInfo>;
  getBuildLogs(buildId: string): Promise<EASBuildLogEntry[]>;
  listBuilds(projectDir: string, options?: { platform?: BuildPlatform; limit?: number }): Promise<EASBuildInfo[]>;
  cancelBuild(buildId: string): Promise<void>;
}

/**
 * Estimate progress based on build phase
 */
export function estimateProgress(phase: BuildPhase): number {
  switch (phase) {
    case 'queued': return 0;
    case 'provisioning': return 10;
    case 'installing_dependencies': return 30;
    case 'building': return 55;
    case 'uploading': return 85;
    case 'finished': return 100;
    case 'errored': return 100;
    case 'canceled': return 100;
    default: return 0;
  }
}

/**
 * Estimate remaining time in seconds based on phase
 */
export function estimateTimeRemaining(phase: BuildPhase, elapsedMs: number): number | null {
  const progress = estimateProgress(phase);
  if (progress <= 0 || progress >= 100) return null;
  // Simple linear estimate
  const totalEstimate = (elapsedMs / progress) * 100;
  return Math.max(0, Math.round((totalEstimate - elapsedMs) / 1000));
}

/**
 * Human-readable phase label
 */
export function phaseLabel(phase: BuildPhase): string {
  switch (phase) {
    case 'queued': return 'Queued';
    case 'provisioning': return 'Provisioning';
    case 'installing_dependencies': return 'Installing dependencies';
    case 'building': return 'Building';
    case 'uploading': return 'Uploading artifacts';
    case 'finished': return 'Complete';
    case 'errored': return 'Error';
    case 'canceled': return 'Canceled';
    default: return phase;
  }
}

/**
 * Parse EAS CLI JSON output for a build
 */
function parseBuildOutput(stdout: string, platform: BuildPlatform, profile: BuildProfile): EASBuildInfo {
  try {
    const data = JSON.parse(stdout);
    // EAS CLI --json returns an array or object depending on the command
    const build = Array.isArray(data) ? data[0] : data;
    return {
      id: build.id || build.buildId || 'unknown',
      platform,
      status: (build.status || 'queued').toLowerCase() as BuildPhase,
      profile,
      createdAt: build.createdAt || new Date().toISOString(),
      updatedAt: build.updatedAt || new Date().toISOString(),
      completedAt: build.completedAt,
      artifacts: build.artifacts ? {
        buildUrl: build.artifacts.buildUrl,
        applicationArchiveUrl: build.artifacts.applicationArchiveUrl,
      } : undefined,
      distribution: build.distribution,
    };
  } catch {
    // Try to extract build ID from non-JSON output
    const idMatch = stdout.match(/Build ID:\s*([a-f0-9-]+)/i) ||
                    stdout.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
    return {
      id: idMatch?.[1] || 'unknown',
      platform,
      status: 'queued',
      profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Real EAS service implementation that shells out to eas-cli
 */
export class RealEASService implements EASService {
  async triggerBuild(request: EASBuildRequest): Promise<EASBuildInfo> {
    const args = [
      'build',
      '--platform', request.platform,
      '--profile', request.profile,
      '--json',
      '--no-wait',
    ];

    if (request.nonInteractive !== false) {
      args.push('--non-interactive');
    }

    try {
      const { stdout } = await execFileAsync('eas', args, {
        cwd: request.projectDir,
        timeout: 120_000,
      });
      return parseBuildOutput(stdout, request.platform, request.profile);
    } catch (e: unknown) {
      const error = e as { stderr?: string; message?: string };
      if (error.stderr?.includes('Not logged in') || error.stderr?.includes('UNAUTHORIZED')) {
        throw new Error('EAS authentication failed. Run `shipmobile login --expo` first.');
      }
      throw new Error(`EAS build failed: ${error.stderr || error.message}`);
    }
  }

  async getBuildStatus(buildId: string): Promise<EASBuildInfo> {
    try {
      const { stdout } = await execFileAsync('eas', [
        'build:view', buildId, '--json',
      ], { timeout: 30_000 });
      const data = JSON.parse(stdout);
      return {
        id: data.id,
        platform: data.platform?.toLowerCase() as BuildPlatform,
        status: (data.status || 'queued').toLowerCase() as BuildPhase,
        profile: data.profile || 'production',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        completedAt: data.completedAt,
        error: data.error?.message,
        artifacts: data.artifacts,
        metrics: data.metrics,
        distribution: data.distribution,
      };
    } catch (e: unknown) {
      const error = e as { message?: string };
      throw new Error(`Failed to get build status: ${error.message}`);
    }
  }

  async getBuildLogs(buildId: string): Promise<EASBuildLogEntry[]> {
    try {
      const { stdout } = await execFileAsync('eas', [
        'build:view', buildId, '--json',
      ], { timeout: 30_000 });
      const data = JSON.parse(stdout);
      // EAS doesn't expose logs as structured data easily via CLI
      // Return what we can from the build data
      return (data.logs || []).map((l: { timestamp?: string; msg?: string; phase?: string }) => ({
        timestamp: l.timestamp || new Date().toISOString(),
        message: l.msg || '',
        phase: l.phase || 'unknown',
      }));
    } catch {
      return [];
    }
  }

  async listBuilds(projectDir: string, options?: { platform?: BuildPlatform; limit?: number }): Promise<EASBuildInfo[]> {
    const args = ['build:list', '--json', '--non-interactive'];
    if (options?.platform) args.push('--platform', options.platform);
    if (options?.limit) args.push('--limit', String(options.limit));

    try {
      const { stdout } = await execFileAsync('eas', args, {
        cwd: projectDir,
        timeout: 30_000,
      });
      const data = JSON.parse(stdout);
      const builds = Array.isArray(data) ? data : data.builds || [];
      return builds.map((b: Record<string, unknown>) => ({
        id: b.id as string,
        platform: ((b.platform as string) || 'ios').toLowerCase() as BuildPlatform,
        status: ((b.status as string) || 'queued').toLowerCase() as BuildPhase,
        profile: (b.profile as string) || 'production',
        createdAt: b.createdAt as string,
        updatedAt: b.updatedAt as string,
        completedAt: b.completedAt as string | undefined,
        artifacts: b.artifacts as EASBuildInfo['artifacts'],
        distribution: b.distribution as string | undefined,
      }));
    } catch {
      return [];
    }
  }

  async cancelBuild(buildId: string): Promise<void> {
    await execFileAsync('eas', ['build:cancel', buildId], { timeout: 30_000 });
  }
}

/**
 * Default global EAS service instance — can be replaced for testing
 */
let _easService: EASService = new RealEASService();

export function getEASService(): EASService {
  return _easService;
}

export function setEASService(service: EASService): void {
  _easService = service;
}

export function resetEASService(): void {
  _easService = new RealEASService();
}
