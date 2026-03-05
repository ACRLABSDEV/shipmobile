#!/usr/bin/env node
/**
 * ShipMobile CLI — entry point
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { printBanner, printHeader } from './cli/banner.js';
import { renderComingSoon } from './cli/renderer.js';
import { renderLoginResult, renderLoginStatus, renderInitResult, renderDoctorResult } from './cli/renderer.js';
import * as login from './core/login.js';
import * as init from './core/init.js';
import * as doctor from './core/doctor.js';

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

// === PLACEHOLDER COMMANDS ===
for (const cmd of ['audit', 'assets', 'prepare', 'build', 'status', 'preview', 'submit']) {
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
