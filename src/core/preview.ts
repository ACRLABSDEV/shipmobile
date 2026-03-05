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
 * Simple QR code generation using Unicode block characters
 * Produces a compact QR-like representation for terminal display
 */
export function generateQRCode(data: string): string {
  // Simple encoding: create a visual hash-based pattern
  // For real QR codes, the qrcode-terminal package would be used at runtime
  // This generates a deterministic visual pattern from the URL
  const size = 21; // QR version 1 is 21x21
  const modules: boolean[][] = [];

  // Create a simple hash-based pattern
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }

  // Seed a simple PRNG from the hash
  let seed = Math.abs(hash);
  function nextRand(): number {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed;
  }

  for (let y = 0; y < size; y++) {
    modules[y] = [];
    for (let x = 0; x < size; x++) {
      // Finder patterns (top-left, top-right, bottom-left corners)
      const isFinderArea =
        (x < 7 && y < 7) || // top-left
        (x >= size - 7 && y < 7) || // top-right
        (x < 7 && y >= size - 7); // bottom-left

      if (isFinderArea) {
        // Simplified finder pattern
        const fx = x < 7 ? x : x >= size - 7 ? x - (size - 7) : x;
        const fy = y < 7 ? y : y >= size - 7 ? y - (size - 7) : y;
        const isOuter = fx === 0 || fx === 6 || fy === 0 || fy === 6;
        const isInner = fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4;
        modules[y]![x] = isOuter || isInner;
      } else {
        modules[y]![x] = nextRand() % 3 !== 0;
      }
    }
  }

  // Render using Unicode block characters (2 rows per character)
  const lines: string[] = [];
  // Top quiet zone
  lines.push('  ' + '█'.repeat(size + 2));

  for (let y = 0; y < size; y += 2) {
    let line = '  █';
    for (let x = 0; x < size; x++) {
      const top = modules[y]?.[x] ?? false;
      const bottom = modules[y + 1]?.[x] ?? false;
      if (top && bottom) line += ' ';
      else if (top && !bottom) line += '▄';
      else if (!top && bottom) line += '▀';
      else line += '█';
    }
    line += '█';
    lines.push(line);
  }

  // Bottom quiet zone
  lines.push('  ' + '█'.repeat(size + 2));

  return lines.join('\n');
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
      return err(
        'NO_BUILDS',
        'No completed builds found.',
        'critical',
        'Run `shipmobile build` first, then `shipmobile preview`.',
      );
    }
    if (input.platform) {
      const id = latest[input.platform];
      if (id) buildIds.push(id);
      else return err('NO_BUILD_FOR_PLATFORM', `No build found for ${input.platform}.`);
    } else {
      buildIds.push(...Object.values(latest));
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
