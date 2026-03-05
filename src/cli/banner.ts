/**
 * ShipMobile CLI — Banner & Command Display
 */

import chalk from 'chalk';
import { colors, hyperlink } from './theme.js';

const REPO_URL = 'https://github.com/ACRLABSDEV/shipmobile';

// ── Palette ──────────────────────────────────────────────────────
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
  border:  (s: string) => chalk.hex('#162030')(s),
};

// ── Helpers ──────────────────────────────────────────────────────
const W = () => process.stdout.columns || 80;

const sectionLabel = (name: string) => c.label(name);

const cmdRow = (colorFn: (s: string) => string, name: string, desc: string) =>
  colorFn(name.padEnd(12)) + ' ' + c.muted(desc);

// ── Gradient line — thin ─ with ocean gradient ───────────────────
function gradientLine(): string {
  const hexColors = ['#0369a1', '#0891b2', '#0e7490', '#0d9488', '#059669'];
  const segW = Math.floor(W() / hexColors.length);
  return hexColors.map(hex => chalk.hex(hex)('─'.repeat(segW))).join('');
}

// ── Captain Clawde — half-block rendering ─────────────────────────
// 20×16 pixel grid rendered with ▀/▄ half-blocks at 1 char per pixel.
// Packs 2 pixel rows per terminal line → 20 chars wide × 8 rows.
// Zero image deps, works everywhere.

const PAL: Record<string, string | null> = {
  '_': null,
  'K': '#06080e',   // outline
  'r': '#d81c0c',   // mid red
  'R': '#9a0e06',   // shadow red
  'o': '#f83820',   // highlight red
  'O': '#ff6644',   // brightest sheen
  'W': '#ffffff',   // eye white
  'hw': '#f2f2f2',  // hat white
  'hs': '#d4d4d4',  // hat shadow
  'hb': '#101828',  // hat brim band
  'hd': '#080e18',  // hat brim underside
  'G': '#d4a018',   // gold anchor
  'g': '#7a5c08',   // anchor shadow
};

const GRID: string[][] = [
  ['_','_','_','_','_','K','K','K','K','K','K','K','_','_','_','_','_','_','_','_'],
  ['_','_','_','_','K','hw','hw','G','hw','hw','hw','hw','K','_','_','_','_','_','_','_'],
  ['_','_','_','K','hw','hw','hs','g','hs','hw','hw','hw','hw','K','_','_','_','_','_','_'],
  ['_','K','K','hb','hb','hw','hw','hw','hw','hw','hb','hb','hd','hd','K','K','_','_','_','_'],
  ['_','_','K','r','r','r','r','r','r','r','r','r','r','K','_','_','_','_','_','_'],
  ['_','K','r','O','W','W','r','r','r','W','W','O','r','r','K','_','_','_','_','_'],
  ['_','K','r','O','W','r','r','r','r','r','W','O','r','r','K','_','_','_','_','_'],
  ['_','K','r','r','r','r','r','r','r','r','r','r','r','r','K','_','_','_','_','_'],
  ['K','o','o','K','r','r','r','r','r','r','r','r','K','o','o','K','_','_','_','_'],
  ['K','o','R','K','r','r','o','r','r','o','r','r','K','R','o','K','_','_','_','_'],
  ['_','K','o','K','r','r','r','r','r','r','r','r','K','o','K','_','_','_','_','_'],
  ['_','_','K','r','r','r','r','r','r','r','r','r','r','K','_','_','_','_','_','_'],
  ['_','_','K','r','r','r','r','r','r','r','r','r','r','K','_','_','_','_','_','_'],
  ['_','_','_','K','R','K','_','K','r','r','K','_','K','R','K','_','_','_','_','_'],
  ['_','_','_','K','R','K','_','K','r','r','K','_','K','R','K','_','_','_','_','_'],
  ['_','_','_','_','K','_','_','_','K','K','_','_','_','K','_','_','_','_','_','_'],
];

// Half-block renderer: pairs pixel rows, uses ▀ with fg=top, bg=bottom
function getMascotLines(): string[] {
  const lines: string[] = [];
  for (let y = 0; y < GRID.length; y += 2) {
    const topRow = GRID[y]!;
    const botRow = y + 1 < GRID.length ? GRID[y + 1]! : new Array(topRow.length).fill('_');
    let line = '';
    for (let x = 0; x < topRow.length; x++) {
      const top = PAL[topRow[x]!];
      const bot = PAL[botRow[x]!];
      if (!top && !bot) {
        line += ' ';
      } else if (top && bot) {
        line += chalk.hex(top).bgHex(bot)('▀');
      } else if (top && !bot) {
        line += chalk.hex(top)('▀');
      } else {
        line += chalk.hex(bot!)('▄');
      }
    }
    lines.push(line);
  }
  return lines;
}

