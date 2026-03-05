import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

export const safeAreaRule: AuditRule = {
  id: 'safe-area',
  name: 'Safe Area Usage',
  description: 'Screen components should use SafeAreaView',
  category: 'ux',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    // Check if any file imports SafeAreaView/SafeAreaProvider
    const hasSafeArea = context.files.some((f) =>
      f.content.includes('SafeAreaView') || f.content.includes('SafeAreaProvider'),
    );
    if (!hasSafeArea && context.files.length > 0) {
      // Check if project has screen-like components
      const screenFiles = context.files.filter((f) =>
        /screen/i.test(f.path) || /page/i.test(f.path),
      );
      if (screenFiles.length > 0) {
        findings.push({
          ruleId: this.id, severity: this.severity, category: this.category,
          message: 'No SafeAreaView usage detected in screen components',
          suggestion: 'Use SafeAreaView or SafeAreaProvider to handle device notches/safe areas',
        });
      }
    }
    return findings;
  },
};

export default safeAreaRule;
