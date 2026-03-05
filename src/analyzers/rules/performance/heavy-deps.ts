import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

const HEAVY_PACKAGES: { name: string; size: string; alternative: string; altSize: string }[] = [
  { name: 'moment', size: '320KB', alternative: 'dayjs', altSize: '2KB' },
  { name: 'moment-timezone', size: '400KB', alternative: 'dayjs + timezone plugin', altSize: '5KB' },
  { name: 'lodash', size: '530KB', alternative: 'lodash-es or individual imports', altSize: '~10KB' },
  { name: 'axios', size: '50KB', alternative: 'fetch (native)', altSize: '0KB' },
  { name: 'uuid', size: '12KB', alternative: 'crypto.randomUUID() (native)', altSize: '0KB' },
  { name: 'underscore', size: '60KB', alternative: 'native Array/Object methods', altSize: '0KB' },
  { name: 'bluebird', size: '80KB', alternative: 'native Promise', altSize: '0KB' },
];

export const heavyDepsRule: AuditRule = {
  id: 'heavy-deps',
  name: 'Heavy Dependencies',
  description: 'Flag heavy packages with lighter alternatives',
  category: 'performance',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const deps = {
      ...(context.packageJson.dependencies as Record<string, string> | undefined),
      ...(context.packageJson.devDependencies as Record<string, string> | undefined),
    };
    const findings: AuditFinding[] = [];
    for (const pkg of HEAVY_PACKAGES) {
      if (deps[pkg.name]) {
        findings.push({
          ruleId: this.id, severity: this.severity, category: this.category,
          message: `${pkg.name} (${pkg.size}) detected`,
          suggestion: `Replace with ${pkg.alternative} (${pkg.altSize}) — same API`,
        });
      }
    }
    return findings;
  },
};

export default heavyDepsRule;
