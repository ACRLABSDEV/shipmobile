/**
 * CLI Renderer — renders Result<T> for terminal output
 *
 * Style aligned with Claude Code:
 * - Unicode figures (✔ ✘ ⚠ ℹ) not emoji (✅ ❌ ⚠️ 💡)
 * - dimColor aggressively for secondary info
 * - Semantic colors from theme tokens
 * - Dense layouts, minimal whitespace
 */

import type { Result } from '../utils/result.js';
import type { LoginResult } from '../core/login.js';
import type { InitResult } from '../core/init.js';
import type { DoctorResult } from '../core/doctor.js';
import type { AuditResult } from '../core/audit/index.js';
import type { AuditFinding } from '../analyzers/types.js';
import { generateQRCode } from '../core/preview.js';
import { colors, figures, divider, heading, status, hint, cmd, progressBar, duration } from './theme.js';

// ─── Generic ─────────────────────────────────────────────────────────

export function renderResult<T>(result: Result<T>, formatter?: (data: T) => string): void {
  if (result.ok) {
    console.log(formatter ? formatter(result.data) : status('pass', String(result.data)));
  } else {
    console.error(status('fail', result.error.message));
    if (result.error.suggestion) console.log(hint(result.error.suggestion));
  }
}

export function renderComingSoon(command: string): void {
  console.log();
  console.log(status('warn', `"${command}" is coming soon`));
  console.log(hint(`Follow progress at ${cmd('https://github.com/ACRLABSDEV/shipmobile')}`));
  console.log();
}

// ─── Login ───────────────────────────────────────────────────────────

export function renderLoginResult(result: Result<LoginResult>, provider: string): void {
  if (!result.ok) {
    console.log(`  ${status('fail', `${provider}: ${result.error.message}`)}`);
    if (result.error.suggestion) console.log(`    ${hint(result.error.suggestion)}`);
    return;
  }
  const { details } = result.data;
  if (details.expo) console.log(`  ${status('pass', `Expo: @${details.expo.username} (${details.expo.plan || 'free'})`)}`);
  if (details.apple) console.log(`  ${status('pass', `Apple: ${details.apple.teamName}`)}`);
  if (details.google) console.log(`  ${status('pass', `Google Play: ${details.google.projectId}`)}`);
}

export function renderLoginStatus(result: Result<LoginResult>): void {
  console.log();
  console.log(`  ${heading('Connection Status')}`);
  console.log(`  ${divider(40)}`);
  console.log();

  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    return;
  }

  const { authenticated, details, issues } = result.data;

  console.log(`  ${authenticated.expo ? status('pass', `Expo/EAS: @${details.expo?.username || 'connected'}`) : status('fail', 'Expo/EAS: not connected')}`);
  console.log(`  ${authenticated.apple ? status('pass', `Apple: ${details.apple?.teamName || 'connected'}`) : status('fail', 'Apple: not connected')}`);
  console.log(`  ${authenticated.google ? status('pass', `Google Play: ${details.google?.projectId || 'connected'}`) : status('fail', 'Google Play: not connected')}`);

  if (issues.length > 0) {
    console.log();
    for (const issue of issues) console.log(`  ${colors.dim(issue)}`);
  }
  console.log();
}

// ─── Init ────────────────────────────────────────────────────────────

export function renderInitResult(result: Result<InitResult>): void {
  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    console.log();
    return;
  }

  const { project, issues, generated } = result.data;
  const workflowLabel: Record<string, string> = {
    'expo-managed': 'Expo managed',
    'expo-bare': 'Expo bare',
    'react-native-cli': 'React Native CLI',
  };

  console.log(`  ${colors.bold('Detected')}  ${colors.brand(workflowLabel[project.workflow] || project.workflow)}${project.sdkVersion ? colors.dim(` SDK ${project.sdkVersion}`) : ''}`);
  console.log(`  ${colors.bold('Project')}   ${project.name}`);
  console.log(`  ${colors.bold('Bundle')}    ${colors.dim(project.bundleId)}`);
  console.log(`  ${colors.bold('Version')}   ${colors.dim(project.version)}`);
  console.log(`  ${colors.bold('Platforms')} ${colors.dim(project.platforms.join(', '))}`);

  if (generated.length > 0) {
    console.log();
    for (const f of generated) console.log(`  ${status('pass', f)}`);
  }

  if (issues.length > 0) {
    console.log();
    for (const issue of issues) console.log(`  ${status('warn', issue)}`);
  }

  console.log();
  console.log(`  ${status('pass', `Configured. Next: ${cmd('shipmobile doctor')}`)}`);
  console.log();
}

