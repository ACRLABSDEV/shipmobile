import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

const MIN_SIZE = 44;
const TOUCHABLE_NAMES = ['TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'Pressable', 'TouchableNativeFeedback'];

export const touchTargetSizeRule: AuditRule = {
  id: 'touch-target-size',
  name: 'Touch Target Size',
  description: 'Interactive elements with dimensions < 44px',
  category: 'ux',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const sizePattern = /(?:width|height)\s*:\s*(\d+)/g;
    for (const file of context.files) {
      const hasTouchable = TOUCHABLE_NAMES.some((n) => file.content.includes(n));
      if (!hasTouchable) continue;
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let match;
        sizePattern.lastIndex = 0;
        while ((match = sizePattern.exec(lines[i]!)) !== null) {
          const size = parseInt(match[1]!, 10);
          if (size > 0 && size < MIN_SIZE) {
            // Check if near a touchable component (within 5 lines)
            const context5 = lines.slice(Math.max(0, i - 5), i + 5).join('\n');
            if (TOUCHABLE_NAMES.some((n) => context5.includes(n))) {
              findings.push({
                ruleId: this.id, severity: this.severity, category: this.category,
                message: `Touch target ${match[0]} is below ${MIN_SIZE}px minimum`,
                file: file.path, line: i + 1,
                suggestion: `Increase to at least ${MIN_SIZE}px for accessibility (Apple HIG)`,
              });
            }
          }
        }
      }
    }
    return findings;
  },
};

export default touchTargetSizeRule;
