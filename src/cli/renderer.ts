/**
 * CLI Renderer — renders Result<T> for terminal output
 */

import type { Result } from '../utils/result.js';
import type { LoginResult } from '../core/login.js';
import type { InitResult } from '../core/init.js';
import type { DoctorResult } from '../core/doctor.js';
import type { AuditResult } from '../core/audit/index.js';
import type { AuditFinding } from '../analyzers/types.js';
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

export function renderAuditResult(result: Result<AuditResult & { _fixedCount?: number; _previous?: AuditResult }>): void {
  if (!result.ok) {
    console.log(`  ${theme.icons.error} ${theme.colors.error(result.error.message)}`);
    if (result.error.suggestion) {
      console.log(`  ${theme.icons.tip} ${result.error.suggestion}`);
    }
    console.log();
    return;
  }

  const data = result.data;
  const { score, critical, warnings, info, metrics, findings } = data;

  console.log();
  console.log(theme.heading('  📱 ShipMobile — App Audit Report'));
  console.log(`  ${theme.divider()}`);
  console.log();

  // Score
  const scoreColor = score >= 80 ? theme.colors.success : score >= 50 ? theme.colors.warning : theme.colors.error;
  console.log(`  Score: ${scoreColor(`${score}/100`)}`);
  console.log();

  // Summary
  const passed = metrics.rulesRun - new Set(findings.map((f: AuditFinding) => f.ruleId)).size;
  console.log(`  ${theme.icons.success} ${passed} rules passed`);
  if (warnings.length > 0) console.log(`  ${theme.icons.warning}  ${theme.colors.warning(`${warnings.length} warnings`)}`);
  if (critical.length > 0) console.log(`  ${theme.icons.error} ${theme.colors.error(`${critical.length} critical`)}`);
  if (info.length > 0) console.log(`  ${theme.colors.dim(`ℹ  ${info.length} info`)}`);
  console.log();

  // Critical findings
  if (critical.length > 0) {
    console.log(`  ${theme.colors.error(theme.colors.bold('❌ CRITICAL'))}`);
    const grouped = groupFindings(critical);
    for (const [, items] of grouped) {
      const first = items[0]!;
      const fileCount = items.filter((f: AuditFinding) => f.file).length;
      const msg = fileCount > 0 ? `${first.message} (${fileCount} occurrences)` : first.message;
      console.log(`    ${msg}`);
      if (first.suggestion) console.log(`    ${theme.icons.arrow} ${theme.colors.dim(first.suggestion)}`);
      const fileList = items.filter((f: AuditFinding) => f.file).slice(0, 3);
      if (fileList.length > 0) {
        const locs = fileList.map((f: AuditFinding) => `${f.file}${f.line ? `:${f.line}` : ''}`).join(', ');
        console.log(`    ${theme.colors.dim(locs)}${items.length > 3 ? theme.colors.dim(` +${items.length - 3} more`) : ''}`);
      }
    }
    console.log();
  }

  // Warnings
  if (warnings.length > 0) {
    console.log(`  ${theme.colors.warning(theme.colors.bold('⚠️  WARNINGS'))}`);
    const grouped = groupFindings(warnings);
    for (const [, items] of grouped) {
      const first = items[0]!;
      console.log(`    ${first.message}${items.length > 1 ? ` (${items.length} occurrences)` : ''}`);
      if (first.suggestion) console.log(`    ${theme.icons.arrow} ${theme.colors.dim(first.suggestion)}`);
    }
    console.log();
  }

  // Info / suggestions
  if (info.length > 0) {
    console.log(`  ${theme.colors.info(theme.colors.bold('💡 SUGGESTIONS'))}`);
    const grouped = groupFindings(info);
    for (const [, items] of grouped) {
      const first = items[0]!;
      console.log(`    ${first.message}`);
      if (first.suggestion) console.log(`    ${theme.icons.arrow} ${theme.colors.dim(first.suggestion)}`);
    }
    console.log();
  }

  // Diff with previous
  if (data._previous) {
    const prev = data._previous;
    const diff = score - prev.score;
    const diffStr = diff > 0 ? theme.colors.success(`+${diff}`) : diff < 0 ? theme.colors.error(`${diff}`) : theme.colors.dim('±0');
    console.log(`  ${theme.colors.bold('📊 Diff:')} ${prev.score} → ${score} (${diffStr})`);
    console.log();
  }

  // Fix count
  if (data._fixedCount && data._fixedCount > 0) {
    console.log(`  ${theme.icons.success} Auto-fixed ${data._fixedCount} issues`);
    console.log();
  }

  // Fixable count
  const fixable = findings.filter((f: AuditFinding) => f.autoFixable).length;
  if (fixable > 0) {
    console.log(`  Run \`shipmobile audit --fix\` to auto-fix ${fixable} issues.`);
    console.log();
  }

  // Metrics
  console.log(`  ${theme.colors.dim(`${metrics.totalFiles} files scanned · ${metrics.rulesRun} rules run · ${metrics.duration}ms`)}`);
  console.log();
}

function groupFindings(findings: AuditFinding[]): Map<string, AuditFinding[]> {
  const map = new Map<string, AuditFinding[]>();
  for (const f of findings) {
    const existing = map.get(f.ruleId);
    if (existing) existing.push(f);
    else map.set(f.ruleId, [f]);
  }
  return map;
}

