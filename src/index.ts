#!/usr/bin/env node
/**
 * ShipMobile CLI — entry point
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { printBanner } from './cli/banner.js';
import { renderComingSoon } from './cli/renderer.js';
import { renderResult } from './cli/renderer.js';
import * as doctor from './core/doctor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
    return pkg.version as string;
  } catch {
    return '0.1.0';
  }
}

const version = getVersion();

const program = new Command();

program
  .name('shipmobile')
  .description('Ship React Native/Expo apps to App Store & Play Store')
  .version(version, '-v, --version')
  .addHelpText('beforeAll', () => {
    printBanner(version);
    return '';
  });

program
  .command('login')
  .description('Authenticate with Apple, Expo, and Google')
  .action(() => renderComingSoon('login'));

program
  .command('init')
  .description('Initialize project for mobile deployment')
  .action(() => renderComingSoon('init'));

program
  .command('doctor')
  .description('Run project health checks')
  .action(async () => {
    const result = await doctor.execute();
    renderResult(result, (data) => `${data.message}`);
  });

program
  .command('audit')
  .description('Static analysis for store readiness')
  .action(() => renderComingSoon('audit'));

program
  .command('assets')
  .description('Validate and process app assets')
  .action(() => renderComingSoon('assets'));

program
  .command('prepare')
  .description('Generate app store metadata')
  .action(() => renderComingSoon('prepare'));

program
  .command('build')
  .description('Trigger EAS build')
  .action(() => renderComingSoon('build'));

program
  .command('status')
  .description('Check build progress')
  .action(() => renderComingSoon('status'));

program
  .command('preview')
  .description('Generate preview links + QR codes')
  .action(() => renderComingSoon('preview'));

program
  .command('submit')
  .description('Submit to App Store / Play Store')
  .action(() => renderComingSoon('submit'));

program
  .command('mcp')
  .description('Start MCP server for AI agents')
  .action(async () => {
    const { startMcpServer } = await import('./mcp/server.js');
    await startMcpServer();
  });

program.parse();
