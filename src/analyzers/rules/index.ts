/**
 * All audit rules — central registry
 */

import type { AuditRule } from '../types.js';

import { bundleSizeRule, heavyDepsRule, unusedImportsRule, largeImagesRule, hermesCheckRule } from './performance/index.js';
import { useEffectCleanupRule, unclearedTimersRule, eventListenerLeakRule, flatlistUsageRule, nativeDriverRule } from './memory/index.js';
import { touchTargetSizeRule, fontSizeMinimumRule, safeAreaRule, keyboardAvoidanceRule, darkModeRule, accessibilityLabelsRule } from './ux/index.js';
import { noConsoleLogRule, hardcodedSecretsRule, unusedPermissionsRule, missingPermissionsRule, privacyManifestRule, versionProductionRule } from './compliance/index.js';
import { hardcodedUrlsRule, debugFlagsRule, exposedEnvRule } from './security/index.js';

export const allRules: AuditRule[] = [
  // Performance (5)
  bundleSizeRule,
  heavyDepsRule,
  unusedImportsRule,
  largeImagesRule,
  hermesCheckRule,
  // Memory (5)
  useEffectCleanupRule,
  unclearedTimersRule,
  eventListenerLeakRule,
  flatlistUsageRule,
  nativeDriverRule,
  // UX (6)
  touchTargetSizeRule,
  fontSizeMinimumRule,
  safeAreaRule,
  keyboardAvoidanceRule,
  darkModeRule,
  accessibilityLabelsRule,
  // Compliance (6)
  noConsoleLogRule,
  hardcodedSecretsRule,
  unusedPermissionsRule,
  missingPermissionsRule,
  privacyManifestRule,
  versionProductionRule,
  // Security (3)
  hardcodedUrlsRule,
  debugFlagsRule,
  exposedEnvRule,
];

export function getRulesByCategory(category: string): AuditRule[] {
  return allRules.filter((r) => r.category === category);
}

export function getRuleById(id: string): AuditRule | undefined {
  return allRules.find((r) => r.id === id);
}
