/**
 * Audit Engine — Run audit rules and produce results
 */

import { ok, err, type Result } from '../../utils/result.js';
import type { AuditFinding, AuditContext } from '../../analyzers/types.js';
import { allRules, getRulesByCategory } from '../../analyzers/rules/index.js';
import { buildAuditContext } from '../../analyzers/discovery.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
    for (const rule of rules) {
      if (rule.fix) {
        const fixedCount = await rule.fix(context);
        totalFixed += fixedCount;
      }
    }
    // Re-run context after fixes
    const newContext = buildAuditContext(projectPath);
    const findings = await runRules(rules, newContext);
    const result = buildResult(findings, newContext.files.length, allRules.length, rules.length, startTime);
    return ok({ ...result, _fixedCount: totalFixed } as AuditResult & { _fixedCount: number });
  }

  const findings = await runRules(rules, context);
  const result = buildResult(findings, context.files.length, allRules.length, rules.length, startTime);

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
      return ok({ ...result, _previous: previous } as AuditResult & { _previous: AuditResult });
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

  return ok(result);
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
