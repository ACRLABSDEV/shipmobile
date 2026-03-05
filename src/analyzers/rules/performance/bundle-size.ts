import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

// Rough size estimates for common RN packages (KB)
const PACKAGE_SIZES: Record<string, number> = {
  'react-native': 2000, react: 200, 'react-dom': 1000, expo: 500,
  'moment': 320, 'lodash': 530, 'axios': 50, '@react-navigation/native': 150,
  '@react-navigation/stack': 120, 'react-native-reanimated': 800,
  'react-native-gesture-handler': 200, 'react-native-screens': 100,
  'react-native-svg': 300, 'react-native-maps': 500,
  'firebase': 1000, '@firebase/app': 200, 'aws-amplify': 800,
  'native-base': 600, 'react-native-paper': 400, 'react-native-elements': 350,
};

const THRESHOLD_KB = 30 * 1024; // 30MB

export const bundleSizeRule: AuditRule = {
  id: 'bundle-size',
  name: 'Bundle Size Estimate',
  description: 'Estimate bundle size from package.json dependencies',
  category: 'performance',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const deps = {
      ...(context.packageJson.dependencies as Record<string, string> | undefined),
    };
    let totalKB = 500; // base app size
    for (const pkg of Object.keys(deps)) {
      totalKB += PACKAGE_SIZES[pkg] ?? 30; // default 30KB for unknown
    }
    if (totalKB > THRESHOLD_KB) {
      return [{
        ruleId: this.id, severity: this.severity, category: this.category,
        message: `Estimated bundle size: ~${Math.round(totalKB / 1024)}MB (recommended <30MB)`,
        suggestion: 'Remove unused dependencies, use tree-shaking, and consider lighter alternatives',
      }];
    }
    return [];
  },
};

export default bundleSizeRule;
