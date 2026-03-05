import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

export const hermesCheckRule: AuditRule = {
  id: 'hermes-check',
  name: 'Hermes Engine',
  description: 'Verify Hermes engine is enabled for better performance',
  category: 'performance',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const expo = (context.appJson.expo as Record<string, unknown> | undefined) ?? context.appJson;
    const jsEngine = expo?.jsEngine;
    if (jsEngine !== 'hermes') {
      return [{
        ruleId: this.id, severity: this.severity, category: this.category,
        message: 'Hermes engine is not enabled',
        suggestion: 'Add "jsEngine": "hermes" to app.json for 40-60% faster startup',
        autoFixable: true,
      }];
    }
    return [];
  },
};

export default hermesCheckRule;
