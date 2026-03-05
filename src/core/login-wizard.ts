/**
 * Interactive login wizard for `shipmobile login`
 *
 * Detects existing connections, walks through what's missing.
 * Uses node:readline/promises for prompts, child_process for CLI tools.
 */

import { createInterface } from 'node:readline/promises';
import { execSync, spawn } from 'node:child_process';
import { stdin as input, stdout as output } from 'node:process';
import { colors, figures } from '../cli/theme.js';
import { readCredentials } from '../utils/config.js';
import * as login from './login.js';

// ─── Status Detection ────────────────────────────────────────────────

interface ConnectionStatus {
  expo: { connected: boolean; label: string };
  apple: { connected: boolean; label: string };
  google: { connected: boolean; label: string };
}

function runQuiet(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).toString().trim();
  } catch {
    return null;
  }
}

async function detectConnections(cwd?: string): Promise<ConnectionStatus> {
  const credResult = await readCredentials(cwd);
  const creds = credResult.ok ? credResult.data : {};

  // Expo: check stored creds, then try `eas whoami`
  let expo = { connected: false, label: 'Not connected' };
  if (creds.expo?.validated && creds.expo.username) {
    expo = { connected: true, label: `@${creds.expo.username} (${creds.expo.plan || 'free'})` };
  } else {
    const whoami = runQuiet('eas whoami 2>/dev/null');
    if (whoami && !whoami.includes('not logged in') && whoami.length > 0) {
      expo = { connected: true, label: `@${whoami} (eas cli)` };
    }
  }

  // Apple: delegated to EAS — connected if EAS is logged in
  let apple = { connected: false, label: 'Not connected' };
  if (creds.apple?.validated) {
    apple = { connected: true, label: creds.apple.teamName || 'via Expo/EAS' };
  } else if (expo.connected) {
    // Apple auth is handled by EAS during build/submit
    apple = { connected: true, label: 'via Expo/EAS (auto during build)' };
  }

  // Google: check stored creds, then try gcloud
  let google = { connected: false, label: 'Not connected' };
  if (creds.google?.validated && creds.google.projectId) {
    google = { connected: true, label: creds.google.projectId };
  } else {
    const token = runQuiet('gcloud auth application-default print-access-token 2>/dev/null');
    if (token && token.length > 20) {
      // Try to get project id
      const project = runQuiet('gcloud config get-value project 2>/dev/null');
      google = { connected: true, label: project || 'authenticated' };
    }
  }

  return { expo, apple, google };
}

// ─── Display Helpers ─────────────────────────────────────────────────

function statusLine(name: string, connected: boolean, label: string): string {
  const icon = connected ? colors.success(figures.tick) : colors.error(figures.cross);
  const padded = name.padEnd(16);
  return `  ${icon} ${padded}${connected ? colors.dim(label) : label}`;
}

// ─── Interactive Prompts ─────────────────────────────────────────────

function spawnInteractive(cmd: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

function isGcloudInstalled(): boolean {
  return runQuiet('which gcloud') !== null;
}

function isEasInstalled(): boolean {
  return runQuiet('which eas') !== null;
}

// ─── Main Wizard ─────────────────────────────────────────────────────

export async function runLoginWizard(cwd?: string): Promise<void> {
  console.log();
  console.log(`  ${colors.dim('Checking connections...')}`);
  console.log();

  const status = await detectConnections(cwd);

  // Display current status
  console.log(statusLine('Expo/EAS', status.expo.connected, status.expo.label));
  console.log(statusLine('Apple', status.apple.connected, status.apple.label));
  console.log(statusLine('Google Play', status.google.connected, status.google.label));
  console.log();

  const allConnected = status.expo.connected && status.apple.connected && status.google.connected;
  if (allConnected) {
    console.log(`  ${colors.success('All platforms connected!')}`);
    console.log();
    return;
  }

  const rl = createInterface({ input, output });

  try {
    // --- Expo ---
    if (!status.expo.connected) {
      if (isEasInstalled()) {
        console.log(`  ${colors.brandBold('Setting up Expo/EAS...')}`);
        console.log();
        const ok = await spawnInteractive('eas', ['login']);
        if (ok) {
          const whoami = runQuiet('eas whoami 2>/dev/null');
          if (whoami) {
            console.log(`  ${colors.success(figures.tick)} Expo/EAS connected ${colors.dim(`@${whoami}`)}`);
          }
        } else {
          console.log(`  ${colors.error(figures.cross)} Expo login failed. Try ${colors.suggestion('shipmobile login --expo-token <token>')} instead.`);
        }
        console.log();
      } else {
        console.log(`  ${colors.warning(figures.warning)} EAS CLI not installed. Use ${colors.suggestion('shipmobile login --expo-token <token>')} or install with ${colors.suggestion('npm i -g eas-cli')}`);
        console.log();
      }
    }

    // --- Apple ---
    // Apple auth is handled by EAS automatically during build/submit.
    // If EAS is connected, Apple is good to go.
    if (!status.apple.connected) {
      console.log(`  ${colors.brandBold('Apple')}`);
      console.log(`  ${colors.dim('Apple authentication is handled automatically by EAS during build and submit.')}`);
      console.log(`  ${colors.dim('Connect Expo/EAS first, then Apple auth happens via browser when needed.')}`);
      console.log();
    }

    // --- Google Play ---
    if (!status.google.connected) {
      console.log(`  ${colors.brandBold('Setting up Google Play...')}`);

      if (isGcloudInstalled()) {
        console.log(`  ${colors.dim('Opening browser for Google OAuth...')}`);
        console.log();
        const ok = await spawnInteractive('gcloud', ['auth', 'application-default', 'login']);
        if (ok) {
          const project = runQuiet('gcloud config get-value project 2>/dev/null');
          console.log(`  ${colors.success(figures.tick)} Google Play connected ${colors.dim(project || '')}`);
        } else {
          console.log(`  ${colors.error(figures.cross)} Google auth failed.`);
        }
      } else {
        console.log(`  ${colors.dim('gcloud CLI not found. Falling back to service account JSON.')}`);
        console.log();
        const saPath = await rl.question(`  ${colors.text('Path to service account JSON key:')} `);
        if (saPath.trim()) {
          const result = await login.loginGoogle({ serviceAccountPath: saPath.trim() }, cwd);
          if (result.ok) {
            const projectId = result.data.details.google?.projectId || '';
            console.log(`  ${colors.success(figures.tick)} Google Play connected ${colors.dim(projectId)}`);
          } else {
            console.log(`  ${colors.error(figures.cross)} Google: ${result.error.message}`);
          }
        } else {
          console.log(`  ${colors.dim('Skipped. Add later with')} ${colors.suggestion('shipmobile login --google')}`);
        }
      }
      console.log();
    }
  } finally {
    rl.close();
  }

  // Final status check
  const final = await detectConnections(cwd);
  const allDone = final.expo.connected && final.apple.connected && final.google.connected;
  if (allDone) {
    console.log(`  ${colors.successBold('All platforms connected!')}`);
  } else {
    const missing: string[] = [];
    if (!final.expo.connected) missing.push('Expo');
    if (!final.apple.connected) missing.push('Apple');
    if (!final.google.connected) missing.push('Google');
    console.log(`  ${colors.dim(`Still missing: ${missing.join(', ')}. Run`)} ${colors.suggestion('shipmobile login')} ${colors.dim('again anytime.')}`);
  }
  console.log();
}
