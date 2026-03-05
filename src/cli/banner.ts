/**
 * ShipMobile CLI — Intro Banner
 * Pixel lobster sailor mascot + ASCII title art
 */

import chalk from 'chalk';

// Matches Coopes' pixel sprite: compact red crab with navy blue sailor hat
export function getLobsterAscii(): string {
  const b = chalk.blueBright;  // hat
  const B = chalk.blue;        // hat shadow
  const r = chalk.red;         // body
  const R = chalk.redBright;   // body highlight
  const k = chalk.black;       // eyes/outline
  const d = chalk.rgb(139,0,0); // dark red (claws)

  // Suppress unused variable warnings
  void R;

  return [
    `          ${k('▄▄▄▄▄▄▄▄')}`,
    `        ${k('▄')}${B('██████████')}${k('▄')}`,
    `      ${k('▄')}${b('████████████████')}${k('▄')}`,
    `      ${k('█')}${b('████████████████')}${k('█')}`,
    `       ${k('▀')}${B('██████████████')}${k('▀')}`,
    `         ${k('▀▀▀▀▀▀▀▀▀▀')}`,
    `        ${k('▄')}${r('████████████')}${k('▄')}`,
    `       ${r('██')}${k('▀▀')}${r('██████')}${k('▀▀')}${r('██')}`,
    `      ${d('▄')}${r('████████████████')}${d('▄')}`,
    `    ${d('██')}  ${r('████████████████')}  ${d('██')}`,
    `    ${d('▀▀')}  ${r('██')}${k('▄▄')}${r('████')}${k('▄▄')}${r('██')}  ${d('▀▀')}`,
    `         ${r('██')}${k('██')}${r('████')}${k('██')}${r('██')}`,
    `         ${r('████████████')}`,
    `          ${r('██')}${k('▀▀▀▀')}${r('██')}`,
    `         ${k('▄▄')}      ${k('▄▄')}`,
    `         ${k('▀▀')}      ${k('▀▀')}`,
  ].join('\n');
}

export const TITLE_ART = `
  ███████╗██╗  ██╗██╗██████╗ ███╗   ███╗ ██████╗ ██████╗ ██╗██╗     ███████╗
  ██╔════╝██║  ██║██║██╔══██╗████╗ ████║██╔═══██╗██╔══██╗██║██║     ██╔════╝
  ███████╗███████║██║██████╔╝██╔████╔██║██║   ██║██████╔╝██║██║     █████╗
  ╚════██║██╔══██║██║██╔═══╝ ██║╚██╔╝██║██║   ██║██╔══██╗██║██║     ██╔══╝
  ███████║██║  ██║██║██║     ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║███████╗███████╗
  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚══════╝`;

const TAGLINE = '  Your agent can build the app. ShipMobile ships it.';

export function printBanner(version: string = '0.1.0'): void {
  console.log();
  console.log(getLobsterAscii());
  console.log(chalk.cyan(TITLE_ART));
  console.log();
  console.log(chalk.dim(TAGLINE));
  console.log(chalk.dim(`  v${version}`));
  console.log();
}

// Compact header for subcommands
export function printHeader(command: string): void {
  console.log();
  console.log(chalk.cyan('  📱 ShipMobile') + chalk.dim(` — ${command}`));
  console.log(chalk.dim('  ' + '─'.repeat(40)));
  console.log();
}

// Branded command list for bare `shipmobile` invocation
export function printCommandList(version: string = '0.1.0'): void {
  console.log();
  console.log(getLobsterAscii());
  console.log(chalk.cyan(TITLE_ART));
  console.log();
  console.log(chalk.dim(TAGLINE));
  console.log(chalk.dim(`  v${version}`));
  console.log();
  console.log(chalk.dim('  ' + '─'.repeat(60)));
  console.log();

  const commands: [string, string, boolean][] = [
    ['login',    'Authenticate with Apple, Expo & Google',       true],
    ['init',     'Initialize project for mobile deployment',     true],
    ['doctor',   'Run project health checks',                    true],
    ['audit',    'Static analysis for store readiness',          false],
    ['assets',   'Validate and process app assets',              false],
    ['prepare',  'Generate app store metadata',                  false],
    ['build',    'Trigger EAS build',                            false],
    ['status',   'Check build progress',                         false],
    ['preview',  'Generate preview links + QR codes',            false],
    ['submit',   'Submit to App Store / Play Store',             false],
    ['mcp',      'Start MCP server for AI agents',               true],
  ];

  for (const [name, desc, ready] of commands) {
    const cmd = ready
      ? chalk.cyan.bold(`  ${name.padEnd(12)}`)
      : chalk.dim(`  ${name.padEnd(12)}`);
    const label = ready
      ? chalk.white(desc)
      : chalk.dim(`${desc} — coming soon`);
    console.log(`${cmd} ${label}`);
  }

  console.log();
  console.log(chalk.dim('  ' + '─'.repeat(60)));
  console.log();
  console.log(chalk.dim('  Usage:  ') + chalk.white('shipmobile <command> [options]'));
  console.log(chalk.dim('  Help:   ') + chalk.white('shipmobile <command> --help'));
  console.log(chalk.dim('  Docs:   ') + chalk.cyan('https://github.com/ACRLABSDEV/shipmobile'));
  console.log();
}

// Plain text version (no chalk) for MCP/logs
export const BANNER_PLAIN = `
  ███████╗██╗  ██╗██╗██████╗ ███╗   ███╗ ██████╗ ██████╗ ██╗██╗     ███████╗
  ██╔════╝██║  ██║██║██╔══██╗████╗ ████║██╔═══██╗██╔══██╗██║██║     ██╔════╝
  ███████╗███████║██║██████╔╝██╔████╔██║██║   ██║██████╔╝██║██║     █████╗
  ╚════██║██╔══██║██║██╔═══╝ ██║╚██╔╝██║██║   ██║██╔══██╗██║██║     ██╔══╝
  ███████║██║  ██║██║██║     ██║ ╚═╝ ██║╚██████╔╝██████╔╝██║███████╗███████╗
  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚═╝╚══════╝╚══════╝

  Your agent can build the app. ShipMobile ships it.
`;
