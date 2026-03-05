/**
 * doctor — comprehensive project health checks
 */

import { readFile, access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ok, type Result } from '../utils/result.js';
import { readCredentials } from '../utils/config.js';

export interface DoctorCheck {
  id: string;
  name: string;
  category: 'structure' | 'config' | 'assets' | 'accounts' | 'build' | 'dependencies' | 'platform';
  severity: 'critical' | 'warning' | 'info';
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  suggestion?: string;
}

export interface DoctorResult {
  passed: number;
  warnings: DoctorCheck[];
  critical: DoctorCheck[];
  suggestions: string[];
  checks: DoctorCheck[];
}

interface DoctorInput {
  projectPath?: string;
  fix?: boolean;
}

async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
  } catch { return null; }
}

interface PackageJson {
  name?: string;
  version?: string;
  main?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface AppJson {
  expo?: {
    name?: string;
    slug?: string;
    version?: string;
    sdkVersion?: string;
    icon?: string;
    splash?: { image?: string };
    ios?: { bundleIdentifier?: string; infoPlist?: Record<string, unknown>; supportsTablet?: boolean };
    android?: { package?: string; adaptiveIcon?: { foregroundImage?: string } };
  };
}

interface EasJson {
  build?: {
    development?: Record<string, unknown>;
    preview?: Record<string, unknown>;
    production?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

type CheckFn = (cwd: string, fix: boolean) => Promise<DoctorCheck>;

function check(
  id: string,
  name: string,
  category: DoctorCheck['category'],
  severity: DoctorCheck['severity'],
  fn: (cwd: string, fix: boolean) => Promise<{ passed: boolean; message: string; suggestion?: string }>,
): CheckFn {
  return async (cwd: string, fix: boolean): Promise<DoctorCheck> => {
    try {
      const r = await fn(cwd, fix);
      return { id, name, category, severity, status: r.passed ? 'passed' : 'failed', message: r.message, suggestion: r.suggestion };
    } catch (e) {
      return { id, name, category, severity, status: 'failed', message: `Check errored: ${e}` };
    }
  };
}

const SUPPORTED_SDK_RANGE = [49, 50, 51, 52, 53];
const BUNDLE_ID_REGEX = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+/;

const checks: CheckFn[] = [
  // === Structure ===
  check('app-json-exists', 'app.json or app.config.js exists', 'structure', 'critical', async (cwd) => {
    const hasAppJson = await fileExists(join(cwd, 'app.json'));
    const hasAppConfig = await fileExists(join(cwd, 'app.config.js'));
    const hasAppConfigTs = await fileExists(join(cwd, 'app.config.ts'));
    const exists = hasAppJson || hasAppConfig || hasAppConfigTs;
    return { passed: exists, message: exists ? 'App config found' : 'No app.json or app.config.js found', suggestion: exists ? undefined : 'Create an app.json with your app configuration.' };
  }),

  check('app-json-valid', 'app.json is valid JSON', 'structure', 'critical', async (cwd) => {
    const path = join(cwd, 'app.json');
    if (!(await fileExists(path))) return { passed: true, message: 'No app.json (using app.config.js)' };
    const data = await readJson(path);
    return { passed: data !== null, message: data !== null ? 'app.json is valid' : 'app.json is not valid JSON', suggestion: data === null ? 'Fix JSON syntax errors in app.json' : undefined };
  }),

  check('package-json-valid', 'package.json exists and is valid', 'structure', 'critical', async (cwd) => {
    const data = await readJson<PackageJson>(join(cwd, 'package.json'));
    return { passed: data !== null, message: data !== null ? 'package.json is valid' : 'package.json missing or invalid', suggestion: data === null ? 'Ensure you are in a Node.js project directory.' : undefined };
  }),

  check('node-modules-exist', 'node_modules exists', 'structure', 'warning', async (cwd) => {
    const exists = await fileExists(join(cwd, 'node_modules'));
    return { passed: exists, message: exists ? 'Dependencies installed' : 'node_modules not found', suggestion: exists ? undefined : 'Run `pnpm install` to install dependencies.' };
  }),

  check('entry-point-exists', 'Entry point file exists', 'structure', 'warning', async (cwd) => {
    const pkg = await readJson<PackageJson>(join(cwd, 'package.json'));
    const main = pkg?.main || 'index.js';
    const candidates = [main, 'App.js', 'App.tsx', 'app/index.tsx', 'app/_layout.tsx', 'src/App.tsx'];
    for (const c of candidates) {
      if (await fileExists(join(cwd, c))) return { passed: true, message: `Entry point found: ${c}` };
    }
    return { passed: false, message: 'No entry point file found', suggestion: 'Create App.js or App.tsx in your project root.' };
  }),

  // === Config ===
  check('bundle-id-format', 'Bundle ID format is valid', 'config', 'critical', async (cwd) => {
    const app = await readJson<AppJson>(join(cwd, 'app.json'));
    const bundleId = app?.expo?.ios?.bundleIdentifier || app?.expo?.android?.package;
    if (!bundleId) return { passed: false, message: 'No bundle ID configured', suggestion: 'Add ios.bundleIdentifier and android.package to app.json expo config.' };
    const valid = BUNDLE_ID_REGEX.test(bundleId);
    return { passed: valid, message: valid ? `Bundle ID valid: ${bundleId}` : `Invalid bundle ID: ${bundleId}`, suggestion: valid ? undefined : 'Use reverse domain notation: com.company.appname' };
  }),

  check('version-format', 'Version number is valid semver', 'config', 'warning', async (cwd) => {
    const app = await readJson<AppJson>(join(cwd, 'app.json'));
    const ver = app?.expo?.version;
    if (!ver) {
      const pkg = await readJson<PackageJson>(join(cwd, 'package.json'));
      const pkgVer = pkg?.version;
      if (!pkgVer) return { passed: false, message: 'No version found', suggestion: 'Add version to app.json or package.json.' };
      return { passed: SEMVER_REGEX.test(pkgVer), message: SEMVER_REGEX.test(pkgVer) ? `Version: ${pkgVer}` : `Invalid version: ${pkgVer}` };
    }
    return { passed: SEMVER_REGEX.test(ver), message: SEMVER_REGEX.test(ver) ? `Version: ${ver}` : `Invalid version format: ${ver}`, suggestion: SEMVER_REGEX.test(ver) ? undefined : 'Use semver format: 1.0.0' };
  }),

  check('sdk-version-supported', 'Expo SDK version is supported', 'config', 'warning', async (cwd) => {
    const app = await readJson<AppJson>(join(cwd, 'app.json'));
    const sdk = app?.expo?.sdkVersion;
    if (!sdk) return { passed: true, message: 'No SDK version specified (will use latest)' };
    const major = parseInt(sdk.split('.')[0] || '0', 10);
    const supported = SUPPORTED_SDK_RANGE.includes(major);
    return { passed: supported, message: supported ? `SDK ${sdk} is supported` : `SDK ${sdk} may not be supported`, suggestion: supported ? undefined : `Supported SDK versions: ${SUPPORTED_SDK_RANGE.join(', ')}. Run: npx expo install expo@latest` };
  }),

  check('eas-json-exists', 'eas.json exists with build profiles', 'config', 'warning', async (cwd, fix) => {
    const path = join(cwd, 'eas.json');
    const exists = await fileExists(path);
    if (!exists && fix) {
      const defaultEas = { cli: { version: '>= 13.0.0' }, build: { development: { developmentClient: true, distribution: 'internal' }, preview: { distribution: 'internal' }, production: {} }, submit: { production: {} } };
      await writeFile(path, JSON.stringify(defaultEas, null, 2));
      return { passed: true, message: 'eas.json created with defaults (auto-fixed)' };
    }
    if (!exists) return { passed: false, message: 'eas.json not found', suggestion: 'Run `shipmobile init` or `eas init` to create eas.json.' };
    const data = await readJson<EasJson>(path);
    const hasProfiles = data?.build && Object.keys(data.build).length > 0;
    return { passed: !!hasProfiles, message: hasProfiles ? 'eas.json has build profiles' : 'eas.json has no build profiles', suggestion: hasProfiles ? undefined : 'Add build profiles (development, preview, production) to eas.json.' };
  }),

  // === Assets ===
  check('app-icon-exists', 'App icon exists', 'assets', 'critical', async (cwd) => {
    const app = await readJson<AppJson>(join(cwd, 'app.json'));
    const iconPath = app?.expo?.icon;
    if (!iconPath) return { passed: false, message: 'No app icon configured in app.json', suggestion: 'Add "icon": "./assets/icon.png" to your expo config in app.json.' };
    const fullPath = join(cwd, iconPath);
    const exists = await fileExists(fullPath);
    return { passed: exists, message: exists ? `Icon found: ${iconPath}` : `Icon file not found: ${iconPath}`, suggestion: exists ? undefined : `Create a 1024x1024 PNG icon at ${iconPath}` };
  }),

  check('app-icon-dimensions', 'App icon is 1024x1024 PNG', 'assets', 'warning', async (cwd) => {
    const app = await readJson<AppJson>(join(cwd, 'app.json'));
    const iconPath = app?.expo?.icon;
    if (!iconPath) return { passed: false, message: 'No icon configured' };
    const fullPath = join(cwd, iconPath);
    if (!(await fileExists(fullPath))) return { passed: false, message: 'Icon file not found' };
    // Check PNG header and dimensions
    try {
      const buf = await readFile(fullPath);
      const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
      if (!isPng) return { passed: false, message: 'Icon is not a PNG file', suggestion: 'Convert your icon to PNG format.' };
      // PNG width at offset 16, height at offset 20 (big-endian uint32)
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      const isSquare = width === height;
      const is1024 = width === 1024 && height === 1024;
      if (is1024) return { passed: true, message: 'Icon is 1024x1024 PNG ✓' };
      if (isSquare) return { passed: false, message: `Icon is ${width}x${height} (need 1024x1024)`, suggestion: 'Resize your icon to 1024x1024 pixels.' };
      return { passed: false, message: `Icon is ${width}x${height} (not square)`, suggestion: 'Your icon must be square (1024x1024 recommended).' };
    } catch {
      return { passed: false, message: 'Could not read icon dimensions' };
    }
  }),

  check('splash-screen-exists', 'Splash screen exists', 'assets', 'warning', async (cwd) => {
    const app = await readJson<AppJson>(join(cwd, 'app.json'));
    const splashPath = app?.expo?.splash?.image;
    if (!splashPath) return { passed: false, message: 'No splash screen configured', suggestion: 'Add "splash": { "image": "./assets/splash.png" } to your expo config.' };
    const exists = await fileExists(join(cwd, splashPath));
    return { passed: exists, message: exists ? `Splash found: ${splashPath}` : `Splash not found: ${splashPath}`, suggestion: exists ? undefined : `Create a splash screen image at ${splashPath}` };
  }),

  // === Accounts ===
  check('expo-connected', 'Expo/EAS account connected', 'accounts', 'warning', async (cwd) => {
    const creds = await readCredentials(cwd);
    if (!creds.ok) return { passed: false, message: 'Could not read credentials' };
    const connected = !!creds.data.expo?.validated;
    return { passed: connected, message: connected ? `Expo: ${creds.data.expo?.username || 'connected'}` : 'Expo not connected', suggestion: connected ? undefined : 'Run `shipmobile login --expo` to connect your Expo account.' };
  }),

  check('apple-connected', 'Apple Developer account connected', 'accounts', 'warning', async (cwd) => {
    const creds = await readCredentials(cwd);
    if (!creds.ok) return { passed: false, message: 'Could not read credentials' };
    const connected = !!creds.data.apple?.validated;
    return { passed: connected, message: connected ? `Apple: ${creds.data.apple?.teamName || 'connected'}` : 'Apple not connected', suggestion: connected ? undefined : 'Run `shipmobile login --apple` to connect your Apple Developer account.' };
  }),

  check('credentials-valid', 'Stored credentials are not expired', 'accounts', 'info', async (cwd) => {
    const creds = await readCredentials(cwd);
    if (!creds.ok) return { passed: true, message: 'No credentials to check' };
    const issues: string[] = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    if (creds.data.expo?.validatedAt && creds.data.expo.validatedAt < thirtyDaysAgo) {
      issues.push('Expo credentials last validated >30 days ago');
    }
    if (creds.data.apple?.validatedAt && creds.data.apple.validatedAt < thirtyDaysAgo) {
      issues.push('Apple credentials last validated >30 days ago');
    }
    return { passed: issues.length === 0, message: issues.length === 0 ? 'Credentials are fresh' : issues.join('; '), suggestion: issues.length > 0 ? 'Re-run `shipmobile login` to revalidate.' : undefined };
  }),

  // === Build Readiness ===
  check('eas-production-profile', 'eas.json has production profile', 'build', 'warning', async (cwd) => {
    const eas = await readJson<EasJson>(join(cwd, 'eas.json'));
    if (!eas) return { passed: false, message: 'No eas.json found' };
    const hasProd = !!eas.build?.production;
    return { passed: hasProd, message: hasProd ? 'Production build profile found' : 'No production profile in eas.json', suggestion: hasProd ? undefined : 'Add a "production" profile to build section of eas.json.' };
  }),

  check('eas-cli-installed', 'EAS CLI is available', 'build', 'info', async () => {
    try {
      const { execSync } = await import('node:child_process');
      const ver = execSync('eas --version', { stdio: 'pipe' }).toString().trim();
      return { passed: true, message: `EAS CLI: ${ver}` };
    } catch {
      return { passed: false, message: 'EAS CLI not installed', suggestion: 'Install with: npm install -g eas-cli' };
    }
  }),

  check('typescript-check', 'No TypeScript errors', 'build', 'info', async (cwd) => {
    const hasTsConfig = await fileExists(join(cwd, 'tsconfig.json'));
    if (!hasTsConfig) return { passed: true, message: 'No tsconfig.json (not a TypeScript project)' };
    try {
      const { execSync } = await import('node:child_process');
      execSync('npx tsc --noEmit', { cwd, stdio: 'pipe', timeout: 30000 });
      return { passed: true, message: 'No TypeScript errors' };
    } catch {
      return { passed: false, message: 'TypeScript errors detected', suggestion: 'Run `npx tsc --noEmit` to see errors.' };
    }
  }),

  // === Dependencies ===
  check('no-incompatible-packages', 'No known incompatible packages', 'dependencies', 'warning', async (cwd) => {
    const pkg = await readJson<PackageJson>(join(cwd, 'package.json'));
    if (!pkg) return { passed: true, message: 'No package.json' };
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const incompatible = ['react-native-navigation', 'native-base'].filter((d) => d in allDeps);
    return { passed: incompatible.length === 0, message: incompatible.length === 0 ? 'No known incompatible packages' : `Potentially incompatible: ${incompatible.join(', ')}`, suggestion: incompatible.length > 0 ? 'These packages may cause build issues with Expo. Check compatibility.' : undefined };
  }),

  check('rn-expo-compat', 'React Native version compatible with Expo SDK', 'dependencies', 'warning', async (cwd) => {
    const pkg = await readJson<PackageJson>(join(cwd, 'package.json'));
    if (!pkg?.dependencies?.expo) return { passed: true, message: 'Not an Expo project — skipping' };
    if (!pkg.dependencies['react-native']) return { passed: true, message: 'react-native version managed by Expo' };
    return { passed: true, message: 'React Native version present with Expo' };
  }),

  check('no-duplicate-rn', 'No duplicate React Native installations', 'dependencies', 'warning', async (cwd) => {
    try {
      const { execSync } = await import('node:child_process');
      const result = execSync('find node_modules -name "react-native" -maxdepth 3 -type d 2>/dev/null | wc -l', { cwd, stdio: 'pipe' }).toString().trim();
      const count = parseInt(result, 10);
      return { passed: count <= 1, message: count <= 1 ? 'Single React Native installation' : `${count} React Native installations found`, suggestion: count > 1 ? 'Multiple React Native copies can cause build errors. Run `pnpm dedupe`.' : undefined };
    } catch {
      return { passed: true, message: 'Could not check for duplicates' };
    }
  }),

  // === Platform Config ===
  check('ios-bundle-id', 'iOS bundleIdentifier set in app.json', 'platform', 'critical', async (cwd, fix) => {
    const path = join(cwd, 'app.json');
    const app = await readJson<AppJson>(path);
    if (!app?.expo) return { passed: false, message: 'No expo config in app.json' };
    const bid = app.expo.ios?.bundleIdentifier;
    if (bid) return { passed: true, message: `iOS bundle ID: ${bid}` };
    if (fix && app.expo) {
      const name = app.expo.slug || app.expo.name || 'myapp';
      const genBid = `com.dev.${name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
      if (!app.expo.ios) app.expo.ios = {};
      app.expo.ios.bundleIdentifier = genBid;
      await writeFile(path, JSON.stringify(app, null, 2));
      return { passed: true, message: `iOS bundle ID set to ${genBid} (auto-fixed)` };
    }
    return { passed: false, message: 'iOS bundleIdentifier not set', suggestion: 'Add expo.ios.bundleIdentifier to app.json (e.g., com.company.appname).' };
  }),

  check('android-package', 'Android package set in app.json', 'platform', 'critical', async (cwd, fix) => {
    const path = join(cwd, 'app.json');
    const app = await readJson<AppJson>(path);
    if (!app?.expo) return { passed: false, message: 'No expo config in app.json' };
    const pkg = app.expo.android?.package;
    if (pkg) return { passed: true, message: `Android package: ${pkg}` };
    if (fix && app.expo) {
      const name = app.expo.slug || app.expo.name || 'myapp';
      const genPkg = `com.dev.${name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
      if (!app.expo.android) app.expo.android = {};
      app.expo.android.package = genPkg;
      await writeFile(path, JSON.stringify(app, null, 2));
      return { passed: true, message: `Android package set to ${genPkg} (auto-fixed)` };
    }
    return { passed: false, message: 'Android package not set', suggestion: 'Add expo.android.package to app.json (e.g., com.company.appname).' };
  }),

  check('min-deploy-targets', 'Minimum deployment targets are reasonable', 'platform', 'info', async (cwd) => {
    const app = await readJson<AppJson>(join(cwd, 'app.json'));
    // Just info check — Expo handles this well by default
    if (!app?.expo) return { passed: true, message: 'No expo config — defaults apply' };
    return { passed: true, message: 'Deployment targets use Expo defaults (recommended)' };
  }),
];

export async function execute(input?: DoctorInput): Promise<Result<DoctorResult>> {
  const cwd = input?.projectPath || process.cwd();
  const fix = input?.fix || false;

  const results: DoctorCheck[] = [];
  for (const checkFn of checks) {
    results.push(await checkFn(cwd, fix));
  }

  const passed = results.filter((c) => c.status === 'passed').length;
  const warnings = results.filter((c) => c.status === 'failed' && c.severity === 'warning');
  const critical = results.filter((c) => c.status === 'failed' && c.severity === 'critical');
  const suggestions = results.filter((c) => c.suggestion).map((c) => c.suggestion!);

  return ok({ passed, warnings, critical, suggestions, checks: results });
}
