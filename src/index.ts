#!/usr/bin/env node
/**
 * ShipMobile CLI — entry point
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { printHeader, printCommandList } from './cli/banner.js';
import { renderLoginResult, renderLoginStatus, renderInitResult, renderDoctorResult, renderAuditResult, renderAssetsResult, renderPrepareResult, renderBuildResult, renderStatusResult, renderPreviewResult, renderSubmitResult, renderResetResult, renderUpdateResult, renderRollbackResult } from './cli/renderer.js';
import * as login from './core/login.js';
import * as init from './core/init.js';
import * as doctor from './core/doctor.js';
import * as audit from './core/audit/index.js';
import * as assets from './core/assets.js';
import * as prepare from './core/prepare.js';
import * as build from './core/build.js';
import * as status from './core/status.js';
import * as preview from './core/preview.js';
import * as submit from './core/submit.js';
import * as reset from './core/reset.js';
import * as update from './core/update.js';
import * as rollback from './core/rollback.js';

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
    // Note: Commander doesn't support async helpText callbacks well,
    // so banner uses sync fallback in help mode
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
  .option('--expo-token <token>', 'Expo access token (non-interactive, for CI)')
  .option('--apple-key-id <keyId>', 'Apple API Key ID (non-interactive, for CI)')
  .option('--apple-issuer-id <issuerId>', 'Apple Issuer ID (non-interactive, for CI)')
  .option('--apple-key-path <keyPath>', 'Path to Apple .p8 key file (non-interactive, for CI)')
  .option('--google-service-account <path>', 'Path to Google service account JSON (non-interactive, for CI)')
  .action(async (options: {
    expo?: boolean; apple?: boolean; google?: boolean; status?: boolean;
    expoToken?: string; appleKeyId?: string; appleIssuerId?: string; appleKeyPath?: string;
    googleServiceAccount?: string;
  }) => {
    if (options.status) {
      const result = await login.getStatus();
      renderLoginStatus(result);
      return;
    }

    // Non-interactive CI flags
    if (options.expoToken) {
      printHeader('Account Setup');
      const result = await login.loginExpo({ token: options.expoToken });
      renderLoginResult(result, 'Expo/EAS');
      return;
    }
    if (options.appleKeyId && options.appleIssuerId && options.appleKeyPath) {
      printHeader('Account Setup');
      const result = await login.loginApple({
        keyId: options.appleKeyId,
        issuerId: options.appleIssuerId,
        keyPath: options.appleKeyPath,
      });
      renderLoginResult(result, 'Apple Developer');
      return;
    }
    if (options.googleServiceAccount) {
      printHeader('Account Setup');
      const result = await login.loginGoogle({ serviceAccountPath: options.googleServiceAccount });
      renderLoginResult(result, 'Google Play');
      return;
    }

    // Single-provider interactive (legacy flags)
    if (options.expo || options.apple || options.google) {
      printHeader('Account Setup');
      if (options.expo) {
        await runSingleExpoLogin();
      } else if (options.apple) {
        await runSingleAppleLogin();
      } else if (options.google) {
        await runSingleGoogleLogin();
      }
      return;
    }

    // Default: interactive wizard
    printHeader('Account Setup');
    const { runLoginWizard } = await import('./core/login-wizard.js');
    await runLoginWizard();
  });

async function runSingleExpoLogin() {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const token = process.env.EXPO_TOKEN || await rl.question('  Expo access token: ');
    const result = await login.loginExpo({ token: token.trim() });
    renderLoginResult(result, 'Expo/EAS');
  } finally { rl.close(); }
}

async function runSingleAppleLogin() {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('\n  To create an App Store Connect API key:');
    console.log('  1. Go to https://appstoreconnect.apple.com/access/integrations/api');
    console.log('  2. Click "Generate API Key"');
    console.log('  3. Download the .p8 file\n');
    const keyId = await rl.question('  API Key ID: ');
    const issuerId = await rl.question('  Issuer ID: ');
    const keyPath = await rl.question('  Path to .p8 key file: ');
    const result = await login.loginApple({ keyId: keyId.trim(), issuerId: issuerId.trim(), keyPath: keyPath.trim() });
    renderLoginResult(result, 'Apple Developer');
  } finally { rl.close(); }
}

async function runSingleGoogleLogin() {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const saPath = await rl.question('  Path to Google Play service account JSON key: ');
    const result = await login.loginGoogle({ serviceAccountPath: saPath.trim() });
    renderLoginResult(result, 'Google Play');
  } finally { rl.close(); }
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
    await renderPreviewResult(result);
  });

// === SUBMIT ===
program
  .command('submit')
  .description('Submit builds to App Store Connect and Google Play')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--platform <platform>', 'Platform (ios, android)')
  .option('--track <track>', 'Google Play track (internal, alpha, beta, production)', 'production')
  .option('--skip-preflight', 'Skip pre-flight checks')
  .action(async (options: { path: string; platform?: string; track?: string; skipPreflight?: boolean }) => {
    printHeader('Submit');
    const result = await submit.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      platform: options.platform as 'ios' | 'android' | undefined,
      track: options.track as 'internal' | 'alpha' | 'beta' | 'production' | undefined,
      skipPreflight: options.skipPreflight,
    });
    renderSubmitResult(result);
  });

// === RESET ===
program
  .command('reset')
  .description('Clear all local ShipMobile config (.shipmobile/) and start fresh')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--force', 'Skip confirmation')
  .action(async (options: { path: string; force?: boolean }) => {
    if (!options.force) {
      try {
        const { confirm } = await import('@inquirer/prompts');
        const yes = await confirm({ message: 'This will delete all ShipMobile config. Continue?', default: false });
        if (!yes) {
          console.log('  Cancelled.');
          return;
        }
      } catch {
        // Non-interactive, proceed
      }
    }
    const result = await reset.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      force: options.force,
    });
    renderResetResult(result);
  });

// === UPDATE (OTA) ===
program
  .command('update')
  .description('Publish an OTA update via EAS Update')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--channel <channel>', 'Update channel (production, staging, preview)', 'production')
  .option('--message <message>', 'Update message/description')
  .option('--platform <platform>', 'Target platform (ios, android, all)', 'all')
  .option('--branch <branch>', 'EAS branch name')
  .option('--non-interactive', 'Skip interactive prompts')
  .action(async (options: { path: string; channel?: string; message?: string; platform?: string; branch?: string; nonInteractive?: boolean }) => {
    printHeader('OTA Update');
    const result = await update.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      channel: options.channel,
      message: options.message,
      platform: options.platform as 'ios' | 'android' | 'all' | undefined,
      branch: options.branch,
      nonInteractive: options.nonInteractive,
    });
    renderUpdateResult(result);
  });

// === ROLLBACK ===
program
  .command('rollback')
  .description('Roll back an OTA update to a previous version')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--channel <channel>', 'Update channel', 'production')
  .option('--group <groupId>', 'Specific update group ID to roll back to')
  .option('--platform <platform>', 'Target platform (ios, android, all)', 'all')
  .option('--non-interactive', 'Skip interactive prompts')
  .action(async (options: { path: string; channel?: string; group?: string; platform?: string; nonInteractive?: boolean }) => {
    printHeader('Rollback');
    const result = await rollback.execute({
      projectPath: options.path === '.' ? undefined : options.path,
      channel: options.channel,
      group: options.group,
      platform: options.platform as 'ios' | 'android' | 'all' | undefined,
      nonInteractive: options.nonInteractive,
    });
    renderRollbackResult(result);
  });

program
  .command('mcp')
  .description('Start MCP server for AI agents')
  .action(async () => {
    const { startMcpServer } = await import('./mcp/server.js');
    await startMcpServer();
  });

program.parse();
