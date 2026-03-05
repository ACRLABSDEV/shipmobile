import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';
import { findJSXElements } from '../../ast.js';
import type { Node } from '@babel/types';

const INTERACTIVE_ELEMENTS = ['TouchableOpacity', 'TouchableHighlight', 'Pressable', 'Button', 'TouchableWithoutFeedback'];

export const accessibilityLabelsRule: AuditRule = {
  id: 'accessibility-labels',
  name: 'Accessibility Labels',
  description: 'Interactive elements without accessibilityLabel',
  category: 'ux',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      if (!file.ast) continue;
      for (const name of INTERACTIVE_ELEMENTS) {
        if (!file.content.includes(name)) continue;
        const elements = findJSXElements(file.ast as Node, name);
        for (const el of elements) {
          const hasLabel = el.node.attributes.some((attr) =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            (attr.name.name === 'accessibilityLabel' || attr.name.name === 'accessible' || attr.name.name === 'aria-label'),
          );
          if (!hasLabel) {
            findings.push({
              ruleId: this.id, severity: this.severity, category: this.category,
              message: `${name} without accessibilityLabel`,
              file: file.path, line: el.line,
              suggestion: 'Add accessibilityLabel for screen reader support',
            });
          }
        }
      }
    }
    return findings;
  },
};

export default accessibilityLabelsRule;