// ─── Doctor ──────────────────────────────────────────────────────────

export function renderDoctorResult(result: Result<DoctorResult>): void {
  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    return;
  }

  const { passed, warnings, critical, checks } = result.data;

  console.log(`  Running ${checks.length} checks${colors.dim(figures.ellipsis)}\n`);

  const categories = ['structure', 'config', 'assets', 'accounts', 'build', 'dependencies', 'platform'] as const;
  const labels: Record<string, string> = {
    structure: 'Project Structure', config: 'Configuration', assets: 'Assets',
    accounts: 'Accounts', build: 'Build Readiness', dependencies: 'Dependencies', platform: 'Platform',
  };

  for (const cat of categories) {
    const catChecks = checks.filter((c) => c.category === cat);
    if (catChecks.length === 0) continue;

    console.log(`  ${colors.bold(labels[cat] || cat)}`);
    for (const c of catChecks) {
      const type = c.status === 'passed' ? 'pass' : c.severity === 'critical' ? 'fail' : 'warn';
      console.log(`    ${status(type, c.message)}`);
      if (c.status === 'failed' && c.suggestion) {
        console.log(`      ${hint(c.suggestion)}`);
      }
    }
    console.log();
  }

  console.log(`  ${divider(40)}`);
  console.log();
  console.log(`  ${status('pass', `${passed} passed`)}`);
  if (warnings.length > 0) console.log(`  ${status('warn', `${warnings.length} warnings`)}`);
  if (critical.length > 0) console.log(`  ${status('fail', `${critical.length} critical`)}`);

  if (critical.length > 0) {
    console.log(`\n  ${colors.error('Critical issues must be fixed before building')}`);
  } else if (warnings.length > 0) {
    console.log(`\n  ${colors.warning('Address warnings for best results')}`);
  } else {
    console.log(`\n  ${colors.success('All clear — ready to build')}`);
  }

  if (warnings.length + critical.length > 0) {
    console.log(`\n  ${hint(`Run ${cmd('shipmobile doctor --fix')} to auto-fix`)}`);
  }
  console.log();
}

// ─── Audit ───────────────────────────────────────────────────────────

export function renderAuditResult(result: Result<AuditResult & { _fixedCount?: number; _previous?: AuditResult }>): void {
  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    console.log();
    return;
  }

  const data = result.data;
  const { score, critical, warnings, info, metrics, findings } = data;

  console.log();
  console.log(`  ${heading('Audit Report')}`);
  console.log(`  ${divider(40)}`);
  console.log();

  // Score with color
  const scoreColor = score >= 80 ? colors.success : score >= 50 ? colors.warning : colors.error;
  console.log(`  Score  ${scoreColor(colors.bold(`${score}/100`))}`);
  console.log();

  // Summary line
  const passedCount = metrics.rulesRun - new Set(findings.map((f: AuditFinding) => f.ruleId)).size;
  console.log(`  ${status('pass', `${passedCount} rules passed`)}`);
  if (warnings.length > 0) console.log(`  ${status('warn', `${warnings.length} warnings`)}`);
  if (critical.length > 0) console.log(`  ${status('fail', `${critical.length} critical`)}`);
  if (info.length > 0) console.log(`  ${colors.dim(`  ${figures.info} ${info.length} suggestions`)}`);
  console.log();

  // Critical findings
  if (critical.length > 0) {
    console.log(`  ${colors.errorBold('Critical')}`);
    renderFindingGroup(critical);
    console.log();
  }

  // Warnings
  if (warnings.length > 0) {
    console.log(`  ${colors.warningBold('Warnings')}`);
    renderFindingGroup(warnings);
    console.log();
  }

  // Info
  if (info.length > 0) {
    console.log(`  ${colors.dim(colors.bold('Suggestions'))}`);
    renderFindingGroup(info);
    console.log();
  }

  // Diff
  if (data._previous) {
    const diff = score - data._previous.score;
    const diffStr = diff > 0 ? colors.success(`+${diff}`) : diff < 0 ? colors.error(`${diff}`) : colors.dim('±0');
    console.log(`  Diff  ${data._previous.score} ${figures.arrowRight} ${score} (${diffStr})`);
    console.log();
  }

  // Auto-fix
  if (data._fixedCount && data._fixedCount > 0) {
    console.log(`  ${status('pass', `Auto-fixed ${data._fixedCount} issues`)}`);
    console.log();
  }

  const fixable = findings.filter((f: AuditFinding) => f.autoFixable).length;
  if (fixable > 0) {
    console.log(`  ${hint(`Run ${cmd('shipmobile audit --fix')} to auto-fix ${fixable} issues`)}`);
    console.log();
  }

  console.log(`  ${colors.dim(`${metrics.totalFiles} files ${figures.dot} ${metrics.rulesRun} rules ${figures.dot} ${metrics.duration}ms`)}`);
  console.log();
}

