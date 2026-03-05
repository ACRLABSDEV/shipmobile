import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

const MIN_FONT = 11;

export const fontSizeMinimumRule: AuditRule = {
  id: 'font-size-minimum',
  name: 'Font Size Minimum',
  description: 'Font sizes below 11px are hard to read',
  category: 'ux',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const pattern = /fontSize\s*:\s*(\d+)/g;
    for (const file of context.files) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(lines[i]!)) !== null) {
          const size = parseInt(match[1]!, 10);
          if (size > 0 && size < MIN_FONT) {
            findings.push({
              ruleId: this.id, severity: this.severity, category: this.category,
              message: `fontSize: ${size} is below minimum ${MIN_FONT}`,
              file: file.path, line: i + 1,
              suggestion: `Increase fontSize to at least ${MIN_FONT} for readability`,
            });
          }
        }
      }
    }
    return findings;
  },
};

export default fontSizeMinimumRule;
