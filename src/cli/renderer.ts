/**
 * CLI Renderer — renders Result<T> for terminal output
 *
 * Claude Code-aligned styling:
 * - Unicode figures (✔ ✘ ⚠ ℹ) — no emoji
 * - dimColor aggressively for secondary info
 * - Passing checks are dimmed (don't shout about what's fine)
 * - Failed checks are bold/colored (draw attention to problems)
 * - Category headers with counts
 * - Indentation hierarchy: category → item → detail (each level dimmer)
 * - Thin borders, dot separators between sections
 */

import type { Result } from '../utils/result.js';
import type { LoginResult } from '../core/login.js';
import type { InitResult } from '../core/init.js';
import type { DoctorResult } from '../core/doctor.js';
import type { AuditResult } from '../core/audit/index.js';
import type { AuditFinding } from '../analyzers/types.js';
import { generateQRCode } from '../core/preview.js';
import {
  colors, figures, divider, heading, status, statusDim, hint, cmd,
  progressBar, duration, dotLine, categoryHeading, thinBox, hyperlink,
} from './theme.js';

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
  if (details.expo) console.log(`  ${status('pass', `Expo  ${colors.dim(`@${details.expo.username}`)} ${colors.dim(details.expo.plan || 'free')}`)}`);
  if (details.apple) console.log(`  ${status('pass', `Apple  ${colors.dim(details.apple.teamName)}`)}`);
  if (details.google) console.log(`  ${status('pass', `Google Play  ${colors.dim(details.google.projectId)}`)}`);
}

export function renderLoginStatus(result: Result<LoginResult>): void {
  console.log();
  console.log(`  ${heading('Connection Status')}`);
  console.log(`  ${dotLine(40)}`);
  console.log();

  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    return;
  }

  const { authenticated, details, issues } = result.data;

  // Connected services: bright. Disconnected: red with action hint.
  if (authenticated.expo) {
    console.log(`  ${statusDim('pass', `Expo/EAS  ${colors.dim(`@${details.expo?.username || 'connected'}`)}`)}`);
  } else {
    console.log(`  ${status('fail', 'Expo/EAS  not connected')}`);
  }

  if (authenticated.apple) {
    console.log(`  ${statusDim('pass', `Apple  ${colors.dim(details.apple?.teamName || 'connected')}`)}`);
  } else {
    console.log(`  ${status('fail', 'Apple  not connected')}`);
  }

  if (authenticated.google) {
    console.log(`  ${statusDim('pass', `Google Play  ${colors.dim(details.google?.projectId || 'connected')}`)}`);
  } else {
    console.log(`  ${status('fail', 'Google Play  not connected')}`);
  }

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

  // Dense key-value pairs with aligned labels
  const label = (text: string) => colors.dim(text.padEnd(12));
  console.log(`  ${label('Detected')}${colors.brand(workflowLabel[project.workflow] || project.workflow)}${project.sdkVersion ? colors.dim(` SDK ${project.sdkVersion}`) : ''}`);
  console.log(`  ${label('Project')}${project.name}`);
  console.log(`  ${label('Bundle')}${colors.dim(project.bundleId)}`);
  console.log(`  ${label('Version')}${colors.dim(project.version)}`);
  console.log(`  ${label('Platforms')}${colors.dim(project.platforms.join(', '))}`);

  if (generated.length > 0) {
    console.log();
    for (const f of generated) console.log(`  ${statusDim('pass', f)}`);
  }

  if (issues.length > 0) {
    console.log();
    for (const issue of issues) console.log(`  ${status('warn', issue)}`);
  }

  console.log();
  console.log(`  ${status('pass', `Configured`)} ${colors.dim(`${figures.arrowRight} next: ${cmd('shipmobile doctor')}`)}`);
  console.log();
}

// ─── Doctor ──────────────────────────────────────────────────────────

