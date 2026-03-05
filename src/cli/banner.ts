/**
 * ShipMobile CLI — Premium Banner & Command Display
 * Inspired by Claude Code's terminal UI polish
 */

import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

// ShipMobile gradient: ocean blue → electric cyan → soft purple
const shipGradient = gradient(['#0066ff', '#00d4ff', '#6366f1']);
const accentGradient = gradient(['#ff6b6b', '#ee5a24', '#ff9f43']);

// Coopes' pixel lobster captain — compact, chalked
export function getLobsterAscii(): string {
  const b = chalk.hex('#2855a3');   // hat dark
  const B = chalk.hex('#3b7dd8');   // hat light
  const r = chalk.hex('#e63946');   // body
  const R = chalk.hex('#ff6b6b');   // body highlight
  const k = chalk.hex('#1a1a2e');   // outline/eyes

  return [
    `            ${k('▄▄▄▄▄▄▄▄')}`,
    `          ${k('▄')}${b('██████████')}${k('▄')}`,
    `        ${k('▄')}${B('████████████████')}${k('▄')}`,
    `        ${k('█')}${B('████')}${b('████████')}${B('████')}${k('█')}`,
    `         ${k('▀')}${b('██████████████')}${k('▀')}`,
    `           ${k('▀▀▀▀▀▀▀▀▀▀')}`,
    `          ${k('▄')}${r('████████████')}${k('▄')}`,
    `         ${r('██')}${k('▀▀')}${R('██████')}${k('▀▀')}${r('██')}`,
    `        ${r('▄')}${R('████████████████')}${r('▄')}`,
    `      ${r('██')}  ${R('████████████████')}  ${r('██')}`,
    `      ${r('▀▀')}  ${r('██')}${k('▄▄')}${R('████')}${k('▄▄')}${r('██')}  ${r('▀▀')}`,
    `           ${r('██')}${k('██')}${R('████')}${k('██')}${r('██')}`,
    `           ${r('████████████')}`,
    `            ${r('██')}${k('▀▀▀▀')}${r('██')}`,
    `           ${k('▄▄')}      ${k('▄▄')}`,
    `           ${k('▀▀')}      ${k('▀▀')}`,
  ].join('\n');
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
  console.log('  ' + chalk.dim(`v${version}`) + chalk.dim(' · ') + chalk.dim('https://github.com/ACRLABSDEV/shipmobile'));
  console.log();

  // Command table
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
      console.log(`  ${icon} ${chalk.cyan.bold(padded)}${chalk.white(desc)}`);
    } else {
      console.log(`  ${icon} ${chalk.dim(padded)}${chalk.dim(desc)}`);
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
      borderColor: 'gray',
      dimBorder: true,
    }
  );
  // Indent the box
  console.log(footer.split('\n').map(l => '  ' + l).join('\n'));
  console.log();
}

// Banner for --help (includes title + tagline, no command list)
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

// Compact header for subcommands (e.g. `shipmobile doctor`)
export function printHeader(command: string): void {
  console.log();
  const header = accentGradient(`  📱 ShipMobile`) + chalk.dim(` — ${command}`);
  console.log(header);
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  console.log();
}

// Plain text (no chalk) for MCP/logs
export const BANNER_PLAIN = `
  ███████╗██╗  ██╗██╗██████╗ ███╗   ███╗ ██████╗ ██████╗ ██╗██╗     ███████╗
  ██╔════╝██║  ██║██║██╔══██╗████╗ ████║██╔═══██╗██╔══██╗██║██║     ██╔════╝
  ███████╗███████║██║██████╔╝██╔████╔██║██║   ██║██████╔╝██║██║     █████╗
  ╚════██║██╔══██║██║██╔═══╝ ██║╚██╔╝██║██║   ██║██╔══██╗██║██║     ██╔══╝
  ███████║██║  ██║██║██║     ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║███████╗███████╗
  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚══════╝

  Your agent can build the app. ShipMobile ships it.
`;