// ── Logo block — Captain Clawde (20 wide × 8 tall) + text ────────
function logoBlock(version: string): string {
  const mascotLines = getMascotLines();
  const repoLink = hyperlink('github.com/ACRLABSDEV/shipmobile', REPO_URL);

  // 8 text slots — vertically center at eye level (half-block rows 2-3)
  const textLines: string[] = new Array(8).fill('');
  textLines[2] = c.label('ACR LABS');
  textLines[3] = chalk.hex('#22d3ee').bold('ShipMobile');
  textLines[4] = chalk.hex('#5a7a8a')(`v${version}`) + '  ' + repoLink;
  textLines[6] = chalk.italic.hex('#5a7a8a')('Your agent can build the app. ShipMobile ships it.');

  const MASCOT_CHAR_WIDTH = 20; // 20 pixels × 1 char each
  const GAP = '  ';
  const result: string[] = [];
  const maxLines = Math.max(mascotLines.length, textLines.length);
  for (let i = 0; i < maxLines; i++) {
    const mascot = i < mascotLines.length ? mascotLines[i]! : ' '.repeat(MASCOT_CHAR_WIDTH);
    const text = i < textLines.length ? textLines[i]! : '';
    result.push(`${mascot}${GAP}${text}`);
  }
  return result.join('\n');
}

// ── Usage box — shaded full-width block ──────────────────────────
function usageBox(): string {
  const w = W();
  const bg = chalk.bgHex('#0c1a2a');
  const pad = (content: string, visible: number) => bg(content + ' '.repeat(Math.max(0, w - visible)));
  const row = (label: string, cmdStr: string, arg: string, flag: string) => {
    const content = `  ${chalk.hex('#5a7a8a')(label.padEnd(7))}  ${chalk.hex('#22d3ee')(cmdStr)}${chalk.hex('#a78bfa')(arg)}${chalk.hex('#34d399')(flag)}`;
    const visW = 2 + 7 + 2 + cmdStr.length + arg.length + flag.length;
    return pad(content, visW);
  };

  return [
    pad('', 0),
    row('USAGE', 'shipmobile', ' <command>', ' [options]'),
    row('HELP', 'shipmobile', ' <command>', ' --help'),
    pad('', 0),
  ].join('\n');
}

// ── Main ──────────────────────────────────────────────────────────

export function printCommandList(version: string): void {
  const lines: string[] = [];

  lines.push(gradientLine());
  lines.push('');
  lines.push(logoBlock(version));
  lines.push(gradientLine());
  lines.push('');
  lines.push(sectionLabel('SETUP'));
  lines.push(cmdRow(c.green, 'login', 'Authenticate with Expo, Apple & Google Play'));
  lines.push(cmdRow(c.cyan, 'init', 'Detect project and create config'));
  lines.push(cmdRow(c.cyan, 'doctor', 'Run 23 health checks on your project'));
  lines.push('');
  lines.push(sectionLabel('STORE PREP'));
  lines.push(cmdRow(c.yellow, 'audit', 'Static analysis for store readiness'));
  lines.push(cmdRow(c.cyan, 'assets', 'Process icons, splash screens, screenshots'));
  lines.push(cmdRow(c.cyan, 'prepare', 'Generate store metadata & privacy policy'));
  lines.push('');
  lines.push(sectionLabel('BUILD & DEPLOY'));
  lines.push(cmdRow(c.green, 'build', 'Trigger cloud build via EAS'));
  lines.push(cmdRow(c.teal, 'status', 'Check build progress & history'));
  lines.push(cmdRow(c.cyan, 'preview', 'Preview links + QR codes for testing'));
  lines.push(cmdRow(c.green, 'submit', 'Submit to App Store / Play Store'));
  lines.push('');
  lines.push(sectionLabel('OTHER'));
  lines.push(cmdRow(c.purple, 'mcp', 'Start MCP server for AI agents'));
  lines.push(cmdRow(c.dim, 'reset', 'Clear local config and start fresh'));
  lines.push('');
  lines.push(usageBox());

  console.log(lines.join('\n'));
}

export function printHeader(command: string, description?: string): void {
  console.log();
  console.log(`  ${colors.brandBold('ShipMobile')} ${c.dim('·')} ${chalk.bold(command)}`);
  if (description) {
    console.log(`  ${c.muted(description)}`);
  }
  console.log(`  ${c.border('─'.repeat(52))}`);
  console.log();
}
