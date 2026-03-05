/**
 * ShipMobile CLI — Banner & Command Display
 *
 * Premium ocean-themed design matching the HTML mockup:
 * - Gradient header strip
 * - Compact pixel crab (half-block rendering) side-by-side with brand text
 * - Block letter title art with ocean gradient
 * - Grouped commands with section labels + color-coded names
 * - Usage block with left border accent
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import { figures, colors, divider, hyperlink } from './theme.js';

// Ocean gradient
const oceanGradient = gradient(['#0369a1', '#0891b2', '#0d9488', '#059669']);
const titleGradient = gradient(['#38bdf8', '#22d3ee', '#2dd4bf']);

// ═══════════════════════════════════════════════════════════════
// PIXEL CRAB — Half-block rendering (2 pixel rows per terminal line)
// Matches the HTML mockup's 10×9 pixel grid but renders in ~5 lines
// ═══════════════════════════════════════════════════════════════

function getPixelCrab(): string[] {
  // Palette: 0=transparent, 1=dark teal, 2=mid cyan, 3=bright blue, 4=white eye, 5=teal claw
  const pal: Record<number, string> = {
    1: '#0e7490',
    2: '#0891b2',
    3: '#38bdf8',
    4: '#f0fafa',
    5: '#2dd4bf',
  };

  // 10 cols × 9 rows pixel map (from the HTML mockup)
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

  // Render pairs of rows using ▀ (upper half block)
  // For each cell: fg = top pixel color, bg = bottom pixel color
  // ▀ shows top half in fg, bottom half in bg
  const lines: string[] = [];
  for (let r = 0; r < px.length; r += 2) {
    const topRow = px[r]!;
    const botRow = r + 1 < px.length ? px[r + 1]! : new Array(10).fill(0);
    let line = '';
    for (let c = 0; c < topRow.length; c++) {
      const top = topRow[c]!;
      const bot = botRow[c]!;
      if (top === 0 && bot === 0) {
        line += ' ';
      } else if (top !== 0 && bot === 0) {
        line += chalk.hex(pal[top]!)('▀');
      } else if (top === 0 && bot !== 0) {
        line += chalk.hex(pal[bot]!)('▄');
      } else {
        // Both filled: fg=top, bg=bottom
        line += chalk.hex(pal[top]!).bgHex(pal[bot]!)('▀');
      }
    }
    lines.push(line);
  }
  return lines;
}

// ═══════════════════════════════════════════════════════════════
// GRADIENT HEADER STRIP
// ═══════════════════════════════════════════════════════════════

function headerStrip(width = 70): string {
  return oceanGradient('━'.repeat(width));
}

// ═══════════════════════════════════════════════════════════════
// TITLE ART — Block letters with ocean gradient
// ═══════════════════════════════════════════════════════════════

export function getTitleArt(): string {
  const raw = [
    '███████╗██╗  ██╗██╗██████╗ ███╗   ███╗ ██████╗ ██████╗ ██╗██╗     ███████╗',
    '██╔════╝██║  ██║██║██╔══██╗████╗ ████║██╔═══██╗██╔══██╗██║██║     ██╔════╝',
    '███████╗███████║██║██████╔╝██╔████╔██║██║   ██║██████╔╝██║██║     █████╗  ',
    '╚════██║██╔══██║██║██╔═══╝ ██║╚██╔╝██║██║   ██║██╔══██╗██║██║     ██╔══╝  ',
    '███████║██║  ██║██║██║     ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║███████╗███████╗',
    '╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚══════╝',
  ];
  return raw.map(line => '  ' + oceanGradient(line)).join('\n');
}

const TAGLINE = 'Your agent can build the app. ShipMobile ships it.';
const REPO_URL = 'https://github.com/ACRLABSDEV/shipmobile';

// ═══════════════════════════════════════════════════════════════
// LOGO BLOCK — Compact pixel crab side-by-side with brand text
// ═══════════════════════════════════════════════════════════════

function renderLogoBlock(version: string): string {
  const crabLines = getPixelCrab(); // ~5 lines tall

  const supertitle = colors.muted('A C R   L A B S');
  const title = chalk.bold(titleGradient('ShipMobile'));
  const meta = `${colors.muted(`v${version}`)}  ${hyperlink(colors.muted('github.com/ACRLABSDEV/shipmobile'), REPO_URL)}`;

  // Crab is 10 chars wide, ~5 lines. Text aligns to rows 0-2.
  const textLines: string[] = [
    supertitle,        // row 0 — ACR LABS (next to crab top)
    title,             // row 1 — ShipMobile
    meta,              // row 2 — version + link
    '',                // row 3
    '',                // row 4
  ];

  const GAP = '  '; // gap between crab and text
  const CRAB_WIDTH = 10; // visible width of crab
  const result: string[] = [];

  const maxLines = Math.max(crabLines.length, textLines.length);
  for (let i = 0; i < maxLines; i++) {
    const crab = i < crabLines.length ? crabLines[i]! : ' '.repeat(CRAB_WIDTH);
    const text = i < textLines.length ? textLines[i]! : '';
    // Pad crab to fixed width (ANSI-safe)
    const crabVisible = stripAnsi(crab).length;
    const pad = ' '.repeat(Math.max(0, CRAB_WIDTH - crabVisible));
    result.push(`  ${crab}${pad}${GAP}${text}`);
  }

  return result.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// COMMAND SECTIONS
// ═══════════════════════════════════════════════════════════════

interface CmdEntry {
  name: string;
  desc: string;
  color: 'cyan' | 'green' | 'yellow' | 'purple' | 'teal' | 'dim';
}

interface CmdSection {
  label: string;
  commands: CmdEntry[];
}

const SECTIONS: CmdSection[] = [
  {
    label: 'Setup',
    commands: [
      { name: 'login',   desc: 'Authenticate with Expo, Apple & Google Play', color: 'green' },
      { name: 'init',    desc: 'Detect project and create config',            color: 'cyan' },
      { name: 'doctor',  desc: 'Run 23 health checks on your project',       color: 'cyan' },
    ],
  },
  {
    label: 'Store Prep',
    commands: [
      { name: 'audit',   desc: 'Static analysis for store readiness',         color: 'yellow' },
      { name: 'assets',  desc: 'Process icons, splash screens, screenshots',  color: 'cyan' },
      { name: 'prepare', desc: 'Generate store metadata & privacy policy',    color: 'cyan' },
    ],
  },
  {
    label: 'Build & Deploy',
    commands: [
      { name: 'build',   desc: 'Trigger cloud build via EAS',                 color: 'green' },
      { name: 'status',  desc: 'Check build progress & history',              color: 'teal' },
      { name: 'preview', desc: 'Preview links + QR codes for testing',        color: 'cyan' },
      { name: 'submit',  desc: 'Submit to App Store / Play Store',            color: 'green' },
    ],
  },
  {
    label: 'Other',
    commands: [
      { name: 'mcp',     desc: 'Start MCP server for AI agents',              color: 'purple' },
      { name: 'reset',   desc: 'Clear local config and start fresh',          color: 'dim' },
    ],
  },
];

function colorize(text: string, color: CmdEntry['color']): string {
  const map = {
    cyan: colors.cyan,
    green: colors.green,
    yellow: colors.yellow,
    purple: colors.purple,
    teal: colors.teal,
    dim: colors.muted,
  };
  return chalk.bold(map[color](text));
}

function renderSections(): string {
  const lines: string[] = [];
  const nameWidth = 14;

  for (const section of SECTIONS) {
    lines.push(`  ${colors.muted(section.label)}`);
    lines.push('');
    for (const cmd of section.commands) {
      const name = colorize(cmd.name.padEnd(nameWidth), cmd.color);
      const desc = colors.textDim(cmd.desc);
      lines.push(`  ${name}${desc}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// USAGE BLOCK — Left border accent
// ═══════════════════════════════════════════════════════════════

function renderUsageBlock(): string {
  const border = colors.cyan('│');
  const labelStyle = (t: string) => colors.muted(t.padEnd(8).toUpperCase());

  const line1 = `  ${border}  ${labelStyle('Usage')}${colors.cyan('shipmobile')} ${colors.purple('<command>')} ${colors.green('[options]')}`;
  const line2 = `  ${border}  ${labelStyle('Help')}${colors.cyan('shipmobile')} ${colors.purple('<command>')} ${colors.green('--help')}`;

  return `${line1}\n${line2}`;
}

// ═══════════════════════════════════════════════════════════════
// STRIP ANSI
// ═══════════════════════════════════════════════════════════════

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1B\][^\x07]*\x07/g, '').replace(/\x1B_[^\x1B]*\x1B\\/g, '');
}

// ═══════════════════════════════════════════════════════════════
// MAIN DISPLAY
// ═══════════════════════════════════════════════════════════════

/**
 * Full startup banner — shown on bare `shipmobile` command.
 */
