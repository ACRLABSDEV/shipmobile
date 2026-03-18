/**
 * Audit Engine — Run audit rules and produce results
 */

import { ok, err, type Result } from '../../utils/result.js';
import type { AuditFinding, AuditContext } from '../../analyzers/types.js';
import { allRules, getRulesByCategory } from '../../analyzers/rules/index.js';
import { buildAuditContext } from '../../analyzers/discovery.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface AuditFixReportEntry {
  ruleId: string;
  ruleName: string;
  fixedCount: number;
  resolvedCount: number;
  files: string[];
}

export interface AuditResult {
  score: number;
  critical: AuditFinding[];
  warnings: AuditFinding[];
  info: AuditFinding[];
  metrics: {
    totalFiles: number;
    totalRules: number;
    rulesRun: number;
    duration: number;
  };
  findings: AuditFinding[];
  _fixedCount?: number;
  _fixableCount?: number;
  _fixReport?: AuditFixReportEntry[];
  _previous?: AuditResult;
}

export interface AuditOptions {
  projectPath?: string;
  category?: string;
  fix?: boolean;
  diff?: boolean;
}

export function calculateScore(findings: AuditFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === 'critical') score -= 10;
    else if (f.severity === 'warning') score -= 3;
    else score -= 1;
  }
  return Math.max(0, score);
}

export async function execute(options: AuditOptions = {}): Promise<Result<AuditResult>> {
  const projectPath = options.projectPath || process.cwd();

  if (!existsSync(projectPath)) {
    return err({ message: `Project path not found: ${projectPath}`, code: 'PROJECT_NOT_FOUND' });
  }

  const startTime = Date.now();
  const context: AuditContext = buildAuditContext(projectPath);

  const rules = options.category
    ? getRulesByCategory(options.category)
    : allRules;

  if (rules.length === 0) {
    return err({ message: `No rules found for category: ${options.category}`, code: 'NO_RULES' });
  }

  // Run fix mode
  if (options.fix) {
    let totalFixed = 0;
    const fixReport: AuditFixReportEntry[] = [];

    for (const rule of rules) {
      if (!rule.fix) continue;

      const beforeContext = buildAuditContext(projectPath);
      const beforeFindings = await rule.check(beforeContext);
      const fixedCount = await rule.fix(beforeContext);
      totalFixed += fixedCount;

      if (fixedCount > 0 || beforeFindings.length > 0) {
        const afterContext = buildAuditContext(projectPath);
        const afterFindings = await rule.check(afterContext);

        const resolved = getResolvedFindings(beforeFindings, afterFindings);
        const files = Array.from(new Set(resolved.map((f) => f.file).filter(Boolean))) as string[];

        if (fixedCount > 0 || resolved.length > 0) {
          fixReport.push({
            ruleId: rule.id,
            ruleName: rule.name,
            fixedCount,
            resolvedCount: resolved.length,
            files,
          });
        }
      }
    }

    // Re-run context after fixes
    const newContext = buildAuditContext(projectPath);
    const findings = await runRules(rules, newContext);
    const result = buildResult(findings, newContext.files.length, allRules.length, rules.length, startTime);
    const fixableCount = getFixableFindingCount(findings, rules);

    return ok({
      ...result,
      _fixedCount: totalFixed,
      _fixableCount: fixableCount,
      _fixReport: fixReport,
    });
  }

  const findings = await runRules(rules, context);
  const result = buildResult(findings, context.files.length, allRules.length, rules.length, startTime);
  const fixableCount = getFixableFindingCount(findings, rules);

  // Save history for diff
  if (options.diff) {
    const historyDir = join(projectPath, '.shipmobile', 'audit-history');
    mkdirSync(historyDir, { recursive: true });

    const previousPath = join(historyDir, 'latest.json');
    let previous: AuditResult | null = null;
    if (existsSync(previousPath)) {
      try {
        previous = JSON.parse(readFileSync(previousPath, 'utf-8'));
      } catch {
        // ignore
      }
    }

    writeFileSync(previousPath, JSON.stringify(result, null, 2));

    if (previous) {
      return ok({ ...result, _fixableCount: fixableCount, _previous: previous });
    }
  } else {
    // Always save latest
    try {
      const historyDir = join(projectPath, '.shipmobile', 'audit-history');
      mkdirSync(historyDir, { recursive: true });
      writeFileSync(join(historyDir, 'latest.json'), JSON.stringify(result, null, 2));
    } catch {
      // non-critical
    }
  }

  return ok({ ...result, _fixableCount: fixableCount });
}

async function runRules(rules: typeof allRules, context: AuditContext): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  for (const rule of rules) {
    try {
      const ruleFindings = await rule.check(context);
      findings.push(...ruleFindings);
    } catch {
      // skip failed rules
    }
  }
  return findings;
}

function getFixableFindingCount(findings: AuditFinding[], rules: typeof allRules): number {
  const fixableRuleIds = new Set(rules.filter((r) => !!r.fix).map((r) => r.id));
  return findings.filter((f) => f.autoFixable && fixableRuleIds.has(f.ruleId)).length;
}

function getResolvedFindings(before: AuditFinding[], after: AuditFinding[]): AuditFinding[] {
  const afterKeys = new Set(after.map((f) => findingKey(f)));
  return before.filter((f) => !afterKeys.has(findingKey(f)));
}

function findingKey(f: AuditFinding): string {
  return `${f.ruleId}|${f.file || ''}|${f.line || ''}|${f.message}`;
}

function buildResult(
  findings: AuditFinding[],
  totalFiles: number,
  totalRules: number,
  rulesRun: number,
  startTime: number,
): AuditResult {
  return {
    score: calculateScore(findings),
    critical: findings.filter((f) => f.severity === 'critical'),
    warnings: findings.filter((f) => f.severity === 'warning'),
    info: findings.filter((f) => f.severity === 'info'),
    metrics: {
      totalFiles,
      totalRules,
      rulesRun,
      duration: Date.now() - startTime,
    },
    findings,
  };
}
