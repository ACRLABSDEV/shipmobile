import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

export const unclearedTimersRule: AuditRule = {
  id: 'uncleared-timers',
  name: 'Uncleared Timers',
  description: 'setInterval/setTimeout without clear counterpart',
  category: 'memory',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      const lines = file.content.split('\n');
      const hasSetInterval = file.content.includes('setInterval');
      const hasClearInterval = file.content.includes('clearInterval');
      const hasSetTimeout = file.content.includes('setTimeout');
      const hasClearTimeout = file.content.includes('clearTimeout');

      if (hasSetInterval && !hasClearInterval) {
        const line = lines.findIndex((l) => l.includes('setInterval'));
        findings.push({
          ruleId: this.id, severity: this.severity, category: this.category,
          message: 'setInterval without clearInterval',
          file: file.path, line: line >= 0 ? line + 1 : undefined,
          suggestion: 'Store interval ID and call clearInterval in cleanup',
        });
      }
      if (hasSetTimeout && !hasClearTimeout) {
        const line = lines.findIndex((l) => l.includes('setTimeout'));
        findings.push({
          ruleId: this.id, severity: this.severity, category: this.category,
          message: 'setTimeout without clearTimeout',
          file: file.path, line: line >= 0 ? line + 1 : undefined,
          suggestion: 'Store timeout ID and call clearTimeout in cleanup',
        });
      }
    }
    return findings;
  },
};

export default unclearedTimersRule;