export function printCommandList(version = '0.1.0'): void {
  console.log();
  console.log(`  ${headerStrip(68)}`);
  console.log();
  console.log(renderLogoBlock(version));
  console.log();
  console.log(`  ${colors.italic(colors.textDim(TAGLINE))}`);
  console.log();
  console.log(getTitleArt());
  console.log();
  console.log(`  ${divider(68)}`);
  console.log();
  console.log(renderSections());
  console.log(renderUsageBlock());
  console.log();
}

/** Short banner for --help */
export function printBanner(version = '0.1.0'): void {
  console.log();
  console.log(`  ${headerStrip(68)}`);
  console.log();
  console.log(renderLogoBlock(version));
  console.log();
  console.log(`  ${colors.italic(colors.textDim(TAGLINE))}`);
  console.log();
}

/** Compact header for subcommands */
export function printHeader(command: string, description?: string): void {
  console.log();
  console.log(`  ${colors.brandBold('ShipMobile')} ${colors.muted(figures.dot)} ${colors.bold(command)}`);
  if (description) {
    console.log(`  ${colors.textDim(description)}`);
  }
  console.log(`  ${divider(52)}`);
  console.log();
}

/** Plain text for MCP/logs (no ANSI) */
export const BANNER_PLAIN = `
  ███████╗██╗  ██╗██╗██████╗ ███╗   ███╗ ██████╗ ██████╗ ██╗██╗     ███████╗
  ██╔════╝██║  ██║██║██╔══██╗████╗ ████║██╔═══██╗██╔══██╗██║██║     ██╔════╝
  ███████╗███████║██║██████╔╝██╔████╔██║██║   ██║██████╔╝██║██║     █████╗
  ╚════██║██╔══██║██║██╔═══╝ ██║╚██╔╝██║██║   ██║██╔══██╗██║██║     ██╔══╝
  ███████║██║  ██║██║██║     ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║███████╗███████╗
  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚══════╝

  Your agent can build the app. ShipMobile ships it.
`;

// Legacy compat
export function getLobsterAscii(): string {
  return getPixelCrab().join('\n');
}
