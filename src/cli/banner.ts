/**
 * ShipMobile CLI — Banner & Command Display
 *
 * Matches the premium design spec exactly:
 * - Compact pixel crab (half-block) side-by-side with brand text
 * - Thin dim dividers between sections
 * - ALL CAPS letter-spaced section labels
 * - Color-coded commands with proper column alignment
 * - Usage box with box-drawing chars + surface background
 * - No gradient header strip, no oversized ASCII art
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import { figures, colors } from './theme.js';

// Title gradient
const titleGradient = gradient(['#38bdf8', '#22d3ee', '#2dd4bf']);

// Exact colors from the design spec
const c = {
  text:     chalk.hex('#cce4f0'),
  textDim:  chalk.hex('#4e7080'),
  muted:    chalk.hex('#3d5a6e'),
  dimLink:  chalk.hex('#5a7a8a'),
  cyan:     chalk.hex('#22d3ee'),
  blue:     chalk.hex('#38bdf8'),
  teal:     chalk.hex('#2dd4bf'),
  green:    chalk.hex('#34d399'),
  yellow:   chalk.hex('#fbbf24'),
  purple:   chalk.hex('#a78bfa'),
  border:   chalk.hex('#162030'),
  surface:  '#0d1821',
};

// ═══════════════════════════════════════════════════════════════
// PIXEL CRAB — Half-block rendering, ~5 terminal lines
// Exact 10×9 pixel grid from the HTML mockup canvas
// ═══════════════════════════════════════════════════════════════

function getPixelCrab(): string[] {
  const pal: Record<number, string> = {
    1: '#0e7490',  // dark teal
    2: '#0891b2',  // mid cyan
    3: '#38bdf8',  // bright blue
    4: '#f0fafa',  // white (eyes)
    5: '#2dd4bf',  // teal (claws)
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
      if (top === 0 && bot === 0) {
        line += ' ';
      } else if (top !== 0 && bot === 0) {
        line += chalk.hex(pal[top]!)('▀');
      } else if (top === 0 && bot !== 0) {
        line += chalk.hex(pal[bot]!)('▄');
      } else {
        line += chalk.hex(pal[top]!).bgHex(pal[bot]!)('▀');
      }
    }
    lines.push(line);
  }
  return lines;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1B\][^\x07]*\x07/g, '').replace(/\x1B_[^\x1B]*\x1B\\/g, '');
}

/** Thin dim divider spanning content width */
function thinDivider(width = 68): string {
  return c.border('─'.repeat(width));
}

/** Letter-spaced section label: "SETUP" → "S E T U P" */
function sectionLabel(text: string): string {
  return c.muted(text.toUpperCase().split('').join(' '));
}

/** Terminal width for divider */
function tw(): number {
  return Math.min(process.stdout.columns || 80, 76);
}

// ═══════════════════════════════════════════════════════════════
// LOGO BLOCK — Compact pixel crab + brand text side-by-side
// ═══════════════════════════════════════════════════════════════

function renderLogoBlock(version: string): string {
  const crabLines = getPixelCrab();

  const supertitle = c.muted('A C R   L A B S');
  const title = chalk.bold(titleGradient('ShipMobile'));
  const meta = `${c.dimLink(`v${version}`)}  ${c.dimLink('github.com/ACRLABSDEV/shipmobile')}`;

  const textLines: string[] = [
    supertitle,
    title,
    meta,
    '',
    '',
  ];

  const CRAB_WIDTH = 10;
  const GAP = '  ';
  const result: string[] = [];

  const maxLines = Math.max(crabLines.length, textLines.length);
  for (let i = 0; i < maxLines; i++) {
    const crab = i < crabLines.length ? crabLines[i]! : ' '.repeat(CRAB_WIDTH);
    const text = i < textLines.length ? textLines[i]! : '';
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

const colorMap: Record<CmdEntry['color'], (s: string) => string> = {
  cyan:   (s) => c.cyan(chalk.bold(s)),
  green:  (s) => c.green(chalk.bold(s)),
  yellow: (s) => c.yellow(chalk.bold(s)),
  purple: (s) => c.purple(chalk.bold(s)),
  teal:   (s) => c.teal(chalk.bold(s)),
  dim:    (s) => c.muted(s),
};

const SECTIONS: { label: string; commands: CmdEntry[] }[] = [
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

function renderSections(): string {
  const lines: string[] = [];
  const nameWidth = 16; // 12 char name + 4 char gap

  for (let i = 0; i < SECTIONS.length; i++) {
    const section = SECTIONS[i]!;

    // Thin divider before each section
    lines.push(`  ${thinDivider(tw() - 4)}`);
    lines.push('');
    lines.push(`  ${sectionLabel(section.label)}`);
    lines.push('');

    for (const cmd of section.commands) {
      const name = colorMap[cmd.color](cmd.name.padEnd(nameWidth));
      const desc = c.textDim(cmd.desc);
      lines.push(`  ${name}${desc}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// USAGE BLOCK — Box-drawing with surface background
// ═══════════════════════════════════════════════════════════════

function renderUsageBlock(): string {
  const border = c.cyan;
  const bg = chalk.bgHex(c.surface);
  const label = (t: string) => c.dimLink(t.padEnd(8).toUpperCase());
  const w = tw() - 6;

  const padLine = (content: string) => {
    const visible = stripAnsi(content).length;
    const remaining = Math.max(0, w - visible - 2);
    return bg(`${content}${' '.repeat(remaining)}`);
  };

  const topBorder =    `  ${border('╷')}`;
  const line1 = `  ${border('│')}  ${padLine(`${label('Usage')}${c.cyan('shipmobile')} ${c.purple('<command>')} ${c.green('[options]')}`)}`;
  const line2 = `  ${border('│')}  ${padLine(`${label('Help')}${c.cyan('shipmobile')} ${c.purple('<command>')} ${c.green('--help')}`)}`;
  const bottomBorder = `  ${border('╵')}`;

  return `${topBorder}\n${line1}\n${line2}\n${bottomBorder}`;
}

// ═══════════════════════════════════════════════════════════════
// TITLE ART — Block letters (kept for future/verbose use)
// ═══════════════════════════════════════════════════════════════

export function getTitleArt(): string {
  const oceanGradient = gradient(['#0369a1', '#0891b2', '#0d9488', '#059669']);
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

// ═══════════════════════════════════════════════════════════════
// MAIN DISPLAY
// ═══════════════════════════════════════════════════════════════

export function printCommandList(version = '0.1.0'): void {
  console.log();
  console.log(renderLogoBlock(version));
  console.log();
  console.log(`  ${chalk.italic(c.dimLink(TAGLINE))}`);
  console.log();
  console.log(renderSections());
  console.log(renderUsageBlock());
  console.log();
}

export function printBanner(version = '0.1.0'): void {
  console.log();
  console.log(renderLogoBlock(version));
  console.log();
  console.log(`  ${chalk.italic(c.dimLink(TAGLINE))}`);
  console.log();
}

export function printHeader(command: string, description?: string): void {
  console.log();
  console.log(`  ${colors.brandBold('ShipMobile')} ${c.muted(figures.dot)} ${chalk.bold(command)}`);
  if (description) {
    console.log(`  ${c.textDim(description)}`);
  }
  console.log(`  ${thinDivider(52)}`);
  console.log();
}

export const BANNER_PLAIN = `
  ShipMobile — Your agent can build the app. ShipMobile ships it.
`;

export function getLobsterAscii(): string {
  return getPixelCrab().join('\n');
}
