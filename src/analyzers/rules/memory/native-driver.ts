import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

export const nativeDriverRule: AuditRule = {
  id: 'native-driver',
  name: 'Native Animation Driver',
  description: 'Animated calls without useNativeDriver: true',
  category: 'memory',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const animatedPattern = /Animated\.(timing|spring|decay|sequence|parallel)\s*\(/;
    for (const file of context.files) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (animatedPattern.test(lines[i]!)) {
          // Check if useNativeDriver is set in the next ~10 lines
          const block = lines.slice(i, i + 10).join('\n');
          if (!block.includes('useNativeDriver')) {
            findings.push({
              ruleId: this.id, severity: this.severity, category: this.category,
              message: 'Animated call without useNativeDriver: true',
              file: file.path, line: i + 1,
              suggestion: 'Add useNativeDriver: true to run animations on native thread',
              autoFixable: true,
            });
          }
        }
      }
    }
    return findings;
  },
};

export default nativeDriverRule;
