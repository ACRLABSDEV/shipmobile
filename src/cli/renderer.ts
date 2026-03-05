/**
 * CLI Renderer — renders Result<T> for terminal output
 */

import type { Result } from '../utils/result.js';
import type { LoginResult } from '../core/login.js';
import type { InitResult } from '../core/init.js';
import type { DoctorResult } from '../core/doctor.js';
import * as theme from './theme.js';

export function renderResult<T>(result: Result<T>, formatter?: (data: T) => string): void {
  if (result.ok) {
    if (formatter) {
      console.log(formatter(result.data));
    } else {
      console.log(theme.success(String(result.data)));
    }
  } else {
    console.error(theme.error(result.error.message));
    if (result.error.suggestion) {
      console.log(theme.info(result.error.suggestion));
    }
  }
}

export function renderComingSoon(command: string): void {
  console.log();
  console.log(theme.warning(`"${command}" is coming soon!`));
  console.log(theme.info('Follow progress at https://github.com/ACRLABSDEV/shipmobile'));
  console.log();
}

export function renderLoginResult(result: Result<LoginResult>, provider: string): void {
  if (!result.ok) {
    console.log(`  ${theme.icons.error} ${theme.colors.error(`${provider}: ${result.error.message}`)}`);
    if (result.error.suggestion) {
      console.log(`    ${theme.icons.arrow} ${theme.colors.dim(result.error.suggestion)}`);
    }
    return;
  }

  const data = result.data;
  if (data.details.expo) {
    console.log(`  ${theme.icons.success} Logged in as @${data.details.expo.username} (${data.details.expo.plan || 'free'} plan)`);
  }
  if (data.details.apple) {
    console.log(`  ${theme.icons.success} Authenticated as "${data.details.apple.teamName}"`);
  }
  if (data.details.google) {
    console.log(`  ${theme.icons.success} Connected to project: ${data.details.google.projectId}`);
  }
}

export function renderLoginStatus(result: Result<LoginResult>): void {
  console.log();
  console.log(theme.heading('  📱 ShipMobile — Connection Status'));
  console.log(theme.divider());
  console.log();

  if (!result.ok) {
    console.log(`  ${theme.icons.error} ${result.error.message}`);
    return;
  }

  const { authenticated, details, issues } = result.data;

  const expoStatus = authenticated.expo
    ? `${theme.icons.success} Expo/EAS: @${details.expo?.username || 'connected'} (${details.expo?.plan || 'free'})`
    : `${theme.icons.cross} Expo/EAS: not connected`;
  const appleStatus = authenticated.apple
    ? `${theme.icons.success} Apple Developer: ${details.apple?.teamName || 'connected'}`
    : `${theme.icons.cross} Apple Developer: not connected`;
  const googleStatus = authenticated.google
    ? `${theme.icons.success} Google Play: ${details.google?.projectId || 'connected'}`
    : `${theme.icons.cross} Google Play: not connected`;

  console.log(`  ${expoStatus}`);
  console.log(`  ${appleStatus}`);
  console.log(`  ${googleStatus}`);

  if (issues.length > 0) {
    console.log();
    for (const issue of issues) {
      console.log(`  ${theme.colors.dim(issue)}`);
    }
  }
  console.log();
}

export function renderInitResult(result: Result<InitResult>): void {
  if (!result.ok) {
    console.log(`  ${theme.icons.error} ${theme.colors.error(result.error.message)}`);
    if (result.error.suggestion) {
      console.log();
      console.log(`  ${theme.icons.tip} ${result.error.suggestion}`);
    }
    console.log();
    return;
  }

  const { project, issues, generated } = result.data;

  const workflowLabel: Record<string, string> = {
    'expo-managed': 'Expo managed workflow',
    'expo-bare': 'Expo bare workflow',
    'react-native-cli': 'React Native CLI',
  };

  console.log(`  Detected: ${theme.colors.primary(workflowLabel[project.workflow] || project.workflow)}${project.sdkVersion ? ` (SDK ${project.sdkVersion})` : ''}`);
  console.log(`  Project:  ${theme.colors.bold(project.name)}`);
  console.log();
  console.log('  Configuration:');
  console.log(`    Bundle ID:  ${theme.colors.primary(project.bundleId)}`);
  console.log(`    Version:    ${project.version}`);
  console.log(`    Platforms:  ${project.platforms.join(' + ')}`);

  if (generated.length > 0) {
    console.log();
    console.log('  Generated:');
    for (const f of generated) {
      console.log(`    ${theme.icons.success} ${f}`);
    }
  }

  if (issues.length > 0) {
    console.log();
    console.log('  Issues:');
    for (const issue of issues) {
      console.log(`    ${theme.icons.warning} ${issue}`);
    }
  }

  console.log();
  console.log(`  ${theme.icons.success} Project configured! Next: \`shipmobile doctor\``);
  console.log();
}

export function renderDoctorResult(result: Result<DoctorResult>): void {
  if (!result.ok) {
    console.log(`  ${theme.icons.error} ${result.error.message}`);
    return;
  }

  const { passed, warnings, critical, checks } = result.data;
  const total = checks.length;

  console.log(`  Running ${total} checks...\n`);

  // Group by category
  const categories = ['structure', 'config', 'assets', 'accounts', 'build', 'dependencies', 'platform'] as const;
  const categoryLabels: Record<string, string> = {
    structure: 'Project Structure',
    config: 'Configuration',
    assets: 'Assets',
    accounts: 'Accounts',
    build: 'Build Readiness',
    dependencies: 'Dependencies',
    platform: 'Platform Config',
  };

  for (const cat of categories) {
    const catChecks = checks.filter((c) => c.category === cat);
    if (catChecks.length === 0) continue;

    console.log(`  ${theme.colors.bold(categoryLabels[cat] || cat)}`);
    for (const c of catChecks) {
      const icon = c.status === 'passed' ? theme.icons.success
        : c.severity === 'critical' ? theme.icons.error
        : c.severity === 'warning' ? theme.icons.warning
        : theme.colors.dim('ℹ');
      const color = c.status === 'passed' ? theme.colors.success
        : c.severity === 'critical' ? theme.colors.error
        : c.severity === 'warning' ? theme.colors.warning
        : theme.colors.dim;
      console.log(`    ${icon} ${color(c.message)}`);
      if (c.status === 'failed' && c.suggestion) {
        console.log(`      ${theme.icons.arrow} ${theme.colors.dim(c.suggestion)}`);
      }
    }
    console.log();
  }

  // Summary
  const failedCount = warnings.length + critical.length;
  console.log(theme.divider());
  console.log();
  console.log(`  ${theme.icons.success} ${theme.colors.success(`${passed} passed`)}`);
  if (warnings.length > 0) console.log(`  ${theme.icons.warning} ${theme.colors.warning(`${warnings.length} warnings`)}`);
  if (critical.length > 0) console.log(`  ${theme.icons.error} ${theme.colors.error(`${critical.length} critical`)}`);

  if (critical.length > 0) {
    console.log(`\n  Overall: ${theme.colors.error('🔴 Critical issues must be fixed before building')}`);
  } else if (warnings.length > 0) {
    console.log(`\n  Overall: ${theme.colors.warning('🟡 Fixable — address warnings for best results')}`);
  } else {
    console.log(`\n  Overall: ${theme.colors.success('🟢 All clear — ready to build!')}`);
  }

  if (failedCount > 0) {
    console.log(`\n  ${theme.icons.tip} Run \`shipmobile doctor --fix\` to auto-fix what's possible.`);
  }
  console.log();
}