export function renderDoctorResult(result: Result<DoctorResult>): void {
  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    return;
  }

  const { passed, warnings, critical, checks } = result.data;

  const categories = ['structure', 'config', 'assets', 'accounts', 'build', 'dependencies', 'platform'] as const;
  const labels: Record<string, string> = {
    structure: 'Project Structure', config: 'Configuration', assets: 'Assets',
    accounts: 'Accounts', build: 'Build Readiness', dependencies: 'Dependencies', platform: 'Platform',
  };

  for (const cat of categories) {
    const catChecks = checks.filter((c) => c.category === cat);
    if (catChecks.length === 0) continue;

    const failCount = catChecks.filter(c => c.status === 'failed').length;
    const warnCount = catChecks.filter(c => c.status !== 'passed' && c.severity !== 'critical').length;
    const issueCount = failCount + warnCount;

    // Category header with issue count
    const countSuffix = issueCount > 0
      ? ` ${colors.dim('·')} ${issueCount === failCount ? colors.error(`${issueCount} issues`) : colors.warning(`${issueCount} issues`)}`
      : '';
    console.log(`  ${categoryHeading(labels[cat] || cat)}${countSuffix}`);

    for (const c of catChecks) {
      if (c.status === 'passed') {
        // Passing checks: dimmed entirely — don't shout about what's fine
        console.log(`    ${statusDim('pass', c.message)}`);
      } else {
        // Failed/warned: bright icon + white text
        const type = c.severity === 'critical' ? 'fail' : 'warn';
        console.log(`    ${status(type, c.message)}`);
        if (c.suggestion) {
          console.log(`      ${hint(c.suggestion)}`);
        }
      }
    }
    console.log();
  }

  // Summary
  console.log(`  ${dotLine(40)}`);
  console.log();

  const parts: string[] = [];
  parts.push(colors.dim(`${passed} passed`));
  if (warnings.length > 0) parts.push(colors.warning(`${warnings.length} warnings`));
  if (critical.length > 0) parts.push(colors.error(`${critical.length} critical`));
  console.log(`  ${parts.join(colors.dim(` ${figures.dot} `))}`);

  if (critical.length > 0) {
    console.log(`  ${colors.error('Fix critical issues before building')}`);
  } else if (warnings.length > 0) {
    console.log(`  ${colors.dim('Address warnings for best results')}`);
  } else {
    console.log(`  ${colors.success('All clear — ready to build')}`);
  }

  if (warnings.length + critical.length > 0) {
    console.log();
    console.log(`  ${hint(`Run ${cmd('shipmobile doctor --fix')} to auto-fix`)}`);
  }
  console.log();
}

// ─── Audit ───────────────────────────────────────────────────────────

export function renderAuditResult(result: Result<AuditResult>): void {
  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    console.log();
    return;
  }

  const data = result.data;
  const { score, critical, warnings, info, metrics, findings } = data;

  console.log();

  // Score — prominent with color-coded box
  const scoreColor = score >= 80 ? colors.success : score >= 50 ? colors.warning : colors.error;
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 50 ? 'Needs Work' : 'Critical';
  const scoreBox = thinBox(
    `${scoreColor(colors.bold(`${score}/100`))}  ${colors.dim(scoreLabel)}`,
    { title: 'Audit Score', borderColor: scoreColor },
  );
  console.log(scoreBox.split('\n').map(l => '  ' + l).join('\n'));
  console.log();

  // Summary counts on one line
  const passedCount = metrics.rulesRun - new Set(findings.map((f: AuditFinding) => f.ruleId)).size;
  const summaryParts: string[] = [];
  summaryParts.push(colors.dim(`${passedCount} passed`));
  if (warnings.length > 0) summaryParts.push(colors.warning(`${warnings.length} warnings`));
  if (critical.length > 0) summaryParts.push(colors.error(`${critical.length} critical`));
  if (info.length > 0) summaryParts.push(colors.dim(`${info.length} suggestions`));
  console.log(`  ${summaryParts.join(colors.dim(` ${figures.dot} `))}`);
  console.log();

  // Critical findings — category grouped
  if (critical.length > 0) {
    console.log(`  ${colors.errorBold('Critical')}`);
    renderFindingGroup(critical, 2);
    console.log();
  }

  // Warnings — category grouped
  if (warnings.length > 0) {
    console.log(`  ${colors.warningBold('Warnings')}`);
    renderFindingGroup(warnings, 2);
    console.log();
  }

  // Info — entirely dimmed
  if (info.length > 0) {
    console.log(`  ${colors.dim(colors.bold('Suggestions'))}`);
    renderFindingGroup(info, 2);
    console.log();
  }

  // Diff from previous
  if (data._previous) {
    const diff = score - data._previous.score;
    const diffStr = diff > 0 ? colors.success(`+${diff}`) : diff < 0 ? colors.error(`${diff}`) : colors.dim('±0');
    console.log(`  ${colors.dim('Diff')}  ${data._previous.score} ${figures.arrowRight} ${score} ${colors.dim('(')}${diffStr}${colors.dim(')')}`);
    console.log();
  }

  // Auto-fix report
  if (data._fixedCount && data._fixedCount > 0) {
    console.log(`  ${status('pass', `Auto-fixed ${data._fixedCount} issues`)}`);

    if (data._fixReport && data._fixReport.length > 0) {
      console.log(`  ${colors.dim('Fixed')}`);
      for (const entry of data._fixReport) {
        const label = entry.resolvedCount > 0 ? `${entry.ruleId} (${entry.resolvedCount})` : `${entry.ruleId} (${entry.fixedCount})`;
        console.log(`    ${figures.pointerSmall} ${label}`);
        if (entry.files.length > 0) {
          const filesPreview = entry.files.slice(0, 3).join(', ');
          const extra = entry.files.length > 3 ? ` +${entry.files.length - 3}` : '';
          console.log(`      ${colors.dim(filesPreview)}${colors.dim(extra)}`);
        }
      }
    }
    console.log();
  }

  const fixable = data._fixableCount ?? findings.filter((f: AuditFinding) => f.autoFixable).length;
  if (fixable > 0) {
    console.log(`  ${hint(`Run ${cmd('shipmobile audit --fix')} to auto-fix ${fixable} issues`)}`);
    console.log();
  }

  console.log(`  ${colors.dim(`${metrics.totalFiles} files ${figures.dot} ${metrics.rulesRun} rules ${figures.dot} ${metrics.duration}ms`)}`);
  console.log();
}

