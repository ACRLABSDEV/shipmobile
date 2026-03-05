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
