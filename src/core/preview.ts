/**
 * preview — generate shareable preview links and QR codes
 */

import { ok, err, type Result } from '../utils/result.js';
import { getEASService, type BuildPlatform, type EASBuildInfo } from '../services/eas.js';
import { getLatestBuildIds, getCachedBuild } from './build.js';

export interface PreviewInput {
  projectPath?: string;
  buildId?: string;
  platform?: BuildPlatform;
}

export interface PreviewLink {
  platform: BuildPlatform;
  type: 'testflight' | 'apk' | 'aab' | 'internal-track' | 'eas-artifact';
  url: string;
  label: string;
  expiresAt?: string;
}

export interface PreviewResult {
  previews: PreviewLink[];
  buildId?: string;
  qrData: string[];
}

/**
 * Generate preview URLs from a completed build
 */
function generatePreviewLinks(build: EASBuildInfo): PreviewLink[] {
  const links: PreviewLink[] = [];

  if (build.platform === 'ios') {
    // For iOS, TestFlight link if available, otherwise artifact URL
    if (build.artifacts?.applicationArchiveUrl) {
      links.push({
        platform: 'ios',
        type: 'eas-artifact',
        url: build.artifacts.applicationArchiveUrl,
        label: 'iOS Build Artifact (IPA)',
      });
    }
    if (build.artifacts?.buildUrl) {
      links.push({
        platform: 'ios',
        type: 'eas-artifact',
        url: build.artifacts.buildUrl,
        label: 'iOS Build (EAS)',
      });
    }
    // If distribution is internal, this is likely for TestFlight/internal testing
    if (build.distribution === 'internal' && build.artifacts?.buildUrl) {
      links.push({
        platform: 'ios',
        type: 'testflight',
        url: build.artifacts.buildUrl,
        label: 'iOS Internal Distribution',
      });
    }
  }

  if (build.platform === 'android') {
    if (build.artifacts?.applicationArchiveUrl) {
      // Check if it's APK or AAB based on URL
      const isApk = build.artifacts.applicationArchiveUrl.includes('.apk');
      links.push({
        platform: 'android',
        type: isApk ? 'apk' : 'aab',
        url: build.artifacts.applicationArchiveUrl,
        label: isApk ? 'Android APK Download' : 'Android AAB Download',
      });
    }
    if (build.artifacts?.buildUrl) {
      links.push({
        platform: 'android',
        type: 'eas-artifact',
        url: build.artifacts.buildUrl,
        label: 'Android Build (EAS)',
      });
    }
  }

  return links;
}

/**
 * Generate a real, scannable QR code for terminal display.
 * Uses the `qrcode` package to produce a proper QR code rendered
 * with Unicode block characters (compact: 2 rows per line).
 */
export async function generateQRCode(data: string): Promise<string> {
  const { toString } = await import('qrcode');
  // toString with 'utf8' type renders a scannable QR using Unicode half-blocks
  const qr = await toString(data, {
    type: 'terminal',
    small: true,
    errorCorrectionLevel: 'M',
    margin: 1,
  });
  return qr.trimEnd();
}

export async function execute(input: PreviewInput = {}): Promise<Result<PreviewResult>> {
  const projectDir = input.projectPath || process.cwd();
  const eas = getEASService();

  // Find build(s) to preview
  const buildIds: string[] = [];

  if (input.buildId) {
    buildIds.push(input.buildId);
  } else {
    const latest = await getLatestBuildIds(projectDir);
    if (Object.keys(latest).length === 0) {
      // Fallback: query EAS directly for recent finished builds when local cache is missing
      try {
        const recent = await eas.listBuilds(projectDir, { platform: input.platform, limit: 10 });
        const finished = recent.filter((b) => b.status === 'finished');
        if (finished.length === 0) {
          return err(
            'NO_BUILDS',
            'No completed builds found.',
            'critical',
            'Run `shipmobile build` first, then `shipmobile preview`.',
          );
        }

        if (input.platform) {
          const match = finished.find((b) => b.platform === input.platform);
          if (!match) return err('NO_BUILD_FOR_PLATFORM', `No build found for ${input.platform}.`);
          buildIds.push(match.id);
        } else {
          // One latest finished build per platform
          const byPlatform = new Map<BuildPlatform, string>();
          for (const b of finished) {
            if (!byPlatform.has(b.platform)) byPlatform.set(b.platform, b.id);
          }
          buildIds.push(...Array.from(byPlatform.values()));
        }
      } catch {
        return err(
          'NO_BUILDS',
          'No completed builds found.',
          'critical',
          'Run `shipmobile build` first, then `shipmobile preview`.',
        );
      }
    } else {
      if (input.platform) {
        const id = latest[input.platform];
        if (id) buildIds.push(id);
        else return err('NO_BUILD_FOR_PLATFORM', `No build found for ${input.platform}.`);
      } else {
        buildIds.push(...Object.values(latest));
      }
    }
  }

  const allLinks: PreviewLink[] = [];
  const qrData: string[] = [];

  for (const id of buildIds) {
    let build: EASBuildInfo | null = null;

    try {
      build = await eas.getBuildStatus(id);
    } catch {
      build = await getCachedBuild(projectDir, id);
    }

    if (!build) continue;

    if (build.status !== 'finished') {
      return err(
        'BUILD_NOT_COMPLETE',
        `Build ${id} is not complete (status: ${build.status}).`,
        'warning',
        'Wait for the build to finish, then try again. Check status with `shipmobile status`.',
      );
    }

    const links = generatePreviewLinks(build);
    allLinks.push(...links);

    // Generate QR codes for the primary links
    for (const link of links.slice(0, 1)) { // One QR per platform
      qrData.push(link.url);
    }
  }

  if (allLinks.length === 0) {
    return err(
      'NO_ARTIFACTS',
      'No downloadable artifacts found for the completed build(s).',
      'warning',
      'The build may not have produced artifacts. Check `shipmobile status` for details.',
    );
  }

  return ok({
    previews: allLinks,
    buildId: buildIds[0],
    qrData,
  });
}
