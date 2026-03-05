/**
 * init — project detection and scaffolding
 */

import { readFile, stat, writeFile, access } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { ok, err, type Result } from '../utils/result.js';
import { writeConfig, type ShipMobileConfig } from '../utils/config.js';

export type WorkflowType = 'expo-managed' | 'expo-bare' | 'react-native-cli' | 'not-rn';

export interface InitResult {
  project: {
    name: string;
    bundleId: string;
    sdkVersion: string | null;
    platforms: string[];
    workflow: WorkflowType;
    version: string;
  };
  issues: string[];
  config: ShipMobileConfig;
  generated: string[]; // files we created/updated
}

export interface InitInput {
  projectPath?: string;
  bundleId?: string;
  platforms?: string[];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface AppJson {
  expo?: {
    name?: string;
    slug?: string;
    version?: string;
    sdkVersion?: string;
    ios?: { bundleIdentifier?: string };
    android?: { package?: string };
  };
  name?: string;
}

export async function detectWorkflow(cwd: string): Promise<WorkflowType> {
  const pkgPath = join(cwd, 'package.json');
  if (!(await fileExists(pkgPath))) return 'not-rn';

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as PackageJson;
  } catch {
    return 'not-rn';
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hasExpo = 'expo' in allDeps;
  const hasRN = 'react-native' in allDeps;

  if (!hasExpo && !hasRN) return 'not-rn';

  if (hasExpo) {
    const hasIosDir = await dirExists(join(cwd, 'ios'));
    const hasAndroidDir = await dirExists(join(cwd, 'android'));
    return (hasIosDir || hasAndroidDir) ? 'expo-bare' : 'expo-managed';
  }

  return 'react-native-cli';
}

function generateBundleId(projectName: string, username?: string): string {
  const cleanName = projectName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const owner = username || 'dev';
  return `com.${owner}.${cleanName}`;
}

export async function execute(input?: InitInput): Promise<Result<InitResult>> {
  const cwd = input?.projectPath || process.cwd();

  // Check package.json exists
  const pkgPath = join(cwd, 'package.json');
  if (!(await fileExists(pkgPath))) {
    return err(
      'NO_PACKAGE_JSON',
      'No package.json found in this directory.',
      'critical',
      'Run this command in a React Native or Expo project directory.',
    );
  }

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as PackageJson;
  } catch {
    return err('INVALID_PACKAGE_JSON', 'package.json is not valid JSON.', 'critical');
  }

  const workflow = await detectWorkflow(cwd);
  if (workflow === 'not-rn') {
    return err(
      'NOT_RN_PROJECT',
      'This does not appear to be a React Native or Expo project.',
      'critical',
      'Make sure expo or react-native is in your package.json dependencies.\nTo create a new Expo project: npx create-expo-app@latest my-app',
    );
  }

  const projectName = pkg.name || basename(cwd);
  const issues: string[] = [];
  const generated: string[] = [];

  // Read app.json/app.config.js
  let appJson: AppJson | null = null;
  const appJsonPath = join(cwd, 'app.json');
  const appConfigPath = join(cwd, 'app.config.js');
  
  if (await fileExists(appJsonPath)) {
    try {
      appJson = JSON.parse(await readFile(appJsonPath, 'utf-8')) as AppJson;
    } catch {
      issues.push('app.json exists but is not valid JSON');
    }
  } else if (!(await fileExists(appConfigPath))) {
    issues.push('No app.json or app.config.js found');
  }

  // Determine SDK version
  const sdkVersion = appJson?.expo?.sdkVersion || null;
  const version = appJson?.expo?.version || pkg.version || '1.0.0';

  // Bundle ID
  const existingBundleId = appJson?.expo?.ios?.bundleIdentifier || appJson?.expo?.android?.package;
  const bundleId = input?.bundleId || existingBundleId || generateBundleId(projectName);

  // Platforms
  const platforms = input?.platforms || ['ios', 'android'];

  // Check/generate eas.json
  const easJsonPath = join(cwd, 'eas.json');
  if (!(await fileExists(easJsonPath))) {
    const defaultEasJson = {
      cli: { version: '>= 13.0.0' },
      build: {
        development: {
          developmentClient: true,
          distribution: 'internal',
        },
        preview: {
          distribution: 'internal',
        },
        production: {},
      },
      submit: {
        production: {},
      },
    };
    try {
      await writeFile(easJsonPath, JSON.stringify(defaultEasJson, null, 2));
      generated.push('eas.json');
    } catch {
      issues.push('Failed to generate eas.json');
    }
  }

  // Build config
  const config: ShipMobileConfig = {
    projectName,
    bundleId,
    version,
    sdkVersion: sdkVersion || undefined,
    platforms,
    workflow,
  };

  const writeResult = await writeConfig(config, cwd);
  if (!writeResult.ok) {
    issues.push('Failed to write .shipmobile/config.json');
  } else {
    generated.push('.shipmobile/config.json');
  }

  return ok({
    project: {
      name: projectName,
      bundleId,
      sdkVersion,
      platforms,
      workflow,
      version,
    },
    issues,
    config,
    generated,
  });
}
