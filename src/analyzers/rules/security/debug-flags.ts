import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

export const debugFlagsRule: AuditRule = {
  id: 'debug-flags',
  name: 'Debug Flags',
  description: '__DEV__ checks that might leak debug code to production',
  category: 'security',
  severity: 'info',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      if (/\.(test|spec)\.[jt]sx?$/.test(file.path)) continue;
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i]!.includes('__DEV__')) {
          findings.push({
            ruleId: this.id, severity: this.severity, category: this.category,
            message: '__DEV__ flag usage detected',
            file: file.path, line: i + 1,
            suggestion: 'Ensure __DEV__ guarded code does not leak sensitive info in production',
          });
        }
      }
    }
    return findings;
  },
};

export default debugFlagsRule;
