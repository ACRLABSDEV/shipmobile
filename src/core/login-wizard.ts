/**
 * Interactive login wizard for `shipmobile login`
 *
 * Detects existing connections, displays them clearly,
 * then asks the user what they'd like to do — one provider at a time.
 */

import { createInterface } from 'node:readline/promises';
import { execSync, spawn } from 'node:child_process';
import { stdin as input, stdout as output } from 'node:process';
import { colors, figures } from '../cli/theme.js';
import { password } from '@inquirer/prompts';
import { readCredentials, writeCredentials, type CredentialData } from '../utils/config.js';
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
  const creds: CredentialData = credResult.ok ? { ...credResult.data } : {};
  let dirty = false;

  let expo = { connected: false, label: 'Not connected' };
  if (creds.expo?.validated && creds.expo.username) {
    expo = { connected: true, label: `@${creds.expo.username} (${creds.expo.plan || 'free'})` };
  } else {
    const whoami = runQuiet('eas whoami 2>/dev/null');
    if (whoami && !whoami.includes('not logged in') && whoami.length > 0) {
      expo = { connected: true, label: `@${whoami} (eas cli)` };
      // Persist so doctor can see it
      creds.expo = {
        token: '__eas_cli__',
        username: whoami,
        validated: true,
        validatedAt: new Date().toISOString(),
      };
      dirty = true;
    }
  }

  let apple = { connected: false, label: 'Not connected' };
  if (creds.apple?.validated) {
    apple = { connected: true, label: creds.apple.teamName || 'via Expo/EAS' };
  } else if (expo.connected) {
    apple = { connected: true, label: 'via Expo/EAS (auto during build)' };
    // Persist Apple as connected via EAS
    creds.apple = {
      apiKeyId: '__eas_managed__',
      issuerId: '__eas_managed__',
      keyPath: '__eas_managed__',
      teamName: 'via Expo/EAS',
      validated: true,
      validatedAt: new Date().toISOString(),
    };
    dirty = true;
  }

  let google = { connected: false, label: 'Not connected' };
  if (creds.google?.validated && creds.google.projectId) {
    google = { connected: true, label: creds.google.projectId };
  } else {
    const token = runQuiet('gcloud auth application-default print-access-token 2>/dev/null');
    if (token && token.length > 20) {
      const project = runQuiet('gcloud config get-value project 2>/dev/null');
      google = { connected: true, label: project || 'authenticated' };
      // Persist so doctor can see it
      creds.google = {
        serviceAccountPath: '__gcloud_adc__',
        projectId: project || 'gcloud',
        validated: true,
        validatedAt: new Date().toISOString(),
      };
      dirty = true;
    }
  }

  // Save detected credentials
  if (dirty) {
    await writeCredentials(creds, cwd);
  }

  return { expo, apple, google };
}

// ─── Display Helpers ─────────────────────────────────────────────────

function statusLine(name: string, connected: boolean, label: string): string {
  const icon = connected ? colors.success(figures.tick) : colors.error(figures.cross);
  const padded = name.padEnd(16);
  const labelText = connected ? colors.dim(label) : colors.dim(label);
  return `  ${icon} ${padded}${labelText}`;
}

