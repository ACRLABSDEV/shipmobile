/**
 * assets — Icon generation, splash screen validation, screenshot validation
 */

import { ok, err, type Result } from '../utils/result.js';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// iOS icon sizes: [points, scales[]]
const IOS_ICON_SIZES: Array<{ points: number; scales: number[]; name: string }> = [
  { points: 20, scales: [1, 2, 3], name: 'Icon-20' },
  { points: 29, scales: [1, 2, 3], name: 'Icon-29' },
  { points: 40, scales: [1, 2, 3], name: 'Icon-40' },
  { points: 60, scales: [2, 3], name: 'Icon-60' },
  { points: 76, scales: [1, 2], name: 'Icon-76' },
  { points: 83.5, scales: [2], name: 'Icon-83.5' },
  { points: 1024, scales: [1], name: 'Icon-1024' },
];

// Android icon sizes: density → px
const ANDROID_ICON_SIZES: Record<string, number> = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

// Android adaptive icon foreground (with safe zone padding)
const ANDROID_ADAPTIVE_SIZES: Record<string, number> = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

// Splash screen requirements
const SPLASH_REQUIREMENTS = {
  ios: { minWidth: 1284, minHeight: 2778, label: 'iOS splash (1284×2778 recommended)' },
  android: { minWidth: 1080, minHeight: 1920, label: 'Android splash (1080×1920 recommended)' },
};

// Required screenshot sizes for App Store
const SCREENSHOT_SIZES: Array<{ width: number; height: number; label: string; required: boolean }> = [
  { width: 1290, height: 2796, label: '6.7" iPhone 15 Pro Max', required: true },
  { width: 1179, height: 2556, label: '6.1" iPhone 15 Pro', required: true },
  { width: 1242, height: 2208, label: '5.5" iPhone 8 Plus', required: false },
  { width: 2048, height: 2732, label: '12.9" iPad Pro', required: false },
];

export interface IconGenerated {
  path: string;
  width: number;
  height: number;
  platform: 'ios' | 'android';
}

export interface SplashValidation {
  path: string;
  width: number;
  height: number;
  platform: 'ios' | 'android';
  valid: boolean;
  issues: string[];
}

export interface ScreenshotValidation {
  size: string;
  label: string;
  required: boolean;
  found: boolean;
  path?: string;
  dimensions?: { width: number; height: number };
  valid: boolean;
  issues: string[];
}

export interface AssetsResult {
  icon: {
    source: string;
    width: number;
    height: number;
    generated: IconGenerated[];
  } | null;
  adaptiveIcon: {
    foreground: string | null;
    background: string | null;
    generated: IconGenerated[];
  } | null;
  splash: SplashValidation[];
  screenshots: ScreenshotValidation[];
  missing: string[];
  recommendations: string[];
}

export interface AssetsOptions {
  projectPath?: string;
  iconPath?: string;
  splashPath?: string;
  screenshotsDir?: string;
  foregroundPath?: string;
  backgroundPath?: string;
}

async function getSharp() {
  const sharp = await import('sharp');
  return sharp.default;
}

async function getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  try {
    const sharp = await getSharp();
    const metadata = await sharp(filePath).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
    return null;
  } catch {
    return null;
  }
}

async function generateIosIcons(
  sourcePath: string,
  outputDir: string,
): Promise<IconGenerated[]> {
  const sharp = await getSharp();
  const generated: IconGenerated[] = [];
  const iosDir = join(outputDir, 'ios');
  mkdirSync(iosDir, { recursive: true });

  for (const size of IOS_ICON_SIZES) {
    for (const scale of size.scales) {
      const px = Math.round(size.points * scale);
      const filename = `${size.name}@${scale}x.png`;
      const outPath = join(iosDir, filename);
      await sharp(sourcePath)
        .resize(px, px, { fit: 'cover' })
        .png()
        .toFile(outPath);
      generated.push({ path: outPath, width: px, height: px, platform: 'ios' });
    }
  }

  return generated;
}

