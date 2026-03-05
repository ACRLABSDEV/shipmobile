/**
 * ShipMobile CLI — Premium Banner & Command Display
 * Renders actual PNG sprite inline (iTerm2/Kitty protocol) with ASCII fallback
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Gradients
const shipGradient = gradient(['#0066ff', '#00d4ff', '#6366f1']);
const accentGradient = gradient(['#ff6b6b', '#ee5a24', '#ff9f43']);

// === INLINE IMAGE RENDERING ===

/**
 * Detect if the terminal supports inline images.
 * - iTerm2: ITERM_SESSION_ID or TERM_PROGRAM=iTerm.app
 * - Kitty: TERM=xterm-kitty
 * - WezTerm: TERM_PROGRAM=WezTerm
 */
function detectImageProtocol(): 'iterm' | 'kitty' | null {
  const env = process.env;

  if (env.TERM_PROGRAM === 'iTerm.app' || env.ITERM_SESSION_ID) {
    return 'iterm';
  }
  if (env.TERM === 'xterm-kitty') {
    return 'kitty';
  }
  if (env.TERM_PROGRAM === 'WezTerm') {
    return 'iterm'; // WezTerm supports iTerm2 protocol
  }
  return null;
}

/**
 * Render a PNG inline using iTerm2 Inline Images Protocol.
 * ESC ] 1337 ; File=[params] : base64data BEL
 */
function renderItermImage(pngData: Buffer, widthCells: number = 32): string {
  const b64 = pngData.toString('base64');
  return `\x1b]1337;File=inline=1;width=${widthCells};preserveAspectRatio=1:${b64}\x07`;
}

/**
 * Render a PNG inline using Kitty Graphics Protocol.
 */
