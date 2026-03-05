import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

const PERMISSION_TO_API: Record<string, string[]> = {
  CAMERA: ['Camera', 'launchCamera', 'expo-camera', 'CameraView'],
  LOCATION: ['getCurrentPosition', 'watchPosition', 'expo-location', 'Geolocation'],
  CONTACTS: ['Contacts', 'expo-contacts'],
  CALENDAR: ['Calendar', 'expo-calendar'],
  MICROPHONE: ['Audio', 'expo-av', 'microphone'],
  NOTIFICATIONS: ['Notifications', 'expo-notifications', 'PushNotification'],
  PHOTO_LIBRARY: ['MediaLibrary', 'expo-media-library', 'launchImageLibrary', 'CameraRoll'],
};

export const unusedPermissionsRule: AuditRule = {
  id: 'unused-permissions',
  name: 'Unused Permissions',
  description: 'Permissions declared but not used in code',
  category: 'compliance',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const expo = (context.appJson.expo as Record<string, unknown> | undefined) ?? context.appJson;
    const plugins = (expo?.plugins ?? []) as (string | [string, unknown])[];
    const pluginNames = plugins.map((p) => (Array.isArray(p) ? p[0] : p));

    const allCode = context.files.map((f) => f.content).join('\n');

    for (const [perm, apis] of Object.entries(PERMISSION_TO_API)) {
      const declared = pluginNames.some((p) => p.toLowerCase().includes(perm.toLowerCase()));
      if (!declared) continue;
      const used = apis.some((api) => allCode.includes(api));
      if (!used) {
        findings.push({
          ruleId: this.id, severity: this.severity, category: this.category,
          message: `Permission ${perm} declared but not used in code`,
          suggestion: 'Remove unused permissions to improve privacy compliance',
        });
      }
    }
    return findings;
  },
};

export default unusedPermissionsRule;
