/**
 * ShipMobile CLI — Banner & Command Display
 *
 * Direct port of Coopes' printHelp.js reference implementation.
 * Converted from CJS chalk@4 to ESM chalk@5 + our theme imports.
 */

import chalk from 'chalk';
import terminalImage from 'terminal-image';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { figures, colors } from './theme.js';

// ── Palette (exact hex values from the reference) ──────────────────
const c = {
  cyan:    (s: string) => chalk.hex('#22d3ee').bold(s),
  blue:    (s: string) => chalk.hex('#38bdf8')(s),
  teal:    (s: string) => chalk.hex('#2dd4bf').bold(s),
  green:   (s: string) => chalk.hex('#34d399').bold(s),
  yellow:  (s: string) => chalk.hex('#fbbf24')(s),
  purple:  (s: string) => chalk.hex('#a78bfa').bold(s),
  dim:     (s: string) => chalk.hex('#3d5a6e')(s),
  muted:   (s: string) => chalk.hex('#4e7080')(s),
  text:    (s: string) => chalk.hex('#cce4f0')(s),
  label:   (s: string) => chalk.hex('#3d5a6e')(s),
  surface: (s: string) => chalk.bgHex('#0d1821')(s),
  border:  (s: string) => chalk.hex('#162030')(s),
};

// ── Helpers ────────────────────────────────────────────────────────
const W = () => process.stdout.columns || 80;
const divider = () => c.border('─'.repeat(W()));

// Section label: compact, NO letter-spacing, small
const sectionLabel = (name: string) => '\n' + c.label(name) + '\n';

// Command row: fixed 12-char left col, description right
const cmdRow = (colorFn: (s: string) => string, name: string, desc: string) =>
  colorFn(name.padEnd(12)) + ' ' + c.muted(desc);

// ── Header gradient bar ───────────────────────────────────────────
function gradientBar(): string {
  const hexColors = ['#0369a1', '#0891b2', '#0e7490', '#0d9488', '#059669'];
  const segW = Math.floor(W() / hexColors.length);
  return hexColors.map(hex => chalk.hex(hex)('─'.repeat(segW))).join('') + '\n';
}

// ── Pixel crab — half-block rendering ─────────────────────────────
function getPixelCrab(): string[] {
  const pal: Record<number, string> = {
    1: '#0e7490', 2: '#0891b2', 3: '#38bdf8', 4: '#f0fafa', 5: '#2dd4bf',
  };
  const px = [
    [0,1,0,0,0,0,0,0,1,0],
    [1,1,0,0,0,0,0,0,1,1],
    [0,1,2,3,2,2,3,2,1,0],
    [1,2,2,2,2,2,2,2,2,1],
    [0,2,4,2,2,2,2,4,2,0],
    [0,2,2,3,2,2,3,2,2,0],
    [1,2,2,2,2,2,2,2,2,1],
    [0,5,2,0,2,2,0,2,5,0],
    [0,0,5,0,0,0,0,5,0,0],
  ];
  const lines: string[] = [];
  for (let r = 0; r < px.length; r += 2) {
    const topRow = px[r]!;
    const botRow = r + 1 < px.length ? px[r + 1]! : new Array(10).fill(0);
    let line = '';
    for (let col = 0; col < topRow.length; col++) {
      const top = topRow[col]!;
      const bot = botRow[col]!;
      if (top === 0 && bot === 0) line += ' ';
      else if (top !== 0 && bot === 0) line += chalk.hex(pal[top]!)('▀');
      else if (top === 0 && bot !== 0) line += chalk.hex(pal[bot]!)('▄');
      else line += chalk.hex(pal[top]!).bgHex(pal[bot]!)('▀');
    }
    lines.push(line);
  }
  return lines;
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1B\][^\x07]*\x07/g, '').replace(/\x1B_[^\x1B]*\x1B\\/g, '');
}

// ── Render mascot via terminal-image (constrained to 10 cols × 5 rows) ──
async function renderMascot(): Promise<string[]> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const spritePath = join(__dirname, '..', 'assets', 'sailor-sprite-transparent.png');
    const img = readFileSync(spritePath);
    const rendered = await terminalImage.buffer(img, { width: 10, height: 5 });
    return rendered.trimEnd().split('\n');
  } catch {
    // Fallback to half-block pixel crab if terminal-image fails
    return getPixelCrab();
  }
}

// ── Logo block — mascot side-by-side with text ──────────────────────
async function logoBlock(version: string): Promise<string> {
  const mascotLines = await renderMascot();
  const textLines = [
    c.label('ACR LABS'),
    chalk.hex('#22d3ee').bold('ShipMobile'),
    chalk.hex('#5a7a8a')(`v${version}`) + '  ' + c.blue('github.com/ACRLABSDEV/shipmobile'),
    '',
    '',
  ];
  const MASCOT_WIDTH = 10;
  const GAP = '  ';
  const result: string[] = [];
  const maxLines = Math.max(mascotLines.length, textLines.length);
  for (let i = 0; i < maxLines; i++) {
    const mascot = i < mascotLines.length ? mascotLines[i]! : ' '.repeat(MASCOT_WIDTH);
    const text = i < textLines.length ? textLines[i]! : '';
    const mascotVisible = stripAnsi(mascot).length;
    const pad = ' '.repeat(Math.max(0, MASCOT_WIDTH - mascotVisible));
    result.push(`${mascot}${pad}${GAP}${text}`);
  }
  return result.join('\n');
}

