/**
 * ShipMobile CLI — Banner & Command Display
 *
 * Matches the premium ocean-themed design mockup:
 * - Gradient header strip
 * - Pixel crab ASCII + brand block beside it
 * - Grouped commands with section labels
 * - Color-coded command names
 * - Usage block with left border accent
 * - Ocean palette throughout
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { figures, colors, divider, hyperlink } from './theme.js';

// Ocean gradient for header strip and title
const oceanGradient = gradient(['#0369a1', '#0891b2', '#0d9488', '#059669']);

// ═══════════════════════════════════════════════════════════════
// INLINE IMAGE RENDERING (iTerm2/Kitty/WezTerm)
// ═══════════════════════════════════════════════════════════════

function detectImageProtocol(): 'iterm' | 'kitty' | null {
  const env = process.env;
  if (env.TERM_PROGRAM === 'iTerm.app' || env.ITERM_SESSION_ID) return 'iterm';
  if (env.TERM === 'xterm-kitty') return 'kitty';
  if (env.TERM_PROGRAM === 'WezTerm') return 'iterm';
  return null;
}

function renderItermImage(pngData: Buffer, widthCells = 24): string {
  const b64 = pngData.toString('base64');
  return `\x1b]1337;File=inline=1;width=${widthCells};preserveAspectRatio=1:${b64}\x07`;
}

function renderKittyImage(pngData: Buffer, widthCells = 24): string {
  const b64 = pngData.toString('base64');
  const chunks: string[] = [];
  const chunkSize = 4096;
  for (let i = 0; i < b64.length; i += chunkSize) {
    const chunk = b64.slice(i, i + chunkSize);
    const isLast = i + chunkSize >= b64.length;
    if (i === 0) {
      chunks.push(`\x1b_Ga=T,f=100,t=d,c=${widthCells},m=${isLast ? 0 : 1};${chunk}\x1b\\`);
    } else {
      chunks.push(`\x1b_Gm=${isLast ? 0 : 1};${chunk}\x1b\\`);
    }
  }
  return chunks.join('');
}

function tryRenderSprite(): string | null {
  const protocol = detectImageProtocol();
  if (!protocol) return null;
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const spritePath = join(__dirname, '..', 'assets', 'sailor-sprite-transparent.png');
    const pngData = readFileSync(spritePath);
    return protocol === 'kitty'
      ? renderKittyImage(pngData, 20)
      : renderItermImage(pngData, 20);
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// ASCII CRAB — Ocean palette pixel art (terminal fallback)
// ═══════════════════════════════════════════════════════════════

function getCrabAscii(): string {
  const D = chalk.hex('#0e7490');  // dark teal (shell dark)
  const M = chalk.hex('#0891b2');  // mid cyan (shell)
  const B = chalk.hex('#38bdf8');  // bright blue (highlight)
  const W = chalk.hex('#f0fafa');  // white (eyes)
  const T = chalk.hex('#2dd4bf');  // teal (claw tips)

  // 10x9 pixel crab matching the mockup
  const rows = [
    `${D('▄')}${M(' ')}        ${D('▄')}`,
    `${D('█▄')}        ${D('▄█')}`,
    ` ${D('█')}${M('▓')}${B('▒')}${M('▓▓')}${B('▒')}${M('▓')}${D('█')} `,
    `${D('█')}${M('▓▓▓▓▓▓▓▓')}${D('█')}`,
    ` ${M('▓')}${W('█')}${M('▓▓▓▓')}${W('█')}${M('▓')} `,
    ` ${M('▓▓')}${B('▒')}${M('▓▓')}${B('▒')}${M('▓▓')} `,
    `${D('█')}${M('▓▓▓▓▓▓▓▓')}${D('█')}`,
    ` ${T('▓')}${M('▓')} ${M('▓▓')} ${M('▓')}${T('▓')} `,
    `  ${T('▓')}      ${T('▓')}  `,
  ];

  return rows.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// GRADIENT HEADER STRIP
// ═══════════════════════════════════════════════════════════════

function headerStrip(width = 70): string {
  // Gradient bar using block chars
  const bar = oceanGradient('━'.repeat(width));
  return bar;
}

// ═══════════════════════════════════════════════════════════════
// TITLE ART — Big block letters (for --verbose or special display)
// ═══════════════════════════════════════════════════════════════

export function getTitleArt(): string {
  const raw = [
    '  ███████╗██╗  ██╗██╗██████╗ ███╗   ███╗ ██████╗ ██████╗ ██╗██╗     ███████╗',
    '  ██╔════╝██║  ██║██║██╔══██╗████╗ ████║██╔═══██╗██╔══██╗██║██║     ██╔════╝',
    '  ███████╗███████║██║██████╔╝██╔████╔██║██║   ██║██████╔╝██║██║     █████╗  ',
    '  ╚════██║██╔══██║██║██╔═══╝ ██║╚██╔╝██║██║   ██║██╔══██╗██║██║     ██╔══╝  ',
    '  ███████║██║  ██║██║██║     ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║███████╗███████╗',
    '  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚══════╝',
  ];
  return raw.map(line => oceanGradient(line)).join('\n');
}

const TAGLINE = 'Your agent can build the app. ShipMobile ships it.';
const REPO_URL = 'https://github.com/ACRLABSDEV/shipmobile';

// ═══════════════════════════════════════════════════════════════
// LOGO BLOCK — Crab + Text side by side
// ═══════════════════════════════════════════════════════════════

function renderLogoBlock(version: string): string {
  const inlineImage = tryRenderSprite();

  // Text portion (right side of crab)
  const supertitle = colors.muted('A C R   L A B S');
  const title = gradient(['#38bdf8', '#22d3ee', '#2dd4bf']).multiline('ShipMobile');
  const titleBig = chalk.bold(title);
  const meta = `${colors.muted(`v${version}`)}  ${hyperlink(colors.muted(REPO_URL), REPO_URL)}`;

  if (inlineImage) {
    // Inline image — render image then text below
    const lines: string[] = [];
    lines.push('  ' + inlineImage);
    lines.push(`  ${supertitle}`);
    lines.push(`  ${titleBig}`);
    lines.push(`  ${meta}`);
    return lines.join('\n');
  }

  // ASCII crab side-by-side with text
  const crabLines = getCrabAscii().split('\n');
  const textLines = [
    '',
    '',
    supertitle,
    titleBig,
    meta,
    '',
    '',
    '',
    '',
  ];

  const crabWidth = 14; // visible width of crab art
  const result: string[] = [];
  const maxLines = Math.max(crabLines.length, textLines.length);

  for (let i = 0; i < maxLines; i++) {
    const crab = i < crabLines.length ? crabLines[i]! : '';
    const text = i < textLines.length ? textLines[i]! : '';
    // Pad crab column (ANSI-safe padding)
    result.push(`  ${crab}${''.padEnd(Math.max(0, crabWidth - stripAnsi(crab).length))}   ${text}`);
  }

  return result.join('\n');
}

/** Strip ANSI escape codes for width calculation */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1B\][^\x07]*\x07/g, '').replace(/\x1B_[^\x1B]*\x1B\\/g, '');
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
    label: 'SETUP',
    commands: [
      { name: 'login',   desc: 'Authenticate with Expo, Apple & Google Play', color: 'green' },
      { name: 'init',    desc: 'Detect project and create config',            color: 'cyan' },
      { name: 'doctor',  desc: 'Run 23 health checks on your project',       color: 'cyan' },
    ],
  },
  {
    label: 'STORE PREP',
    commands: [
      { name: 'audit',   desc: 'Static analysis for store readiness',         color: 'yellow' },
      { name: 'assets',  desc: 'Process icons, splash screens, screenshots',  color: 'cyan' },
      { name: 'prepare', desc: 'Generate store metadata & privacy policy',    color: 'cyan' },
    ],
  },
  {
    label: 'BUILD & DEPLOY',
    commands: [
      { name: 'build',   desc: 'Trigger cloud build via EAS',                 color: 'green' },
      { name: 'status',  desc: 'Check build progress & history',              color: 'teal' },
      { name: 'preview', desc: 'Preview links + QR codes for testing',        color: 'cyan' },
      { name: 'submit',  desc: 'Submit to App Store / Play Store',            color: 'green' },
    ],
  },
  {
    label: 'OTHER',
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

// Re-export for backward compat
export function getLobsterAscii(): string {
  return getCrabAscii();
}