async function generateAndroidIcons(
  sourcePath: string,
  outputDir: string,
): Promise<IconGenerated[]> {
  const sharp = await getSharp();
  const generated: IconGenerated[] = [];

  for (const [density, px] of Object.entries(ANDROID_ICON_SIZES)) {
    const densityDir = join(outputDir, 'android', `mipmap-${density}`);
    mkdirSync(densityDir, { recursive: true });
    const outPath = join(densityDir, 'ic_launcher.png');
    await sharp(sourcePath)
      .resize(px, px, { fit: 'cover' })
      .png()
      .toFile(outPath);
    generated.push({ path: outPath, width: px, height: px, platform: 'android' });
  }

  return generated;
}

async function generateAdaptiveIcons(
  foregroundPath: string,
  backgroundPath: string,
  outputDir: string,
): Promise<IconGenerated[]> {
  const sharp = await getSharp();
  const generated: IconGenerated[] = [];

  for (const [density, px] of Object.entries(ANDROID_ADAPTIVE_SIZES)) {
    const densityDir = join(outputDir, 'android', `mipmap-${density}`);
    mkdirSync(densityDir, { recursive: true });

    const fgOut = join(densityDir, 'ic_launcher_foreground.png');
    await sharp(foregroundPath)
      .resize(px, px, { fit: 'cover' })
      .png()
      .toFile(fgOut);
    generated.push({ path: fgOut, width: px, height: px, platform: 'android' });

    const bgOut = join(densityDir, 'ic_launcher_background.png');
    await sharp(backgroundPath)
      .resize(px, px, { fit: 'cover' })
      .png()
      .toFile(bgOut);
    generated.push({ path: bgOut, width: px, height: px, platform: 'android' });
  }

  return generated;
}

function validateSplash(
  filePath: string,
  dims: { width: number; height: number },
  platform: 'ios' | 'android',
): SplashValidation {
  const req = SPLASH_REQUIREMENTS[platform];
  const issues: string[] = [];

  if (dims.width < req.minWidth) {
    issues.push(`Width ${dims.width}px is less than recommended ${req.minWidth}px`);
  }
  if (dims.height < req.minHeight) {
    issues.push(`Height ${dims.height}px is less than recommended ${req.minHeight}px`);
  }

  return {
    path: filePath,
    width: dims.width,
    height: dims.height,
    platform,
    valid: issues.length === 0,
    issues,
  };
}

