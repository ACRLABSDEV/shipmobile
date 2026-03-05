import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

export const versionProductionRule: AuditRule = {
  id: 'version-production',
  name: 'Production Version',
  description: 'Version should be >= 1.0.0 for production',
  category: 'compliance',
  severity: 'info',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const version = (context.packageJson.version as string) || '0.0.0';
    const expo = (context.appJson.expo as Record<string, unknown> | undefined) ?? context.appJson;
    const appVersion = (expo?.version as string) || version;

    const major = parseInt(appVersion.split('.')[0] ?? '0', 10);
    if (major < 1) {
      return [{
        ruleId: this.id, severity: this.severity, category: this.category,
        message: `Version ${appVersion} is pre-release (< 1.0.0)`,
        suggestion: 'Update version to 1.0.0+ before submitting to app stores',
      }];
    }
    return [];
  },
};

export default versionProductionRule;
