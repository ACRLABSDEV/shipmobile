import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PRIVACY_APIS = ['NSUserDefaults', 'UserDefaults', 'AsyncStorage', 'expo-tracking-transparency', 'requestTrackingPermission'];

export const privacyManifestRule: AuditRule = {
  id: 'privacy-manifest',
  name: 'Privacy Manifest',
  description: 'Check if iOS privacy manifest is needed and present',
  category: 'compliance',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const allCode = context.files.map((f) => f.content).join('\n');
    const needsManifest = PRIVACY_APIS.some((api) => allCode.includes(api));
    if (!needsManifest) return [];

    // Check for privacy manifest file
    const manifestPaths = [
      join(context.projectPath, 'ios', 'PrivacyInfo.xcprivacy'),
      join(context.projectPath, 'PrivacyInfo.xcprivacy'),
    ];
    const hasManifest = manifestPaths.some((p) => existsSync(p));
    if (!hasManifest) {
      return [{
        ruleId: this.id, severity: this.severity, category: this.category,
        message: 'iOS privacy manifest (PrivacyInfo.xcprivacy) not found',
        suggestion: 'Apple requires privacy manifests for apps using certain APIs (as of Spring 2024)',
      }];
    }
    return [];
  },
};

export default privacyManifestRule;