function renderKittyImage(pngData: Buffer, widthCells: number = 32): string {
  const b64 = pngData.toString('base64');
  // Kitty uses chunked transfer for large images
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

/**
 * Try to load and render the sprite PNG inline.
 * Returns the escape sequence string, or null if not supported.
 */
function tryRenderSprite(): string | null {
  const protocol = detectImageProtocol();
  if (!protocol) return null;

  try {
    // Resolve sprite path relative to built output
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // Sprite is at: <project>/assets/sailor-sprite-transparent.png
    const spritePath = join(__dirname, '..', 'assets', 'sailor-sprite-transparent.png');
    const pngData = readFileSync(spritePath);

    if (protocol === 'kitty') {
      return renderKittyImage(pngData, 24);
    }
    return renderItermImage(pngData, 24);
  } catch {
    return null;
  }
}

// === ASCII FALLBACK ===

export function getLobsterAscii(): string {
  const K = chalk.hex('#1a1a2e');
  const B = chalk.hex('#1e3a6e');
  const b = chalk.hex('#3b7dd8');
  const R = chalk.hex('#e63946');
  const r = chalk.hex('#a81c2b');

  const _ = '  ';
  const kk = K('██');
  const bb = B('██');
  const Bb = b('██');
  const rr = R('██');
  const dr = r('██');

  const rows = [
    `${_}${_}${_}${_}${kk}${kk}${kk}${kk}${kk}${_}${_}${_}${_}${_}`,
    `${_}${_}${_}${kk}${bb}${bb}${bb}${bb}${bb}${kk}${_}${_}${_}${_}`,
    `${_}${kk}${kk}${bb}${bb}${bb}${Bb}${bb}${bb}${bb}${kk}${kk}${_}${_}`,
    `${kk}${kk}${bb}${bb}${bb}${bb}${Bb}${Bb}${bb}${bb}${bb}${kk}${kk}${_}`,
    `${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${_}`,
    `${_}${kk}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${kk}${_}${_}`,
    `${_}${kk}${rr}${rr}${kk}${rr}${rr}${rr}${kk}${rr}${rr}${kk}${_}${_}`,
    `${kk}${dr}${kk}${rr}${kk}${kk}${rr}${kk}${kk}${rr}${kk}${dr}${kk}${_}`,
    `${kk}${dr}${kk}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${kk}${dr}${kk}${_}`,
    `${_}${kk}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${kk}${_}${_}`,
    `${_}${kk}${rr}${kk}${rr}${rr}${rr}${rr}${rr}${kk}${rr}${kk}${_}${_}`,
    `${_}${kk}${kk}${kk}${rr}${rr}${_}${rr}${rr}${kk}${kk}${kk}${_}${_}`,
    `${_}${_}${_}${kk}${kk}${_}${_}${_}${kk}${kk}${_}${_}${_}${_}`,
  ];

  return rows.map(row => '    ' + row).join('\n');
}

// === TITLE ART ===

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

// === MAIN DISPLAY ===

/**
 * Render the sprite — tries real PNG inline first, falls back to ASCII blocks.
 */
function renderSprite(): void {
  const inlineImage = tryRenderSprite();
  if (inlineImage) {
    process.stdout.write('  ' + inlineImage + '\n');
  } else {
    console.log(getLobsterAscii());
  }
}

// Full startup banner (bare `shipmobile` command)
export function printCommandList(version: string = '0.1.0'): void {
  console.log();
  renderSprite();
  console.log();
  console.log(getTitleArt());
  console.log();
  console.log('  ' + chalk.dim(TAGLINE));
  console.log('  ' + chalk.dim(`v${version}`) + chalk.dim(' · ') + chalk.cyan.dim('https://github.com/ACRLABSDEV/shipmobile'));
  console.log();

  const commands: [string, string, string, boolean][] = [
    ['🔐', 'login',    'Authenticate with Apple, Expo & Google Play',  true],
    ['🔍', 'init',     'Initialize project for mobile deployment',     true],
    ['🩺', 'doctor',   'Run project health checks',                    true],
    ['📊', 'audit',    'Static analysis for store readiness',          false],
    ['🖼️ ', 'assets',   'Validate and process app assets',              false],
    ['📝', 'prepare',  'Generate app store metadata',                  false],
    ['🔨', 'build',    'Trigger cloud build via EAS',                  false],
    ['📡', 'status',   'Check build progress in real-time',            false],
    ['📱', 'preview',  'Generate preview links + QR codes',            false],
    ['🚀', 'submit',   'Submit to App Store / Play Store',             false],
    ['🤖', 'mcp',      'Start MCP server for AI agents',               true],
  ];

  const maxName = Math.max(...commands.map(c => c[1].length));

  for (const [icon, name, desc, ready] of commands) {
    const padded = name.padEnd(maxName + 2);
    if (ready) {
      console.log(`  ${icon} ${chalk.cyan.bold(padded)} ${chalk.white(desc)}`);
    } else {
      console.log(`  ${icon} ${chalk.hex('#666')(padded)} ${chalk.hex('#555')(desc)}  ${chalk.hex('#444')('soon')}`);
    }
  }

  console.log();

  const footer = boxen(
    chalk.dim('Usage: ') + chalk.white('shipmobile <command> [options]') + '\n' +
    chalk.dim('Help:  ') + chalk.white('shipmobile <command> --help'),
    {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderStyle: 'round',
      borderColor: 'cyan',
      dimBorder: true,
    }
  );
  console.log(footer.split('\n').map(l => '  ' + l).join('\n'));
  console.log();
}

// Banner for --help
export function printBanner(version: string = '0.1.0'): void {
  console.log();
  renderSprite();
  console.log();
  console.log(getTitleArt());
  console.log();
  console.log('  ' + chalk.dim(TAGLINE));
  console.log('  ' + chalk.dim(`v${version}`));
  console.log();
}

// Compact header for subcommands
export function printHeader(command: string): void {
  console.log();
  console.log(accentGradient(`  📱 ShipMobile`) + chalk.dim(` — ${command}`));
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log();
}

// Plain text for MCP/logs
export const BANNER_PLAIN = `
  ███████╗██╗  ██╗██╗██████╗ ███╗   ███╗ ██████╗ ██████╗ ██╗██╗     ███████╗
  ██╔════╝██║  ██║██║██╔══██╗████╗ ████║██╔═══██╗██╔══██╗██║██║     ██╔════╝
  ███████╗███████║██║██████╔╝██╔████╔██║██║   ██║██████╔╝██║██║     █████╗
  ╚════██║██╔══██║██║██╔═══╝ ██║╚██╔╝██║██║   ██║██╔══██╗██║██║     ██╔══╝
  ███████║██║  ██║██║██║     ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║███████╗███████╗
  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚══════╝

  Your agent can build the app. ShipMobile ships it.
`;
