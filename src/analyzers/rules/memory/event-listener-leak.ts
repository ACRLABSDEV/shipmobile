import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

export const eventListenerLeakRule: AuditRule = {
  id: 'event-listener-leak',
  name: 'Event Listener Leak',
  description: 'addEventListener without matching removeEventListener',
  category: 'memory',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      const hasAdd = file.content.includes('addEventListener');
      const hasRemove = file.content.includes('removeEventListener');
      if (hasAdd && !hasRemove) {
        const line = file.content.split('\n').findIndex((l) => l.includes('addEventListener'));
        findings.push({
          ruleId: this.id, severity: this.severity, category: this.category,
          message: 'addEventListener without removeEventListener',
          file: file.path, line: line >= 0 ? line + 1 : undefined,
          suggestion: 'Add removeEventListener in cleanup to prevent memory leaks',
        });
      }
    }
    return findings;
  },
};

export default eventListenerLeakRule;
