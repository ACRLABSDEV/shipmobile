/**
 * ShipMobile CLI — Banner & Command Display
 *
 * Inline PNG sprite (iTerm2/Kitty) with ASCII lobster fallback.
 * Original block-letter title art with ocean gradient.
 * Claude Code-aligned: semantic colors, dimColor hierarchy, thin borders, no emoji.
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { figures, colors, divider, thinBox, dotLine, hyperlink } from './theme.js';

// Brand gradient (ocean)
const shipGradient = gradient(['#0077b6', '#00b4d8', '#90e0ef']);

// ═══════════════════════════════════════════════════════════════
// INLINE IMAGE RENDERING
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
// ASCII LOBSTER — Larry the Sailor (fallback)
// ═══════════════════════════════════════════════════════════════

export function getLobsterAscii(): string {
  const R  = chalk.hex('#e63946');
  const Rd = chalk.hex('#a81c2b');
  const K  = chalk.hex('#2b2d42');
  const B  = chalk.hex('#1e3a6e');
  const Bl = chalk.hex('#3b7dd8');

  const rows = [
    `     ${K('▄▄▄▄▄▄▄▄▄')}          `,
    `    ${K('█')}${B('▓▓▓▓▓▓▓▓▓')}${K('█')}         `,
    `  ${K('██')}${B('▓▓▓')}${Bl('▒')}${B('▓▓▓▓')}${K('██')}        `,
    `  ${K('██')}${B('▓▓▓')}${Bl('▒▒')}${B('▓▓▓')}${K('██')}        `,
    `  ${K('█████████████')}        `,
    `   ${K('█')}${R('▓▓▓▓▓▓▓▓▓')}${K('█')}         `,
    `   ${K('█')}${R('▓▓')}${K('█')}${R('▓▓▓')}${K('█')}${R('▓▓')}${K('█')}         `,
    ` ${Rd('▓')}${K('█')}${R('▓▓')}${K('██')}${R('▓')}${K('██')}${R('▓▓')}${K('█')}${Rd('▓')}        `,
    ` ${Rd('▓')}${K('█')}${R('▓▓▓▓▓▓▓▓▓')}${K('█')}${Rd('▓')}        `,
    `   ${K('█')}${R('▓▓▓▓▓▓▓▓▓')}${K('█')}         `,
    `   ${K('█')}${R('▓')}${K('█')}${R('▓▓▓▓▓')}${K('█')}${R('▓')}${K('█')}         `,
    `   ${K('███')}${R('▓▓')} ${R('▓▓')}${K('███')}         `,
    `      ${K('██')}   ${K('██')}            `,
  ];

  return rows.map(row => '  ' + row).join('\n');
}

// ═══════════════════════════════════════════════════════════════
// TITLE ART — Original block letters with ocean gradient
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
  return raw.map(line => shipGradient(line)).join('\n');
}

const TAGLINE = 'Your agent can build the app. ShipMobile ships it.';
const REPO_URL = 'https://github.com/ACRLABSDEV/shipmobile';

// ═══════════════════════════════════════════════════════════════
// MAIN DISPLAY
// ═══════════════════════════════════════════════════════════════

function renderSprite(): void {
  const inlineImage = tryRenderSprite();
  if (inlineImage) {
    process.stdout.write('  ' + inlineImage + '\n');
  } else {
    console.log(getLobsterAscii());
  }
}

/**
 * Full startup banner — shown on bare `shipmobile` command.
 * Sprite + title art + command list in Claude Code style.
 */
export function printCommandList(version = '0.1.0'): void {
  console.log();
  renderSprite();
  console.log();
  console.log(getTitleArt());
  console.log();
  console.log(`  ${colors.dim(TAGLINE)}`);
  console.log(`  ${colors.dim(`v${version}`)} ${colors.dim(figures.dot)} ${hyperlink(colors.dim(REPO_URL), REPO_URL)}`);
  console.log();
  console.log(`  ${dotLine(60)}`);
  console.log();

  // Commands — Claude Code style: no emoji, brand name + dim description
  const commands: [string, string][] = [
    ['login',    'Authenticate with Expo, Apple & Google Play'],
    ['init',     'Detect project and create config'],
    ['doctor',   'Run 23 health checks on your project'],
    ['audit',    'Static analysis for store readiness'],
    ['assets',   'Process icons, splash screens, screenshots'],
    ['prepare',  'Generate store metadata & privacy policy'],
    ['build',    'Trigger cloud build via EAS'],
    ['status',   'Check build progress & history'],
    ['preview',  'Preview links + QR codes for testing'],
    ['submit',   'Submit to App Store / Play Store'],
    ['reset',    'Clear local config and start fresh'],
    ['mcp',      'Start MCP server for AI agents'],
  ];

  const maxName = Math.max(...commands.map(c => c[0].length));

  for (const [name, desc] of commands) {
    const padded = name.padEnd(maxName + 2);
    console.log(`  ${colors.brand(padded)} ${colors.dim(desc)}`);
  }

  console.log();

  // Footer — thin box instead of heavy boxen
  const usageBox = thinBox(
    `${colors.dim('Usage')}  ${chalk.white('shipmobile <command> [options]')}\n${colors.dim('Help')}   ${chalk.white('shipmobile <command> --help')}`,
    { borderColor: colors.dim },
  );
  console.log(usageBox.split('\n').map(l => '  ' + l).join('\n'));
  console.log();
}

/** Short banner for --help */
export function printBanner(version = '0.1.0'): void {
  console.log();
  renderSprite();
  console.log();
  console.log(getTitleArt());
  console.log();
  console.log(`  ${colors.dim(TAGLINE)}`);
  console.log(`  ${colors.dim(`v${version}`)}`);
  console.log();
}

/** Compact header for subcommands — brand + dot + command + description */
export function printHeader(command: string, description?: string): void {
  console.log();
  console.log(`  ${colors.brandBold('ShipMobile')} ${colors.dim(figures.dot)} ${colors.bold(command)}`);
  if (description) {
    console.log(`  ${colors.dim(description)}`);
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

// getTitleArt already exported above
