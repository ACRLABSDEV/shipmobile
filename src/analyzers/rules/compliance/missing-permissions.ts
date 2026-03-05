import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

const API_TO_PERMISSION: Record<string, { apis: string[]; permission: string }> = {
  camera: { apis: ['expo-camera', 'CameraView', 'launchCamera'], permission: 'Camera' },
  location: { apis: ['expo-location', 'getCurrentPosition', 'watchPosition'], permission: 'Location' },
  notifications: { apis: ['expo-notifications', 'PushNotification', 'registerForPushNotifications'], permission: 'Notifications' },
  contacts: { apis: ['expo-contacts', 'Contacts.getContactsAsync'], permission: 'Contacts' },
  mediaLibrary: { apis: ['expo-media-library', 'MediaLibrary', 'launchImageLibrary'], permission: 'Photo Library' },
};

export const missingPermissionsRule: AuditRule = {
  id: 'missing-permissions',
  name: 'Missing Permissions',
  description: 'Permission APIs used in code but not declared in config',
  category: 'compliance',
  severity: 'critical',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const allCode = context.files.map((f) => f.content).join('\n');
    const expo = (context.appJson.expo as Record<string, unknown> | undefined) ?? context.appJson;
    const configStr = JSON.stringify(expo);

    for (const [, check] of Object.entries(API_TO_PERMISSION)) {
      const used = check.apis.some((api) => allCode.includes(api));
      if (!used) continue;
      const declared = configStr.toLowerCase().includes(check.permission.toLowerCase());
      if (!declared) {
        findings.push({
          ruleId: this.id, severity: this.severity, category: this.category,
          message: `${check.permission} API used but permission not declared in app config`,
          suggestion: `Add ${check.permission} permission to app.json/app.config.js`,
        });
      }
    }
    return findings;
  },
};

export default missingPermissionsRule;
