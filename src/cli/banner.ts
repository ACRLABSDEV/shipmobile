/**
 * ShipMobile CLI — Premium Banner & Command Display
 * Pixel-accurate lobster captain + gradient title
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

// Gradients
const shipGradient = gradient(['#0066ff', '#00d4ff', '#6366f1']);
const accentGradient = gradient(['#ff6b6b', '#ee5a24', '#ff9f43']);

/**
 * Pixel-accurate recreation of Coopes' 15x13 lobster captain sprite.
 * Each row maps directly to the pixel grid.
 * Uses half-block characters (▄▀█) to get 2 pixel rows per terminal row.
 */
export function getLobsterAscii(): string {
  // Colors matching the actual sprite
  const K = chalk.hex('#1a1a2e');   // black outline
  const B = chalk.hex('#1e3a6e');   // dark blue hat
  const b = chalk.hex('#3b7dd8');   // light blue hat highlight
  const R = chalk.hex('#e63946');   // red body
  const r = chalk.hex('#a81c2b');   // dark red (claws/shadow)

  // Helper: colored block chars
  // Using ▄ (lower half) and █ (full) and ▀ (upper half)
  // bg+fg combos for 2-row-per-line rendering

  // Simpler approach: 1 terminal row = ~1 pixel row, using full blocks
  // The sprite is small enough that full-block rendering at 2x scale looks great
  const _ = '  '; // transparent (2 spaces per pixel)
  const kk = K('██');
  const bb = B('██');
  const Bb = b('██');
  const rr = R('██');
  const dr = r('██');

  // Row-by-row from the pixel grid (15 cols × 13 rows)
  const rows = [
    // R01: hat crown top
    `${_}${_}${_}${_}${kk}${kk}${kk}${kk}${kk}${_}${_}${_}${_}${_}`,
    // R02: hat upper
    `${_}${_}${_}${kk}${bb}${bb}${bb}${bb}${bb}${kk}${_}${_}${_}${_}`,
    // R03: hat brim widens (with highlight)
    `${_}${kk}${kk}${bb}${bb}${bb}${Bb}${bb}${bb}${bb}${kk}${kk}${_}${_}`,
    // R04: hat brim full (with highlight)
    `${kk}${kk}${bb}${bb}${bb}${bb}${Bb}${Bb}${bb}${bb}${bb}${kk}${kk}${_}`,
    // R05: hat underside (full black brim)
    `${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${kk}${_}`,
    // R06: body top
    `${_}${kk}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${kk}${_}${_}`,
    // R07: body with eyes
    `${_}${kk}${rr}${rr}${kk}${rr}${rr}${rr}${kk}${rr}${rr}${kk}${_}${_}`,
    // R08: body + claws
    `${kk}${dr}${kk}${rr}${kk}${kk}${rr}${kk}${kk}${rr}${kk}${dr}${kk}${_}`,
    // R09: claws + body
    `${kk}${dr}${kk}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${kk}${dr}${kk}${_}`,
    // R10: body lower
    `${_}${kk}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${rr}${kk}${_}${_}`,
    // R11: body narrowing + leg hints
    `${_}${kk}${rr}${kk}${rr}${rr}${rr}${rr}${rr}${kk}${rr}${kk}${_}${_}`,
    // R12: bottom + feet
    `${_}${kk}${kk}${kk}${rr}${rr}${_}${rr}${rr}${kk}${kk}${kk}${_}${_}`,
    // R13: toes
    `${_}${_}${_}${kk}${kk}${_}${_}${_}${kk}${kk}${_}${_}${_}${_}`,
  ];

  return rows.map(row => '    ' + row).join('\n');
}

// Big gradient SHIPMOBILE title
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

// Full startup banner (bare `shipmobile` command)
export function printCommandList(version: string = '0.1.0'): void {
  console.log();
  console.log(getLobsterAscii());
  console.log();
  console.log(getTitleArt());
  console.log();
  console.log('  ' + chalk.dim(TAGLINE));
  console.log('  ' + chalk.dim(`v${version}`) + chalk.dim(' · ') + chalk.cyan.dim('https://github.com/ACRLABSDEV/shipmobile'));
  console.log();

  // Commands: [emoji, name, description, ready]
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

  // Boxed footer
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
  console.log(getLobsterAscii());
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
