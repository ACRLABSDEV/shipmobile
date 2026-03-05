import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';
import { findImports } from '../../ast.js';
import type { Node } from '@babel/types';

export const unusedImportsRule: AuditRule = {
  id: 'unused-imports',
  name: 'Unused Imports',
  description: 'Imported symbols not referenced in the file',
  category: 'performance',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      if (!file.ast) continue;
      const imports = findImports(file.ast as Node);
      for (const imp of imports) {
        for (const spec of imp.specifiers) {
          if (spec.type === 'namespace') continue; // skip * imports
          // Simple check: count occurrences of the local name in file content (excluding the import line)
          const lines = file.content.split('\n');
          const importLine = imp.node.loc?.start.line ?? 0;
          let usageCount = 0;
          for (let i = 0; i < lines.length; i++) {
            if (i + 1 === importLine) continue;
            // Word-boundary match
            const regex = new RegExp(`\\b${spec.local}\\b`);
            if (regex.test(lines[i]!)) {
              usageCount++;
              break;
            }
          }
          if (usageCount === 0) {
            findings.push({
              ruleId: this.id, severity: this.severity, category: this.category,
              message: `Unused import '${spec.local}' from '${imp.source}'`,
              file: file.path, line: importLine,
              suggestion: `Remove unused import of '${spec.local}'`,
              autoFixable: true,
            });
          }
        }
      }
    }
    return findings;
  },
};

export default unusedImportsRule;