function divider(): void {
  console.log(colors.dim('  ─────────────────────────────────────'));
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

async function ask(rl: ReturnType<typeof createInterface>, question: string, options: string[]): Promise<string> {
  const optStr = options.map((o, i) => `${colors.brand(`${i + 1}`)}${colors.dim(')')} ${o}`).join('  ');
  console.log(`  ${optStr}`);
  console.log();
  const answer = await rl.question(`  ${colors.dim('>')} `);
  return answer.trim();
}

// ─── Provider Setup Flows ────────────────────────────────────────────

async function setupExpo(rl: ReturnType<typeof createInterface>, cwd?: string): Promise<boolean> {
  console.log();
  console.log(`  ${colors.brandBold('Expo/EAS Setup')}`);
  divider();
  console.log();

  if (isEasInstalled()) {
    console.log(`  ${colors.text('How would you like to connect?')}`);
    console.log();
    const choice = await ask(rl, '', ['EAS CLI login (browser)', 'Access token (CI/headless)']);

    if (choice === '1') {
      console.log();
      console.log(`  ${colors.text('Opening EAS login...')}`);
      console.log();
      const success = await spawnInteractive('eas', ['login']);
      if (success) {
        const whoami = runQuiet('eas whoami 2>/dev/null');
        console.log();
        console.log(`  ${colors.success(figures.tick)} Expo/EAS connected ${colors.dim(whoami ? `@${whoami}` : '')}`);
        return true;
      } else {
        console.log();
        console.log(`  ${colors.error(figures.cross)} Login failed. Try again or use an access token.`);
        return false;
      }
    } else if (choice === '2') {
      console.log();
      const token = await password({
        message: 'Expo access token:',
        mask: '*',
      });
      if (token.trim()) {
        const result = await login.loginExpo({ token: token.trim() }, cwd);
        if (result.ok) {
          const username = result.data.details.expo?.username || '';
          console.log(`  ${colors.success(figures.tick)} Expo/EAS connected ${colors.dim(`@${username}`)}`);
          return true;
        } else {
          console.log(`  ${colors.error(figures.cross)} ${result.error.message}`);
          return false;
        }
      }
      return false;
    } else {
      console.log(`  ${colors.text('Skipped.')}`);
      return false;
    }
  } else {
    console.log(`  ${colors.warning(figures.warning)} EAS CLI not installed.`);
    console.log(`  ${colors.dim('Install with:')} ${colors.suggestion('npm i -g eas-cli')}`);
    console.log();
    console.log(`  ${colors.dim('Or connect with an access token:')}`);
    console.log();
    const token = await password({
      message: 'Expo access token (or press Enter to skip):',
      mask: '*',
    });
    if (token.trim()) {
      const result = await login.loginExpo({ token: token.trim() }, cwd);
      if (result.ok) {
        console.log(`  ${colors.success(figures.tick)} Expo/EAS connected`);
        return true;
      } else {
        console.log(`  ${colors.error(figures.cross)} ${result.error.message}`);
        return false;
      }
    }
    console.log(`  ${colors.text('Skipped.')}`);
    return false;
  }
}

async function setupApple(rl: ReturnType<typeof createInterface>, expoConnected: boolean, cwd?: string): Promise<boolean> {
  console.log();
  console.log(`  ${colors.brandBold('Apple Developer Setup')}`);
  divider();
  console.log();

  if (expoConnected) {
    console.log(`  ${colors.text('Apple authentication is handled automatically by EAS')}`);
    console.log(`  ${colors.text('during build and submit. Since Expo is connected,')}`);
    console.log(`  ${colors.text("you're good to go!")}`);
    console.log();
    console.log(`  ${colors.text('Want to set up direct App Store Connect API access instead?')}`);
    console.log();
    const choice = await ask(rl, '', ['Use EAS (recommended)', 'Set up API key manually']);

    if (choice === '2') {
      return await setupAppleManual(rl, cwd);
    }
    console.log();
    console.log(`  ${colors.success(figures.tick)} Apple connected via Expo/EAS`);
    return true;
  } else {
    console.log(`  ${colors.text('For App Store Connect API access, you need an API key.')}`);
    console.log(`  ${colors.dim('Generate one at:')} ${colors.suggestion('https://appstoreconnect.apple.com/access/api')}`);
    console.log();
    return await setupAppleManual(rl, cwd);
  }
}

async function setupAppleManual(rl: ReturnType<typeof createInterface>, cwd?: string): Promise<boolean> {
  console.log();
  const keyId = await rl.question(`  ${colors.text('API Key ID:')} `);
  if (!keyId.trim()) { console.log(`  ${colors.text('Skipped.')}`); return false; }

  const issuerId = await rl.question(`  ${colors.text('Issuer ID:')} `);
  if (!issuerId.trim()) { console.log(`  ${colors.text('Skipped.')}`); return false; }

  const keyPath = await rl.question(`  ${colors.text('Path to .p8 key file:')} `);
  if (!keyPath.trim()) { console.log(`  ${colors.text('Skipped.')}`); return false; }

  const result = await login.loginApple({
    keyId: keyId.trim(),
    issuerId: issuerId.trim(),
    keyPath: keyPath.trim(),
  }, cwd);

  if (result.ok) {
    const teamName = result.data.details.apple?.teamName || '';
    console.log(`  ${colors.success(figures.tick)} Apple connected ${colors.dim(teamName)}`);
    return true;
  } else {
    console.log(`  ${colors.error(figures.cross)} ${result.error.message}`);
    return false;
  }
}

async function setupGoogle(rl: ReturnType<typeof createInterface>, cwd?: string): Promise<boolean> {
  console.log();
  console.log(`  ${colors.brandBold('Google Play Setup')}`);
  divider();
  console.log();

  const hasGcloud = isGcloudInstalled();

  if (hasGcloud) {
    console.log(`  ${colors.text('How would you like to connect?')}`);
    console.log();
    const choice = await ask(rl, '', ['Google Cloud CLI (browser)', 'Service account JSON']);

    if (choice === '1') {
      console.log();
      console.log(`  ${colors.text('Opening Google OAuth...')}`);
      console.log();
      const success = await spawnInteractive('gcloud', ['auth', 'application-default', 'login']);
      if (success) {
        const project = runQuiet('gcloud config get-value project 2>/dev/null');
        console.log();
        console.log(`  ${colors.success(figures.tick)} Google Play connected ${colors.dim(project || '')}`);
        return true;
      } else {
        console.log();
        console.log(`  ${colors.error(figures.cross)} Google auth failed.`);
        return false;
      }
    } else if (choice === '2') {
      return await setupGoogleServiceAccount(rl, cwd);
    } else {
      console.log(`  ${colors.text('Skipped.')}`);
      return false;
    }
  } else {
    console.log(`  ${colors.text('gcloud CLI not found. Using service account JSON.')}`);
    console.log();
    return await setupGoogleServiceAccount(rl, cwd);
  }
}

async function setupGoogleServiceAccount(rl: ReturnType<typeof createInterface>, cwd?: string): Promise<boolean> {
  console.log();
  console.log(`  ${colors.text('Create a service account at:')}`);
  console.log(`  ${colors.suggestion('https://console.cloud.google.com/iam-admin/serviceaccounts')}`);
  console.log();
  const saPath = await rl.question(`  ${colors.text('Path to service account JSON (or press Enter to skip):')} `);
  if (!saPath.trim()) { console.log(`  ${colors.text('Skipped.')}`); return false; }

  const result = await login.loginGoogle({ serviceAccountPath: saPath.trim() }, cwd);
  if (result.ok) {
    const projectId = result.data.details.google?.projectId || '';
    console.log(`  ${colors.success(figures.tick)} Google Play connected ${colors.dim(projectId)}`);
    return true;
  } else {
    console.log(`  ${colors.error(figures.cross)} ${result.error.message}`);
    return false;
  }
}

// ─── Main Wizard ─────────────────────────────────────────────────────

export async function runLoginWizard(cwd?: string): Promise<void> {
  console.log();
  console.log(`  ${colors.text('Checking connections...')}`);
  console.log();

  const status = await detectConnections(cwd);

  // Display current status
  console.log(`  ${colors.brandBold('Current Connections')}`);
  divider();
  console.log();
  console.log(statusLine('Expo/EAS', status.expo.connected, status.expo.label));
  console.log(statusLine('Apple', status.apple.connected, status.apple.label));
  console.log(statusLine('Google Play', status.google.connected, status.google.label));
  console.log();

  const allConnected = status.expo.connected && status.apple.connected && status.google.connected;
  if (allConnected) {
    console.log(`  ${colors.success(figures.tick)} All platforms connected. You're ready to ship!`);
    console.log();

    // Offer to reconfigure
    const rl = createInterface({ input, output });
    try {
      const answer = await rl.question(`  ${colors.text('Reconfigure a connection? (y/N):')} `);
      if (answer.trim().toLowerCase() !== 'y') {
        console.log();
        return;
      }
    } finally {
      rl.close();
    }
  }

  const rl = createInterface({ input, output });

  try {
    // Ask what they want to do
    const disconnected: string[] = [];
    if (!status.expo.connected) disconnected.push('Expo/EAS');
    if (!status.apple.connected) disconnected.push('Apple');
    if (!status.google.connected) disconnected.push('Google Play');

    if (disconnected.length > 0 && disconnected.length < 3) {
      console.log(`  ${colors.dim(`Missing: ${disconnected.join(', ')}`)}`);
      console.log();
    }

    console.log(`  ${colors.text('What would you like to do?')}`);
    console.log();

    const menuOptions: { label: string; action: () => Promise<void> }[] = [];

    if (!status.expo.connected || allConnected) {
      menuOptions.push({ label: `${status.expo.connected ? 'Reconfigure' : 'Connect'} Expo/EAS`, action: async () => { await setupExpo(rl, cwd); } });
    }
    if (!status.apple.connected || allConnected) {
      menuOptions.push({ label: `${status.apple.connected ? 'Reconfigure' : 'Connect'} Apple`, action: async () => { await setupApple(rl, status.expo.connected, cwd); } });
    }
    if (!status.google.connected || allConnected) {
      menuOptions.push({ label: `${status.google.connected ? 'Reconfigure' : 'Connect'} Google Play`, action: async () => { await setupGoogle(rl, cwd); } });
    }

    if (!allConnected) {
      menuOptions.push({ label: 'Connect all missing', action: async () => {
        if (!status.expo.connected) await setupExpo(rl, cwd);
        // Re-detect after Expo since it affects Apple
        const updated = await detectConnections(cwd);
        if (!status.apple.connected) await setupApple(rl, updated.expo.connected, cwd);
        if (!status.google.connected) await setupGoogle(rl, cwd);
      }});
    }

    menuOptions.push({ label: 'Exit', action: async () => {} });

    // Display menu
    for (let i = 0; i < menuOptions.length; i++) {
      console.log(`  ${colors.brand(`${i + 1}`)}${colors.dim(')')} ${menuOptions[i].label}`);
    }
    console.log();

    const choice = await rl.question(`  ${colors.dim('>')} `);
    const idx = parseInt(choice.trim(), 10) - 1;

    if (idx >= 0 && idx < menuOptions.length) {
      await menuOptions[idx].action();
    } else {
      console.log(`  ${colors.dim('Invalid choice.')}`);
    }

    // Final status
    console.log();
    const final = await detectConnections(cwd);
    console.log(`  ${colors.brandBold('Updated Connections')}`);
    divider();
    console.log();
    console.log(statusLine('Expo/EAS', final.expo.connected, final.expo.label));
    console.log(statusLine('Apple', final.apple.connected, final.apple.label));
    console.log(statusLine('Google Play', final.google.connected, final.google.label));
    console.log();

    const allDone = final.expo.connected && final.apple.connected && final.google.connected;
    if (allDone) {
      console.log(`  ${colors.success(figures.tick)} All platforms connected. You're ready to ship! 🦞`);
    } else {
      const missing: string[] = [];
      if (!final.expo.connected) missing.push('Expo');
      if (!final.apple.connected) missing.push('Apple');
      if (!final.google.connected) missing.push('Google');
      console.log(`  ${colors.dim(`Still missing: ${missing.join(', ')}.`)} Run ${colors.suggestion('shipmobile login')} ${colors.dim('anytime.')}`);
    }
    console.log();
  } finally {
    rl.close();
  }
}
