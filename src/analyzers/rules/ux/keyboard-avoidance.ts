import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

export const keyboardAvoidanceRule: AuditRule = {
  id: 'keyboard-avoidance',
  name: 'Keyboard Avoidance',
  description: 'Screens with TextInput should use KeyboardAvoidingView',
  category: 'ux',
  severity: 'info',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      if (!file.content.includes('TextInput')) continue;
      if (!file.content.includes('KeyboardAvoidingView') && !file.content.includes('KeyboardAwareScrollView')) {
        findings.push({
          ruleId: this.id, severity: this.severity, category: this.category,
          message: 'TextInput without KeyboardAvoidingView',
          file: file.path,
          suggestion: 'Wrap form content in KeyboardAvoidingView to prevent keyboard overlap',
        });
      }
    }
    return findings;
  },
};

export default keyboardAvoidanceRule;
