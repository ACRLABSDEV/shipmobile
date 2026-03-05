import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';
import { findJSXElements } from '../../ast.js';
import type { Node } from '@babel/types';

export const flatlistUsageRule: AuditRule = {
  id: 'flatlist-usage',
  name: 'FlatList Usage',
  description: 'ScrollView with large data — should use FlatList/FlashList',
  category: 'memory',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      if (!file.ast) continue;
      const scrollViews = findJSXElements(file.ast as Node, 'ScrollView');
      if (scrollViews.length === 0) continue;
      // Check if file has .map() calls suggesting rendering lists
      const hasMapCall = /\.map\s*\(/.test(file.content);
      if (hasMapCall) {
        for (const sv of scrollViews) {
          findings.push({
            ruleId: this.id, severity: this.severity, category: this.category,
            message: 'ScrollView with .map() — use FlatList or FlashList for large lists',
            file: file.path, line: sv.line,
            suggestion: 'FlatList/FlashList virtualizes rendering for better memory usage',
          });
        }
      }
    }
    return findings;
  },
};

export default flatlistUsageRule;
