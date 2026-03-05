#!/usr/bin/env node
/**
 * ShipMobile CLI — entry point
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { printBanner, printHeader, printCommandList } from './cli/banner.js';
import { renderComingSoon } from './cli/renderer.js';
import { renderLoginResult, renderLoginStatus, renderInitResult, renderDoctorResult, renderAuditResult, renderAssetsResult, renderPrepareResult, renderBuildResult, renderStatusResult, renderPreviewResult } from './cli/renderer.js';
import * as login from './core/login.js';
import * as init from './core/init.js';
import * as doctor from './core/doctor.js';
import * as audit from './core/audit/index.js';
import * as assets from './core/assets.js';
import * as prepare from './core/prepare.js';
import * as build from './core/build.js';
import * as status from './core/status.js';
import * as preview from './core/preview.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
    return pkg.version as string;
  } catch {
    return '0.1.0';
  }
}

const version = getVersion();

const program = new Command();

program
  .name('shipmobile')
  .description('Ship React Native/Expo apps to App Store & Play Store')
  .version(version, '-v, --version')
  .addHelpText('beforeAll', () => {
    printBanner(version);
    return '';
  })
  .action(() => {
    // Bare `shipmobile` with no command — show branded command list
    printCommandList(version);
  });

// === LOGIN ===
program
  .command('login')
  .description('Authenticate with Apple, Expo, and Google')
  .option('--expo', 'Connect Expo/EAS account only')
  .option('--apple', 'Connect Apple Developer account only')
  .option('--google', 'Connect Google Play account only')
  .option('--status', 'Show current connection status')
  .action(async (options: { expo?: boolean; apple?: boolean; google?: boolean; status?: boolean }) => {
    if (options.status) {
      const result = await login.getStatus();
      renderLoginStatus(result);
      return;
    }

    printHeader('Account Setup');

    if (options.expo) {
      await runExpoLogin();
      return;
    }
    if (options.apple) {
      await runAppleLogin();
      return;
    }
    if (options.google) {
      await runGoogleLogin();
      return;
    }

    // Full interactive wizard
    await runFullLoginWizard();
  });

async function runExpoLogin() {
  const { input } = await import('@inquirer/prompts');
  const token = process.env.EXPO_TOKEN || await input({
    message: 'Expo access token (from https://expo.dev/settings/access-tokens):',
  });
  const result = await login.loginExpo({ token });
  renderLoginResult(result, 'Expo/EAS');
}

async function runAppleLogin() {
  const { input } = await import('@inquirer/prompts');
  console.log('\n  To create an App Store Connect API key:');
  console.log('  1. Go to https://appstoreconnect.apple.com/access/integrations/api');
  console.log('  2. Click "Generate API Key"');
  console.log('  3. Download the .p8 file\n');

  const keyId = await input({ message: 'API Key ID:' });
  const issuerId = await input({ message: 'Issuer ID:' });
  const keyPath = await input({ message: 'Path to .p8 key file:' });
  const result = await login.loginApple({ keyId, issuerId, keyPath });
  renderLoginResult(result, 'Apple Developer');
}

async function runGoogleLogin() {
  const { input } = await import('@inquirer/prompts');
  const serviceAccountPath = await input({
    message: 'Path to Google Play service account JSON key:',
  });
  const result = await login.loginGoogle({ serviceAccountPath });
  renderLoginResult(result, 'Google Play');
}

async function runFullLoginWizard() {
  const { confirm } = await import('@inquirer/prompts');

  console.log('  Step 1 of 3: Expo / EAS');
  await runExpoLogin();

  console.log('\n  Step 2 of 3: Apple Developer Account');
  const doApple = await confirm({ message: 'Connect Apple Developer account?', default: true });
  if (doApple) {
    await runAppleLogin();
  } else {
    console.log('  ⏭ Skipped — add later with `shipmobile login --apple`');
  }

  console.log('\n  Step 3 of 3: Google Play Console (optional)');
  const doGoogle = await confirm({ message: 'Connect Google Play?', default: false });
  if (doGoogle) {
    await runGoogleLogin();
  } else {
    console.log('  ⏭ Skipped — add later with `shipmobile login --google`');
  }

  console.log('\n  ✅ All set! Run `shipmobile init` to set up your project.\n');
}

// === INIT ===
program
  .command('init')
  .description('Initialize project for mobile deployment')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--bundle-id <id>', 'Bundle ID')
  .option('--platform <platforms...>', 'Platforms (ios, android)')
  .action(async (options: { path: string; bundleId?: string; platform?: string[] }) => {
    printHeader('Project Setup');
    const result = await init.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      bundleId: options.bundleId,
      platforms: options.platform,
    });
    renderInitResult(result);
  });

// === DOCTOR ===
program
  .command('doctor')
  .description('Run project health checks')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--fix', 'Auto-fix issues where possible')
  .action(async (options: { path: string; fix?: boolean }) => {
    printHeader('Project Health Check');
    const result = await doctor.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      fix: options.fix,
    });
    renderDoctorResult(result);
  });

// === AUDIT ===
program
  .command('audit')
  .description('Run static analysis audit on your project')
  .option('-p, --path <path>', 'Project path', '.')
  .option('-c, --category <category>', 'Run specific category (performance, memory, ux, compliance, security)')
  .option('--fix', 'Auto-fix issues where possible')
  .option('--diff', 'Compare with previous audit')
  .action(async (options: { path: string; category?: string; fix?: boolean; diff?: boolean }) => {
    printHeader('App Audit');
    const result = await audit.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      category: options.category,
      fix: options.fix,
      diff: options.diff,
    });
    renderAuditResult(result);
  });

// === ASSETS ===
program
  .command('assets')
  .description('Validate and process app assets (icons, splash, screenshots)')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--icon <iconPath>', 'Path to source icon')
  .option('--splash <splashPath>', 'Path to splash screen')
  .option('--screenshots <dir>', 'Path to screenshots directory')
  .option('--foreground <path>', 'Adaptive icon foreground layer')
  .option('--background <path>', 'Adaptive icon background layer')
  .action(async (options: { path: string; icon?: string; splash?: string; screenshots?: string; foreground?: string; background?: string }) => {
    printHeader('Asset Validation');
    const result = await assets.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      iconPath: options.icon,
      splashPath: options.splash,
      screenshotsDir: options.screenshots,
      foregroundPath: options.foreground,
      backgroundPath: options.background,
    });
    renderAssetsResult(result);
  });

// === PREPARE ===
program
  .command('prepare')
  .description('Generate and validate app store metadata')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--name <name>', 'App name')
  .option('--description <desc>', 'App description')
  .option('--keywords <keywords...>', 'Keywords')
  .option('--category <category>', 'App category')
  .action(async (options: { path: string; name?: string; description?: string; keywords?: string[]; category?: string }) => {
    printHeader('Metadata Preparation');
    const result = await prepare.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      appName: options.name,
      description: options.description,
      keywords: options.keywords,
      category: options.category,
    });
    renderPrepareResult(result);
  });

// === BUILD ===
program
  .command('build')
  .description('Trigger EAS build for iOS and/or Android')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--platform <platforms...>', 'Platforms (ios, android)')
  .option('--profile <profile>', 'Build profile (development, preview, production)', 'production')
  .option('--wait', 'Wait for build to complete')
  .option('--skip-validation', 'Skip pre-build doctor checks')
  .action(async (options: { path: string; platform?: string[]; profile?: string; wait?: boolean; skipValidation?: boolean }) => {
    printHeader('Build');
    const result = await build.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      platforms: options.platform as ('ios' | 'android')[] | undefined,
      profile: options.profile as 'development' | 'preview' | 'production',
      wait: options.wait,
      skipValidation: options.skipValidation,
    });
    renderBuildResult(result);
  });

// === STATUS ===
program
  .command('status')
  .description('Check build status and progress')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--build-id <id>', 'Specific build ID')
  .option('--logs', 'Stream build logs')
  .option('--history', 'Show build history')
  .option('--platform <platform>', 'Filter by platform (ios, android)')
  .action(async (options: { path: string; buildId?: string; logs?: boolean; history?: boolean; platform?: string }) => {
    printHeader('Build Status');
    const result = await status.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      buildId: options.buildId,
      logs: options.logs,
      history: options.history,
      platform: options.platform as 'ios' | 'android' | undefined,
    });
    renderStatusResult(result);
  });

// === PREVIEW ===
program
  .command('preview')
  .description('Generate shareable preview links and QR codes')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--build-id <id>', 'Specific build ID')
  .option('--platform <platform>', 'Filter by platform (ios, android)')
  .action(async (options: { path: string; buildId?: string; platform?: string }) => {
    printHeader('Preview');
    const result = await preview.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      buildId: options.buildId,
      platform: options.platform as 'ios' | 'android' | undefined,
    });
    renderPreviewResult(result);
  });

// === PLACEHOLDER COMMANDS ===
for (const cmd of ['submit']) {
  program
    .command(cmd)
    .description(`${cmd} — coming soon`)
    .action(() => renderComingSoon(cmd));
}

program
  .command('mcp')
  .description('Start MCP server for AI agents')
  .action(async () => {
    const { startMcpServer } = await import('./mcp/server.js');
    await startMcpServer();
  });

program.parse();