export async function execute(options: AssetsOptions = {}): Promise<Result<AssetsResult>> {
  const projectPath = resolve(options.projectPath || '.');
  const missing: string[] = [];
  const recommendations: string[] = [];

  // --- Icon processing ---
  let iconResult: AssetsResult['icon'] = null;
  const iconPath = options.iconPath
    ? resolve(options.iconPath)
    : findDefaultIcon(projectPath);

  if (iconPath && existsSync(iconPath)) {
    const dims = await getImageDimensions(iconPath);
    if (!dims) {
      return err('CORRUPT_ICON', `Could not read icon at ${iconPath}`, 'critical', 'Ensure the file is a valid PNG or JPEG image');
    }
    if (dims.width < 1024 || dims.height < 1024) {
      return err('ICON_TOO_SMALL', `Icon is ${dims.width}×${dims.height} — must be at least 1024×1024`, 'critical', 'Provide a higher resolution icon');
    }

    const outputDir = join(projectPath, '.shipmobile', 'icons');
    mkdirSync(outputDir, { recursive: true });

    const iosIcons = await generateIosIcons(iconPath, outputDir);
    const androidIcons = await generateAndroidIcons(iconPath, outputDir);

    iconResult = {
      source: iconPath,
      width: dims.width,
      height: dims.height,
      generated: [...iosIcons, ...androidIcons],
    };
  } else {
    missing.push('App icon (1024×1024 PNG)');
    recommendations.push('Need an icon? Try iconify.design or hire on Fiverr');
  }

  // --- Adaptive icon ---
  let adaptiveResult: AssetsResult['adaptiveIcon'] = null;
  const fgPath = options.foregroundPath
    ? resolve(options.foregroundPath)
    : findFile(projectPath, ['assets/adaptive-icon-foreground.png', 'assets/icon-foreground.png']);
  const bgPath = options.backgroundPath
    ? resolve(options.backgroundPath)
    : findFile(projectPath, ['assets/adaptive-icon-background.png', 'assets/icon-background.png']);

  if (fgPath && bgPath && existsSync(fgPath) && existsSync(bgPath)) {
    const outputDir = join(projectPath, '.shipmobile', 'icons');
    mkdirSync(outputDir, { recursive: true });
    const adaptiveIcons = await generateAdaptiveIcons(fgPath, bgPath, outputDir);
    adaptiveResult = {
      foreground: fgPath,
      background: bgPath,
      generated: adaptiveIcons,
    };
  }

  // --- Splash screen validation ---
  const splashResults: SplashValidation[] = [];
  const splashPath = options.splashPath
    ? resolve(options.splashPath)
    : findFile(projectPath, ['assets/splash.png', 'assets/splash-icon.png', 'splash.png']);

  if (splashPath && existsSync(splashPath)) {
    const dims = await getImageDimensions(splashPath);
    if (dims) {
      splashResults.push(validateSplash(splashPath, dims, 'ios'));
      splashResults.push(validateSplash(splashPath, dims, 'android'));
    } else {
      missing.push('Splash screen (file exists but could not be read)');
    }
  } else {
    missing.push('Splash screen');
    recommendations.push('Use Figma to create a simple splash screen');
  }

  // --- Screenshot validation ---
  const screenshotsDir = options.screenshotsDir
    ? resolve(options.screenshotsDir)
    : join(projectPath, 'assets', 'screenshots');

  const screenshotResults: ScreenshotValidation[] = [];

  if (existsSync(screenshotsDir)) {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(screenshotsDir)
      .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .map(f => join(screenshotsDir, f));

    // Get dimensions for all screenshot files
    const fileDims = await Promise.all(
      files.map(async (f) => ({ path: f, dims: await getImageDimensions(f) })),
    );

    for (const size of SCREENSHOT_SIZES) {
      const sizeKey = `${size.width}×${size.height}`;
      // Find a matching file (allow both portrait and landscape)
      const match = fileDims.find(
        (fd) =>
          fd.dims &&
          ((fd.dims.width === size.width && fd.dims.height === size.height) ||
            (fd.dims.width === size.height && fd.dims.height === size.width)),
      );

      if (match && match.dims) {
        screenshotResults.push({
          size: sizeKey,
          label: size.label,
          required: size.required,
          found: true,
          path: match.path,
          dimensions: match.dims,
          valid: true,
          issues: [],
        });
      } else {
        screenshotResults.push({
          size: sizeKey,
          label: size.label,
          required: size.required,
          found: false,
          valid: false,
          issues: [`Missing ${sizeKey} screenshot for ${size.label}`],
        });
        if (size.required) {
          missing.push(`Screenshot: ${size.label} (${sizeKey})`);
        }
      }
    }
  } else {
    for (const size of SCREENSHOT_SIZES) {
      const sizeKey = `${size.width}×${size.height}`;
      screenshotResults.push({
        size: sizeKey,
        label: size.label,
        required: size.required,
        found: false,
        valid: false,
        issues: [`No screenshots directory found`],
      });
    }
    missing.push('Screenshots directory (assets/screenshots/)');
    recommendations.push('Take screenshots from your simulator, or try screenshots.pro');
  }

  return ok({
    icon: iconResult,
    adaptiveIcon: adaptiveResult,
    splash: splashResults,
    screenshots: screenshotResults,
    missing,
    recommendations,
  });
}

function findDefaultIcon(projectPath: string): string | null {
  const candidates = [
    'assets/icon.png',
    'assets/app-icon.png',
    'icon.png',
    'src/assets/icon.png',
  ];
  return findFile(projectPath, candidates);
}

function findFile(projectPath: string, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const full = join(projectPath, candidate);
    if (existsSync(full)) return full;
  }
  return null;
}

// Export for MCP/testing
export { IOS_ICON_SIZES, ANDROID_ICON_SIZES, ANDROID_ADAPTIVE_SIZES, SCREENSHOT_SIZES, SPLASH_REQUIREMENTS };
