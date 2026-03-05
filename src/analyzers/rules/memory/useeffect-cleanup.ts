import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';
import { findCallExpressions } from '../../ast.js';
import type { Node } from '@babel/types';

const SUBSCRIPTION_PATTERNS = ['addEventListener', 'subscribe', 'setInterval', 'setTimeout', 'on('];

export const useEffectCleanupRule: AuditRule = {
  id: 'useeffect-cleanup',
  name: 'useEffect Cleanup',
  description: 'useEffect with subscriptions but no cleanup return',
  category: 'memory',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      if (!file.ast) continue;
      const effects = findCallExpressions(file.ast as Node, 'useEffect');
      for (const effect of effects) {
        const arg = effect.node.arguments[0];
        if (!arg || (arg.type !== 'ArrowFunctionExpression' && arg.type !== 'FunctionExpression')) continue;

        const body = arg.body;
        if (body.type !== 'BlockStatement') continue;

        // Check if callback body contains subscription patterns
        const bodyText = file.content.split('\n').slice(
          (arg.loc?.start.line ?? 1) - 1,
          (arg.loc?.end.line ?? 1),
        ).join('\n');

        const hasSubscription = SUBSCRIPTION_PATTERNS.some((p) => bodyText.includes(p));
        if (!hasSubscription) continue;

        // Check if there's a return statement (cleanup)
        const hasCleanup = body.body.some((stmt) => stmt.type === 'ReturnStatement');
        if (!hasCleanup) {
          findings.push({
            ruleId: this.id, severity: this.severity, category: this.category,
            message: 'useEffect with subscription/timer but no cleanup function',
            file: file.path, line: effect.line,
            suggestion: 'Return a cleanup function to unsubscribe/clear timers',
          });
        }
      }
    }
    return findings;
  },
};

export default useEffectCleanupRule;