// === ASSETS ===
export function renderAssetsResult(result: Result<import('../core/assets.js').AssetsResult>): void {
  if (!result.ok) {
    console.log(`\n  ${theme.error(result.error.message)}`);
    if (result.error.suggestion) {
      console.log(`  ${theme.icons.arrow} ${theme.colors.dim(result.error.suggestion)}`);
    }
    console.log();
    return;
  }

  const data = result.data;
  console.log();

  // Icon
  console.log('  App Icon:');
  if (data.icon) {
    console.log(`  ${theme.icons.success} Source icon found: ${data.icon.source} (${data.icon.width}×${data.icon.height})`);
    const iosCount = data.icon.generated.filter(g => g.platform === 'ios').length;
    const androidCount = data.icon.generated.filter(g => g.platform === 'android').length;
    console.log(`  ${theme.icons.success} Generated ${iosCount} iOS sizes + ${androidCount} Android sizes`);
  } else {
    console.log(`  ${theme.icons.error} ${theme.colors.error('No icon found')}`);
  }
  console.log();

  // Adaptive icon
  if (data.adaptiveIcon) {
    console.log('  Adaptive Icon (Android):');
    console.log(`  ${theme.icons.success} Foreground + background layers processed (${data.adaptiveIcon.generated.length} files)`);
    console.log();
  }

  // Splash
  console.log('  Splash Screen:');
  if (data.splash.length > 0) {
    for (const s of data.splash) {
      if (s.valid) {
        console.log(`  ${theme.icons.success} ${s.platform}: ${s.width}×${s.height}`);
      } else {
        console.log(`  ${theme.icons.warning} ${s.platform}: ${s.width}×${s.height}`);
        for (const issue of s.issues) {
          console.log(`    ${theme.icons.arrow} ${theme.colors.dim(issue)}`);
        }
      }
    }
  } else {
    console.log(`  ${theme.icons.error} ${theme.colors.error('No splash screen found')}`);
  }
  console.log();

  // Screenshots
  console.log('  Screenshots:');
  for (const ss of data.screenshots) {
    if (ss.found) {
      console.log(`  ${theme.icons.success} ${ss.label} (${ss.size})`);
    } else {
      const icon = ss.required ? theme.icons.error : theme.icons.warning;
      const color = ss.required ? theme.colors.error : theme.colors.warning;
      console.log(`  ${icon} ${color(`Missing: ${ss.label} (${ss.size})`)}${ss.required ? '' : ' (optional)'}`);
    }
  }
  console.log();

  // Missing & recommendations
  if (data.missing.length > 0) {
    console.log(`  ${theme.colors.dim('Missing:')}`);
    for (const m of data.missing) {
      console.log(`    ${theme.icons.arrow} ${m}`);
    }
    console.log();
  }
  if (data.recommendations.length > 0) {
    for (const r of data.recommendations) {
      console.log(`  ${theme.icons.tip} ${theme.colors.info(r)}`);
    }
    console.log();
  }
}

// === PREPARE ===
export function renderPrepareResult(result: Result<import('../core/prepare.js').PrepareResult>): void {
  if (!result.ok) {
    console.log(`\n  ${theme.error(result.error.message)}`);
    if (result.error.suggestion) {
      console.log(`  ${theme.icons.arrow} ${theme.colors.dim(result.error.suggestion)}`);
    }
    console.log();
    return;
  }

  const data = result.data;
  console.log();
  console.log('  Generated metadata:');
  console.log(`    App Name:     ${data.metadata.appName.value} ${theme.colors.dim(`(${data.metadata.appName.source})`)}`);
  console.log(`    Subtitle:     ${data.metadata.subtitle.value || '(none)'} ${theme.colors.dim(`(${data.metadata.subtitle.source})`)}`);
  console.log(`    Category:     ${data.metadata.category.value} ${theme.colors.dim(`(${data.metadata.category.source})`)}`);
  console.log(`    Age Rating:   ${data.metadata.ageRating.value}`);
  console.log(`    Description:  ${data.metadata.shortDescription.value.slice(0, 60)}${data.metadata.shortDescription.value.length > 60 ? '...' : ''}`);
  console.log(`    Keywords:     ${data.metadata.keywords.value || '(none)'}`);
  console.log();

  // Privacy
  if (data.privacy.permissions.length > 0) {
    console.log('  Privacy:');
    console.log(`    Detected permissions: ${data.privacy.permissions.join(', ')}`);
    console.log(`  ${theme.icons.success} Generated privacy policy ${theme.icons.arrow} privacy-policy.html`);
    console.log(`  ${theme.icons.tip} ${theme.colors.info('Host this at a public URL and add it to your app listing')}`);
    console.log();
  }

  // Validation
  const errors = data.validation.filter(v => v.severity === 'error');
  const warnings = data.validation.filter(v => v.severity === 'warning');
  if (errors.length > 0) {
    console.log(`  ${theme.icons.error} ${theme.colors.error(`${errors.length} validation error(s):`)}`);
    for (const e of errors) {
      console.log(`    ${theme.icons.arrow} ${e.field}: ${e.message}`);
    }
    console.log();
  }
  if (warnings.length > 0) {
    console.log(`  ${theme.icons.warning} ${theme.colors.warning(`${warnings.length} warning(s):`)}`);
    for (const w of warnings) {
      console.log(`    ${theme.icons.arrow} ${w.field}: ${w.message}`);
    }
    console.log();
  }
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`  ${theme.icons.success} All validation checks passed`);
    console.log();
  }

  console.log(`  ${theme.icons.success} Metadata saved to ${data.savedTo}`);
  console.log(`  Next: ${theme.colors.primary('shipmobile build')}`);
  console.log();
}
