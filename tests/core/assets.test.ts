import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execute, IOS_ICON_SIZES, ANDROID_ICON_SIZES, SCREENSHOT_SIZES } from '../../src/core/assets.js';
import sharp from 'sharp';

const TMP = join(__dirname, '..', '.tmp-assets-test');

function createTestImage(path: string, width: number, height: number) {
  // Create a real PNG using sharp
  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 0, b: 0 } },
  }).png().toFile(path);
}

describe('Assets Command', () => {
  beforeEach(async () => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(join(TMP, 'assets'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('should generate iOS and Android icons from a valid source icon', async () => {
    await createTestImage(join(TMP, 'assets', 'icon.png'), 1024, 1024);

    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.icon).not.toBeNull();
    const iosIcons = result.data.icon!.generated.filter(g => g.platform === 'ios');
    const androidIcons = result.data.icon!.generated.filter(g => g.platform === 'android');

    // Count expected iOS icons
    let expectedIos = 0;
    for (const s of IOS_ICON_SIZES) expectedIos += s.scales.length;
    expect(iosIcons.length).toBe(expectedIos);

    // Count expected Android icons
    expect(androidIcons.length).toBe(Object.keys(ANDROID_ICON_SIZES).length);

    // Verify files exist
    for (const icon of result.data.icon!.generated) {
      expect(existsSync(icon.path)).toBe(true);
    }
  });

  it('should reject icons smaller than 1024x1024', async () => {
    await createTestImage(join(TMP, 'assets', 'icon.png'), 512, 512);

    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('ICON_TOO_SMALL');
  });

  it('should report missing icon', async () => {
    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.icon).toBeNull();
    expect(result.data.missing).toContain('App icon (1024×1024 PNG)');
  });

  it('should handle corrupt/invalid icon files', async () => {
    writeFileSync(join(TMP, 'assets', 'icon.png'), 'not a real image');

    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CORRUPT_ICON');
  });

  it('should accept icons larger than 1024x1024', async () => {
    await createTestImage(join(TMP, 'assets', 'icon.png'), 2048, 2048);

    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.icon).not.toBeNull();
    expect(result.data.icon!.width).toBe(2048);
  });

  it('should validate splash screen dimensions', async () => {
    await createTestImage(join(TMP, 'assets', 'splash.png'), 1284, 2778);

    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.splash.length).toBe(2); // ios + android
    const iosSplash = result.data.splash.find(s => s.platform === 'ios');
    expect(iosSplash).toBeDefined();
    expect(iosSplash!.valid).toBe(true);
  });

  it('should warn about small splash screens', async () => {
    await createTestImage(join(TMP, 'assets', 'splash.png'), 640, 480);

    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const s of result.data.splash) {
      expect(s.valid).toBe(false);
      expect(s.issues.length).toBeGreaterThan(0);
    }
  });

  it('should report missing splash screen', async () => {
    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.missing).toContain('Splash screen');
  });

  it('should validate screenshots when present', async () => {
    const ssDir = join(TMP, 'assets', 'screenshots');
    mkdirSync(ssDir, { recursive: true });
    await createTestImage(join(ssDir, 'iphone-pro-max.png'), 1290, 2796);

    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const found = result.data.screenshots.find(s => s.size === '1290×2796');
    expect(found).toBeDefined();
    expect(found!.found).toBe(true);
    expect(found!.valid).toBe(true);
  });

  it('should report missing required screenshot sizes', async () => {
    const ssDir = join(TMP, 'assets', 'screenshots');
    mkdirSync(ssDir, { recursive: true });
    // Only provide one size
    await createTestImage(join(ssDir, 'small.png'), 100, 100);

    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const requiredMissing = result.data.screenshots.filter(s => s.required && !s.found);
    expect(requiredMissing.length).toBeGreaterThan(0);
  });

  it('should report missing screenshots directory', async () => {
    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.missing).toContain('Screenshots directory (assets/screenshots/)');
  });

  it('should accept custom icon path', async () => {
    const customDir = join(TMP, 'custom');
    mkdirSync(customDir, { recursive: true });
    await createTestImage(join(customDir, 'myicon.png'), 1024, 1024);

    const result = await execute({
      projectPath: TMP,
      iconPath: join(customDir, 'myicon.png'),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.icon).not.toBeNull();
  });

  it('should process adaptive icon layers', async () => {
    await createTestImage(join(TMP, 'assets', 'adaptive-icon-foreground.png'), 1024, 1024);
    await createTestImage(join(TMP, 'assets', 'adaptive-icon-background.png'), 1024, 1024);

    const result = await execute({ projectPath: TMP });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.adaptiveIcon).not.toBeNull();
    expect(result.data.adaptiveIcon!.generated.length).toBeGreaterThan(0);
  });

  it('should list all required screenshot sizes', () => {
    // Ensure we have the expected sizes defined
    expect(SCREENSHOT_SIZES.length).toBeGreaterThanOrEqual(4);
    const required = SCREENSHOT_SIZES.filter(s => s.required);
    expect(required.length).toBeGreaterThanOrEqual(2);
  });
});