// ── Usage box ─────────────────────────────────────────────────────
function usageBox(): string {
  const borderChar = chalk.hex('#22d3ee')('│');
  const pad = ' ';
  const row = (label: string, cmdStr: string, arg: string, flag: string) =>
    borderChar + pad + chalk.hex('#5a7a8a')(label.padEnd(7)) + ' ' +
    chalk.hex('#22d3ee')(cmdStr) + chalk.hex('#a78bfa')(arg) + chalk.hex('#34d399')(flag);

  return [
    chalk.hex('#162030')('╶' + '─'.repeat(W() - 2) + '╴'),
    row('USAGE', 'shipmobile', ' <command>', ' [options]'),
    row('HELP ', 'shipmobile', ' <command>', ' --help'),
    chalk.hex('#162030')('╶' + '─'.repeat(W() - 2) + '╴'),
  ].join('\n');
}

// ── Main ──────────────────────────────────────────────────────────

export async function printCommandList(version = '0.1.0'): Promise<void> {
  const lines: string[] = [];

  // Gradient top bar
  lines.push(gradientBar());

  // Logo block
  lines.push(await logoBlock(version));
  lines.push('');

  // Tagline
  lines.push(chalk.italic.hex('#5a7a8a')('Your agent can build the app. ShipMobile ships it.'));
  lines.push('');

  // ASCII wordmark — commented out per spec (uncomment if renders cleanly at 4 lines)
  // lines.push(getTitleArt());
  // lines.push('');

  lines.push(divider());

  // SETUP
  lines.push(sectionLabel('SETUP'));
  lines.push(cmdRow(c.green, 'login', 'Authenticate with Expo, Apple & Google Play'));
  lines.push(cmdRow(c.cyan, 'init', 'Detect project and create config'));
  lines.push(cmdRow(c.cyan, 'doctor', 'Run 23 health checks on your project'));
  lines.push(divider());

  // STORE PREP
  lines.push(sectionLabel('STORE PREP'));
  lines.push(cmdRow(c.yellow, 'audit', 'Static analysis for store readiness'));
  lines.push(cmdRow(c.cyan, 'assets', 'Process icons, splash screens, screenshots'));
  lines.push(cmdRow(c.cyan, 'prepare', 'Generate store metadata & privacy policy'));
  lines.push(divider());

  // BUILD & DEPLOY
  lines.push(sectionLabel('BUILD & DEPLOY'));
  lines.push(cmdRow(c.green, 'build', 'Trigger cloud build via EAS'));
  lines.push(cmdRow(c.teal, 'status', 'Check build progress & history'));
  lines.push(cmdRow(c.cyan, 'preview', 'Preview links + QR codes for testing'));
  lines.push(cmdRow(c.green, 'submit', 'Submit to App Store / Play Store'));
  lines.push(divider());

  // OTHER
  lines.push(sectionLabel('OTHER'));
  lines.push(cmdRow(c.purple, 'mcp', 'Start MCP server for AI agents'));
  lines.push(cmdRow(c.dim, 'reset', 'Clear local config and start fresh'));
  lines.push('');

  lines.push(usageBox());
  lines.push('');

  console.log(lines.join('\n'));
}

export async function printBanner(version = '0.1.0'): Promise<void> {
  console.log();
  console.log(gradientBar());
  console.log(await logoBlock(version));
  console.log();
  console.log(chalk.italic.hex('#5a7a8a')('Your agent can build the app. ShipMobile ships it.'));
  console.log();
}

export function printHeader(command: string, description?: string): void {
  console.log();
  console.log(`  ${colors.brandBold('ShipMobile')} ${c.dim(figures.dot)} ${chalk.bold(command)}`);
  if (description) {
    console.log(`  ${c.muted(description)}`);
  }
  console.log(`  ${c.border('─'.repeat(52))}`);
  console.log();
}

// ASCII wordmark kept for future use
export function getTitleArt(): string {
  const lines = [
    ' ___ _  _ ___ ___ __  __  ___  ___ ___ _    ___ ',
    '/ __| || |_ _| _ \\  \\/  |/ _ \\| _ )_ _| |  | __|',
    '\\__ \\ __ || ||  _/ |\\/| | (_) | _ \\| || |__| _| ',
    '|___/_||_|___|_| |_|  |_|\\___/|___/___|____|___|',
  ];
  const gradient = require('gradient-string');
  return lines.map(line => '  ' + gradient(['#38bdf8', '#22d3ee', '#2dd4bf'])(line)).join('\n');
}

export const BANNER_PLAIN = `ShipMobile — Your agent can build the app. ShipMobile ships it.`;

export function getLobsterAscii(): string {
  return getPixelCrab().join('\n');
}
