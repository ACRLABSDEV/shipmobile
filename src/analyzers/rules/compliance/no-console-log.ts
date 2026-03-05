import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';
import { writeFileSync } from 'node:fs';

const CONSOLE_PATTERN = /\bconsole\.(log|warn|error|debug|info|trace)\s*\(/;

export const noConsoleLogRule: AuditRule = {
  id: 'no-console-log',
  name: 'No Console Log',
  description: 'console.log/warn/error/debug statements in source files',
  category: 'compliance',
  severity: 'critical',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (CONSOLE_PATTERN.test(lines[i]!)) {
          findings.push({
            ruleId: this.id, severity: this.severity, category: this.category,
            message: `console statement found`,
            file: file.path, line: i + 1,
            suggestion: 'Remove console statements before production',
            autoFixable: true,
          });
        }
      }
    }
    return findings;
  },
  async fix(context: AuditContext): Promise<number> {
    let fixed = 0;
    for (const file of context.files) {
      const lines = file.content.split('\n');
      let changed = false;
      const newLines = lines.filter((line) => {
        if (CONSOLE_PATTERN.test(line)) {
          // Only remove if it's the entire statement (simple case)
          const trimmed = line.trim();
          if (trimmed.startsWith('console.') && (trimmed.endsWith(');') || trimmed.endsWith(')'))) {
            fixed++;
            changed = true;
            return false;
          }
        }
        return true;
      });
      if (changed) {
        writeFileSync(file.absolutePath, newLines.join('\n'));
      }
    }
    return fixed;
  },
};

export default noConsoleLogRule;
