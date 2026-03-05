/**
 * ShipMobile CLI — Banner & Command Display
 *
 * Style aligned with Claude Code:
 * - Inline PNG sprite (iTerm2/Kitty) with ASCII fallback
 * - Clean semantic colors, aggressive dimming for hierarchy
 * - Unicode figures, no gratuitous emoji
 * - Compact, dense info display
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { figures, colors, divider } from './theme.js';

// Brand gradient
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
// ASCII LOBSTER (fallback when no inline image support)
// ═══════════════════════════════════════════════════════════════

export function getLobsterAscii(): string {
  // Larry the Lobster — colored with semantic approach
  const R  = chalk.hex('#e63946'); // body red
  const Rd = chalk.hex('#a81c2b'); // darker red (claws)
  const K  = chalk.hex('#2b2d42'); // outline dark
  const B  = chalk.hex('#1e3a6e'); // hat dark
  const Bl = chalk.hex('#3b7dd8'); // hat light

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
// TITLE
// ═══════════════════════════════════════════════════════════════

/** ASCII art title — compact block letters with gradient */
function getTitleArt(): string {
  const raw = [
    ' ╔═╗╦ ╦╦╔═╗╔╦╗╔═╗╔╗ ╦╦  ╔═╗',
    ' ╚═╗╠═╣║╠═╝║║║║ ║╠╩╗║║  ║╣ ',
    ' ╚═╝╩ ╩╩╩  ╩ ╩╚═╝╚═╝╩╩═╝╚═╝',
  ];
  return raw.map(line => '  ' + shipGradient(line)).join('\n');
}

function renderTitle(version: string): string {
  const art = getTitleArt();
  const ver = colors.dim(`  v${version}`);
  return `${art}\n${ver}`;
}

const TAGLINE = 'Ship React Native apps to the stores.';

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
 * Dense two-column layout, dimmed secondary info, keyboard hints.
 */
export function printCommandList(version = '0.1.0'): void {
  console.log();
  renderSprite();
  console.log();
  console.log(renderTitle(version));
  console.log(`  ${colors.dim(TAGLINE)}`);
  console.log(`  ${divider(52)}`);
  console.log();

  // Commands — clean columns, no emoji, status-colored
  const commands: [string, string, boolean][] = [
    ['login',    'Authenticate with Expo, Apple & Google',    true],
    ['init',     'Detect project and create config',          true],
    ['doctor',   'Run health checks (23 checks)',             true],
    ['audit',    'Static analysis for store readiness',       true],
    ['assets',   'Process icons, splash, screenshots',        true],
    ['prepare',  'Generate store metadata & privacy policy',  true],
    ['build',    'Trigger cloud build via EAS',               true],
    ['status',   'Check build progress',                      true],
    ['preview',  'Preview links + QR codes',                  true],
    ['submit',   'Submit to App Store / Play Store',          true],
    ['reset',    'Clear local config',                        true],
  ];

  const maxName = Math.max(...commands.map(c => c[0].length));

  for (const [name, desc, ready] of commands) {
    const padded = name.padEnd(maxName + 2);
    if (ready) {
      console.log(`  ${colors.brand(padded)}${colors.dim(desc)}`);
    } else {
      console.log(`  ${colors.dim(padded + desc + '  (soon)')}`);
    }
  }

  console.log();
  console.log(`  ${colors.dim('Also available as MCP server:')} ${colors.suggestion('shipmobile-mcp')}`);
  console.log();

  const footer = boxen(
    colors.dim('Usage  ') + chalk.white('shipmobile <command> [options]') + '\n' +
    colors.dim('Help   ') + chalk.white('shipmobile <command> --help'),
    {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: 'cyan',
      dimBorder: true,
    },
  );
  console.log(footer.split('\n').map(l => '  ' + l).join('\n'));
  console.log();
}

/** Short banner for --help */
export function printBanner(version = '0.1.0'): void {
  console.log();
  renderSprite();
  console.log();
  console.log(renderTitle(version));
  console.log(`  ${colors.dim(TAGLINE)}`);
  console.log();
}

/** Compact header for subcommands */
export function printHeader(command: string): void {
  console.log();
  console.log(`  ${colors.brandBold('ShipMobile')} ${colors.dim(figures.dot)} ${colors.dim(command)}`);
  console.log(`  ${divider(52)}`);
  console.log();
}

/** Plain text for MCP/logs (no ANSI) */
export const BANNER_PLAIN = `
  ╔═╗╦ ╦╦╔═╗╔╦╗╔═╗╔╗ ╦╦  ╔═╗
  ╚═╗╠═╣║╠═╝║║║║ ║╠╩╗║║  ║╣
  ╚═╝╩ ╩╩╩  ╩ ╩╚═╝╚═╝╩╩═╝╚═╝

  Ship React Native apps to the stores.
`;

export { getTitleArt };