function renderFindingGroup(findings: AuditFinding[]): void {
  const grouped = groupFindings(findings);
  for (const [, items] of grouped) {
    const first = items[0]!;
    const count = items.filter((f: AuditFinding) => f.file).length;
    const msg = count > 1 ? `${first.message} (${count}×)` : first.message;
    console.log(`    ${figures.pointerSmall} ${msg}`);
    if (first.suggestion) console.log(`      ${colors.dim(first.suggestion)}`);
    const locs = items.filter((f: AuditFinding) => f.file).slice(0, 3);
    if (locs.length > 0) {
      const paths = locs.map((f: AuditFinding) => `${f.file}${f.line ? `:${f.line}` : ''}`).join(', ');
      console.log(`      ${colors.dim(paths)}${items.length > 3 ? colors.dim(` +${items.length - 3}`) : ''}`);
    }
  }
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

// ─── Assets ──────────────────────────────────────────────────────────

export function renderAssetsResult(result: Result<import('../core/assets.js').AssetsResult>): void {
  if (!result.ok) {
    console.log(`\n  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    console.log();
    return;
  }

  const data = result.data;
  console.log();

  // Icon
  if (data.icon) {
    const iosCount = data.icon.generated.filter(g => g.platform === 'ios').length;
    const androidCount = data.icon.generated.filter(g => g.platform === 'android').length;
    console.log(`  ${status('pass', `Icon: ${data.icon.width}×${data.icon.height} ${figures.arrowRight} ${iosCount} iOS + ${androidCount} Android sizes`)}`);
  } else {
    console.log(`  ${status('fail', 'No app icon found')}`);
  }

  // Adaptive
  if (data.adaptiveIcon) {
    console.log(`  ${status('pass', `Adaptive icon: ${data.adaptiveIcon.generated.length} files`)}`);
  }

  // Splash
  if (data.splash.length > 0) {
    for (const s of data.splash) {
      if (s.valid) {
        console.log(`  ${status('pass', `Splash ${s.platform}: ${s.width}×${s.height}`)}`);
      } else {
        console.log(`  ${status('warn', `Splash ${s.platform}: ${s.width}×${s.height}`)}`);
        for (const issue of s.issues) console.log(`    ${hint(issue)}`);
      }
    }
  } else {
    console.log(`  ${status('fail', 'No splash screen found')}`);
  }

  // Screenshots
  for (const ss of data.screenshots) {
    if (ss.found) {
      console.log(`  ${status('pass', `${ss.label} (${ss.size})`)}`);
    } else {
      const type = ss.required ? 'fail' : 'warn';
      console.log(`  ${status(type, `Missing: ${ss.label} (${ss.size})`)}${ss.required ? '' : colors.dim(' optional')}`);
    }
  }

  // Recommendations
  if (data.recommendations.length > 0) {
    console.log();
    for (const r of data.recommendations) console.log(`  ${hint(r)}`);
  }
  console.log();
}

// ─── Build ───────────────────────────────────────────────────────────

export function renderBuildResult(result: Result<import('../core/build.js').BuildResult>): void {
  if (!result.ok) {
    console.log(`\n  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    console.log();
    return;
  }

  const data = result.data;
  console.log();

  if (data.validated) {
    console.log(`  ${status('pass', 'Pre-build validation passed')}`);
    for (const issue of data.validationIssues) {
      console.log(`    ${status('warn', issue)}`);
    }
    console.log();
  }

  for (const build of data.builds) {
    const type = build.status === 'errored' ? 'fail' : build.status === 'finished' ? 'pass' : 'info';
    const platform = build.platform === 'ios' ? 'iOS' : 'Android';

    console.log(`  ${status(type, `${colors.bold(platform)} ${figures.dot} ${build.profile}`)}`);
    console.log(`    Build  ${colors.brand(build.id)}`);
    console.log(`    Status ${build.status}`);
    if (build.estimatedTime) console.log(`    ETA    ${colors.dim(`~${Math.ceil(build.estimatedTime / 60)}min`)}`);
    if (build.error) console.log(`    ${colors.error(build.error)}`);
    console.log();
  }

  if (data.builds.some(b => b.status !== 'errored' && b.status !== 'finished')) {
    console.log(`  ${hint(`Monitor with ${cmd('shipmobile status')}`)}`);
    console.log();
  }
}

// ─── Status ──────────────────────────────────────────────────────────

export function renderStatusResult(result: Result<import('../core/status.js').StatusResult>): void {
  if (!result.ok) {
    console.log(`\n  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    console.log();
    return;
  }

  const data = result.data;
  console.log();

  // History mode
  if (data.history && data.history.length > 0) {
    console.log(`  ${heading('Build History')}`);
    console.log(`  ${divider(40)}`);
    console.log();
    for (const entry of data.history) {
      const type = entry.status === 'finished' ? 'pass' : entry.status === 'errored' ? 'fail' : 'info';
      const platform = entry.platform === 'ios' ? 'iOS' : 'Android';
      const date = new Date(entry.createdAt).toLocaleDateString();
      const dur = entry.duration ? ` ${duration(entry.duration * 1000)}` : '';
      console.log(`  ${status(type, `${colors.bold(platform)} ${entry.profile} ${colors.dim(`${figures.dot} ${entry.status}${dur} ${figures.dot} ${date}`)}`)}`);
      console.log(`    ${colors.dim(entry.id)}`);
    }
    console.log();
    return;
  }

  // Live status
  for (const build of data.builds) {
    const platform = build.platform === 'ios' ? 'iOS' : 'Android';
    const elapsed = duration(build.elapsedMs);

    if (build.isComplete) {
      console.log(`  ${status('pass', `${colors.bold(platform)} Complete ${colors.dim(`(${elapsed})`)}`)} `);
      if (build.artifacts?.applicationArchiveUrl) {
        console.log(`    ${colors.dim(build.artifacts.applicationArchiveUrl)}`);
      }
    } else if (build.isError) {
      console.log(`  ${status('fail', `${colors.bold(platform)} ${build.phaseLabel}`)}`);
      if (build.error) console.log(`    ${colors.error(build.error)}`);
    } else {
      const bar = progressBar(build.progress);
      const eta = build.estimatedRemaining ? `ETA ~${Math.ceil(build.estimatedRemaining / 60)}min` : '';
      console.log(`  ${colors.brand(colors.bold(platform))} ${build.phaseLabel}  ${bar} ${build.progress}%`);
      console.log(`    ${colors.dim(`${elapsed}${eta ? ` ${figures.dot} ${eta}` : ''}`)}`);
    }
    console.log();
  }

  // Logs
  if (data.logs && data.logs.length > 0) {
    console.log(`  ${heading('Build Logs')}`);
    console.log(`  ${divider(40)}`);
    for (const log of data.logs.slice(-20)) {
      console.log(`  ${colors.dim(log.timestamp)} ${log.message}`);
    }
    console.log();
  }
}

// ─── Preview ─────────────────────────────────────────────────────────

export async function renderPreviewResult(result: Result<import('../core/preview.js').PreviewResult>): Promise<void> {
  if (!result.ok) {
    console.log(`\n  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    console.log();
    return;
  }

  const data = result.data;
  console.log();

  const iosLinks = data.previews.filter(p => p.platform === 'ios');
  const androidLinks = data.previews.filter(p => p.platform === 'android');

  if (iosLinks.length > 0) {
    console.log(`  ${colors.bold('iOS')}`);
    for (const link of iosLinks) {
      console.log(`    ${colors.dim(link.label)}`);
      console.log(`    ${colors.brand(link.url)}`);
    }
    console.log();
  }

  if (androidLinks.length > 0) {
    console.log(`  ${colors.bold('Android')}`);
    for (const link of androidLinks) {
      console.log(`    ${colors.dim(link.label)}`);
      console.log(`    ${colors.brand(link.url)}`);
    }
    console.log();
  }

  // QR codes
  if (data.qrData.length > 0) {
    for (const url of data.qrData) {
      console.log(await generateQRCode(url));
      console.log(`  ${colors.dim('Scan to install')}`);
      console.log();
    }
  }

  console.log(`  ${hint('Share these links — anyone can install directly')}`);
  console.log();
}

// ─── Prepare ─────────────────────────────────────────────────────────

export function renderPrepareResult(result: Result<import('../core/prepare.js').PrepareResult>): void {
  if (!result.ok) {
    console.log(`\n  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    console.log();
    return;
  }

  const data = result.data;
  console.log();

  // Dense key-value layout
  const meta = data.metadata;
  console.log(`  ${colors.bold('App Name')}     ${meta.appName.value} ${colors.dim(`(${meta.appName.source})`)}`);
  console.log(`  ${colors.bold('Subtitle')}     ${meta.subtitle.value || colors.dim('none')} ${colors.dim(`(${meta.subtitle.source})`)}`);
  console.log(`  ${colors.bold('Category')}     ${meta.category.value} ${colors.dim(`(${meta.category.source})`)}`);
  console.log(`  ${colors.bold('Age Rating')}   ${meta.ageRating.value}`);
  console.log(`  ${colors.bold('Description')}  ${colors.dim(meta.shortDescription.value.slice(0, 50) + (meta.shortDescription.value.length > 50 ? figures.ellipsis : ''))}`);
  console.log(`  ${colors.bold('Keywords')}     ${colors.dim(meta.keywords.value || 'none')}`);
  console.log();

  // Privacy
  if (data.privacy.permissions.length > 0) {
    console.log(`  ${colors.bold('Permissions')}  ${colors.dim(data.privacy.permissions.join(', '))}`);
    console.log(`  ${status('pass', `Privacy policy ${figures.arrowRight} privacy-policy.html`)}`);
    console.log(`  ${hint('Host at a public URL for your app listing')}`);
    console.log();
  }

  // Validation
  const errors = data.validation.filter(v => v.severity === 'error');
  const warns = data.validation.filter(v => v.severity === 'warning');
  if (errors.length > 0) {
    for (const e of errors) console.log(`  ${status('fail', `${e.field}: ${e.message}`)}`);
  }
  if (warns.length > 0) {
    for (const w of warns) console.log(`  ${status('warn', `${w.field}: ${w.message}`)}`);
  }
  if (errors.length === 0 && warns.length === 0) {
    console.log(`  ${status('pass', 'All validation checks passed')}`);
  }
  console.log();

  console.log(`  ${status('pass', `Saved to ${colors.dim(data.savedTo)}`)}`);
  console.log(`  ${hint(`Next: ${cmd('shipmobile build')}`)}`);
  console.log();
}

// ─── Submit ──────────────────────────────────────────────────────────

export function renderSubmitResult(result: Result<import('../core/submit.js').SubmitResult>): void {
  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    return;
  }

  const data = result.data;

  // Preflight
  if (data.preflight.length > 0) {
    console.log(`  ${heading('Pre-flight')}`);
    for (const check of data.preflight) {
      console.log(`    ${status(check.passed ? 'pass' : 'fail', check.message)}`);
    }
    console.log();
  }

  if (!data.preflightPassed) {
    console.log(`  ${status('fail', 'Pre-flight checks failed. Fix issues above.')}`);
    return;
  }

  if (data.ios) {
    console.log(`  ${heading('App Store Connect')}`);
    console.log(`    Status   ${colors.success(data.ios.status)}`);
    console.log(`    Version  ${data.ios.version}`);
    if (data.ios.reviewUrl) console.log(`    Review   ${colors.brand(data.ios.reviewUrl)}`);
    console.log();
  }

  if (data.android) {
    console.log(`  ${heading('Google Play')}`);
    console.log(`    Status   ${colors.success(data.android.status)}`);
    console.log(`    Track    ${data.android.track}`);
    console.log(`    Version  ${data.android.version}`);
    console.log();
  }

  if (!data.ios && !data.android) {
    console.log(`  ${status('warn', `No builds submitted. Run ${cmd('shipmobile build')} first.`)}`);
  } else {
    console.log(`  ${status('pass', 'Submission complete')}`);
    console.log(`  ${hint(`Track with ${cmd('shipmobile status')}`)}`);
  }
  console.log();
}

// ─── Reset ───────────────────────────────────────────────────────────

export function renderResetResult(result: Result<import('../core/reset.js').ResetResult>): void {
  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    return;
  }

  const data = result.data;
  if (data.cleared) {
    console.log(`  ${status('pass', data.message)}`);
  } else {
    console.log(`  ${colors.dim(data.message)}`);
  }
  console.log();
}