function renderFindingGroup(findings: AuditFinding[], baseIndent = 1): void {
  const pad = '  '.repeat(baseIndent);
  const grouped = groupFindings(findings);
  for (const [, items] of grouped) {
    const first = items[0]!;
    const count = items.filter((f: AuditFinding) => f.file).length;
    const msg = count > 1 ? `${first.message} ${colors.dim(`(${count}×`)}` + colors.dim(')') : first.message;
    console.log(`${pad}${figures.pointerSmall} ${msg}`);
    if (first.suggestion) console.log(`${pad}  ${colors.dim(first.suggestion)}`);
    // File locations — deepest indent level, most dimmed
    const locs = items.filter((f: AuditFinding) => f.file).slice(0, 3);
    if (locs.length > 0) {
      const paths = locs.map((f: AuditFinding) => `${f.file}${f.line ? `:${f.line}` : ''}`).join(', ');
      console.log(`${pad}  ${colors.dim(paths)}${items.length > 3 ? colors.dim(` +${items.length - 3}`) : ''}`);
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

  // Icon — grouped under category
  console.log(`  ${categoryHeading('Icons')}`);
  if (data.icon) {
    const iosCount = data.icon.generated.filter(g => g.platform === 'ios').length;
    const androidCount = data.icon.generated.filter(g => g.platform === 'android').length;
    console.log(`    ${statusDim('pass', `Source ${colors.dim(`${data.icon.width}×${data.icon.height}`)} ${figures.arrowRight} ${colors.dim(`${iosCount} iOS + ${androidCount} Android`)}`)}`);
  } else {
    console.log(`    ${status('fail', 'No app icon found')}`);
  }

  if (data.adaptiveIcon) {
    console.log(`    ${statusDim('pass', `Adaptive icon ${colors.dim(`${data.adaptiveIcon.generated.length} files`)}`)}`);
  }
  console.log();

  // Splash
  console.log(`  ${categoryHeading('Splash Screens')}`);
  if (data.splash.length > 0) {
    for (const s of data.splash) {
      if (s.valid) {
        console.log(`    ${statusDim('pass', `${s.platform} ${colors.dim(`${s.width}×${s.height}`)}`)}`);
      } else {
        console.log(`    ${status('warn', `${s.platform} ${colors.dim(`${s.width}×${s.height}`)}`)}`);
        for (const issue of s.issues) console.log(`      ${hint(issue)}`);
      }
    }
  } else {
    console.log(`    ${status('fail', 'No splash screen found')}`);
  }
  console.log();

  // Screenshots
  if (data.screenshots.length > 0) {
    const found = data.screenshots.filter(ss => ss.found).length;
    const total = data.screenshots.length;
    console.log(`  ${categoryHeading('Screenshots', found)} ${colors.dim(`of ${total}`)}`);
    for (const ss of data.screenshots) {
      if (ss.found) {
        console.log(`    ${statusDim('pass', `${ss.label} ${colors.dim(ss.size)}`)}`);
      } else {
        const type = ss.required ? 'fail' : 'warn';
        console.log(`    ${status(type, `${ss.label} ${colors.dim(ss.size)}`)}${ss.required ? '' : colors.dim(' optional')}`);
      }
    }
    console.log();
  }

  // Recommendations
  if (data.recommendations.length > 0) {
    for (const r of data.recommendations) console.log(`  ${hint(r)}`);
    console.log();
  }
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
    console.log(`  ${statusDim('pass', 'Pre-build validation passed')}`);
    for (const issue of data.validationIssues) {
      console.log(`    ${status('warn', issue)}`);
    }
    console.log();
  }

  for (const build of data.builds) {
    const type = build.status === 'errored' ? 'fail' : build.status === 'finished' ? 'pass' : 'info';
    const platform = build.platform === 'ios' ? 'iOS' : 'Android';

    console.log(`  ${status(type, colors.bold(platform))}`);
    console.log(`    ${colors.dim('Build')}    ${colors.brand(build.id)}`);
    console.log(`    ${colors.dim('Profile')}  ${build.profile}`);
    console.log(`    ${colors.dim('Status')}   ${build.status}`);
    if (build.estimatedTime) console.log(`    ${colors.dim('ETA')}      ${colors.dim(`~${Math.ceil(build.estimatedTime / 60)}min`)}`);
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
    console.log(`  ${dotLine(40)}`);
    console.log();
    for (const entry of data.history) {
      const type = entry.status === 'finished' ? 'pass' : entry.status === 'errored' ? 'fail' : 'info';
      const platform = entry.platform === 'ios' ? 'iOS' : 'Android';
      const date = new Date(entry.createdAt).toLocaleDateString();
      const dur = entry.duration ? ` ${duration(entry.duration * 1000)}` : '';
      console.log(`  ${status(type, colors.bold(platform))} ${colors.dim(`${entry.profile} ${figures.dot} ${entry.status}${dur} ${figures.dot} ${date}`)}`);
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
      console.log(`  ${status('pass', `${colors.bold(platform)} Complete`)} ${colors.dim(elapsed)}`);
      if (build.artifacts?.applicationArchiveUrl) {
        console.log(`    ${colors.dim(build.artifacts.applicationArchiveUrl)}`);
      }
    } else if (build.isError) {
      console.log(`  ${status('fail', `${colors.bold(platform)} ${build.phaseLabel}`)}`);
      if (build.error) console.log(`    ${colors.error(build.error)}`);
    } else {
      const eta = build.estimatedRemaining ? `ETA ~${Math.ceil(build.estimatedRemaining / 60)}min` : '';
      console.log(`  ${colors.brand(colors.bold(platform))} ${build.phaseLabel}`);
      console.log(`    ${progressBar(build.progress)}`);
      console.log(`    ${colors.dim(`${elapsed}${eta ? ` ${figures.dot} ${eta}` : ''}`)}`);
    }
    console.log();
  }

  // Logs
  if (data.logs && data.logs.length > 0) {
    console.log(`  ${heading('Build Logs')}`);
    console.log(`  ${dotLine(40)}`);
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
    console.log(`  ${categoryHeading('iOS')}`);
    for (const link of iosLinks) {
      console.log(`    ${colors.dim(link.label)}`);
      console.log(`    ${hyperlink(colors.brand(link.url), link.url)}`);
    }
    console.log();
  }

  if (androidLinks.length > 0) {
    console.log(`  ${categoryHeading('Android')}`);
    for (const link of androidLinks) {
      console.log(`    ${colors.dim(link.label)}`);
      console.log(`    ${hyperlink(colors.brand(link.url), link.url)}`);
    }
    console.log();
  }

  // QR codes
  if (data.qrData.length > 0) {
    console.log(`  ${dotLine(40)}`);
    console.log();
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

  // Dense key-value layout with aligned dim labels
  const meta = data.metadata;
  const label = (text: string) => colors.dim(text.padEnd(14));
  console.log(`  ${label('App Name')}${meta.appName.value} ${colors.dim(`(${meta.appName.source})`)}`);
  console.log(`  ${label('Subtitle')}${meta.subtitle.value || colors.dim('none')} ${colors.dim(`(${meta.subtitle.source})`)}`);
  console.log(`  ${label('Category')}${meta.category.value} ${colors.dim(`(${meta.category.source})`)}`);
  console.log(`  ${label('Age Rating')}${meta.ageRating.value}`);
  console.log(`  ${label('Description')}${colors.dim(meta.shortDescription.value.slice(0, 50) + (meta.shortDescription.value.length > 50 ? figures.ellipsis : ''))}`);
  console.log(`  ${label('Keywords')}${colors.dim(meta.keywords.value || 'none')}`);
  console.log();

  // Privacy
  if (data.privacy.permissions.length > 0) {
    console.log(`  ${categoryHeading('Privacy')}`);
    console.log(`    ${colors.dim('Permissions')}  ${colors.dim(data.privacy.permissions.join(', '))}`);
    console.log(`    ${statusDim('pass', `Privacy policy ${figures.arrowRight} privacy-policy.html`)}`);
    console.log(`    ${hint('Host at a public URL for your app listing')}`);
    console.log();
  }

  // Validation
  console.log(`  ${dotLine(40)}`);
  console.log();
  const errors = data.validation.filter(v => v.severity === 'error');
  const warns = data.validation.filter(v => v.severity === 'warning');
  if (errors.length > 0) {
    for (const e of errors) console.log(`  ${status('fail', `${e.field}: ${e.message}`)}`);
  }
  if (warns.length > 0) {
    for (const w of warns) console.log(`  ${status('warn', `${w.field}: ${w.message}`)}`);
  }
  if (errors.length === 0 && warns.length === 0) {
    console.log(`  ${statusDim('pass', 'All validation checks passed')}`);
  }
  console.log();

  console.log(`  ${statusDim('pass', `Saved to ${colors.dim(data.savedTo)}`)}`);
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
    console.log(`  ${categoryHeading('Pre-flight')}`);
    for (const check of data.preflight) {
      if (check.passed) {
        console.log(`    ${statusDim('pass', check.message)}`);
      } else {
        console.log(`    ${status('fail', check.message)}`);
      }
    }
    console.log();
  }

  if (!data.preflightPassed) {
    console.log(`  ${status('fail', 'Pre-flight checks failed. Fix issues above.')}`);
    return;
  }

  if (data.ios) {
    console.log(`  ${categoryHeading('App Store Connect')}`);
    const label = (text: string) => colors.dim(text.padEnd(10));
    console.log(`    ${label('Status')}${colors.success(data.ios.status)}`);
    console.log(`    ${label('Version')}${data.ios.version}`);
    if (data.ios.reviewUrl) console.log(`    ${label('Review')}${hyperlink(colors.brand(data.ios.reviewUrl), data.ios.reviewUrl)}`);
    console.log();
  }

  if (data.android) {
    console.log(`  ${categoryHeading('Google Play')}`);
    const label = (text: string) => colors.dim(text.padEnd(10));
    console.log(`    ${label('Status')}${colors.success(data.android.status)}`);
    console.log(`    ${label('Track')}${data.android.track}`);
    console.log(`    ${label('Version')}${data.android.version}`);
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

// ─── Update (OTA) ────────────────────────────────────────────────────

export function renderUpdateResult(result: Result<import('../core/update.js').UpdateResult>): void {
  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    return;
  }

  const data = result.data;

  // Native change warnings
  if (data.nativeCheck.hasNativeChanges) {
    console.log(`  ${categoryHeading('Native Changes Detected')}`);
    for (const change of data.nativeCheck.changes) {
      console.log(`    ${status('warn', change)}`);
    }
    console.log(`    ${hint(`Consider running ${cmd('shipmobile build')} for a full native rebuild`)}`);
    console.log();
  }

  if (data.published && data.update) {
    console.log(`  ${categoryHeading('OTA Update Published')}`);
    const label = (text: string) => colors.dim(text.padEnd(12));
    console.log(`    ${label('Channel')}${colors.brand(data.channel)}`);
    console.log(`    ${label('Platform')}${data.platform}`);
    console.log(`    ${label('Group')}${data.update.group}`);
    if (data.update.message) console.log(`    ${label('Message')}${data.update.message}`);
    console.log(`    ${label('Runtime')}${data.update.runtimeVersion}`);
    console.log();
    console.log(`  ${status('pass', 'Update published successfully')}`);
    console.log(`  ${hint(`Roll back with ${cmd('shipmobile rollback --channel ' + data.channel)}`)}`);
  }
  console.log();
}

// ─── Rollback ────────────────────────────────────────────────────────

export function renderRollbackResult(result: Result<import('../core/rollback.js').RollbackResult>): void {
  if (!result.ok) {
    console.log(`  ${status('fail', result.error.message)}`);
    if (result.error.suggestion) console.log(`  ${hint(result.error.suggestion)}`);
    return;
  }

  const data = result.data;

  if (data.availableGroups.length > 0) {
    console.log(`  ${categoryHeading('Recent Updates')}`);
    for (const group of data.availableGroups.slice(0, 5)) {
      const marker = data.update && group.group === data.previousGroup?.group ? colors.brand(' ← rolled back to') : '';
      console.log(`    ${colors.dim(group.createdAt.slice(0, 10))} ${group.group.slice(0, 8)}${group.message ? ` ${colors.dim(group.message)}` : ''}${marker}`);
    }
    console.log();
  }

  if (data.rolledBack && data.update) {
    console.log(`  ${status('pass', `Rolled back on channel "${data.channel}"`)}`);
    if (data.previousGroup) {
      console.log(`  ${hint(`Reverted to group ${data.previousGroup.group.slice(0, 8)}`)}`);
    }
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
