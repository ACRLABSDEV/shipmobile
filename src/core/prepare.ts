/**
 * prepare — Metadata generation, privacy policy, validation
 */

import { ok, type Result } from '../utils/result.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Character limits
export const LIMITS = {
  title: 30,
  subtitle: 30,
  shortDescription: 80,
  longDescription: 4000,
  keywords: 100, // total chars, comma-separated
};

// Banned keywords for App Store
export const BANNED_KEYWORDS = [
  'free',
  'best',
  '#1',
  'number one',
  'top',
  'amazing',
  'incredible',
  'revolutionary',
  'game-changing',
  'unbelievable',
  'guaranteed',
];

// Category inference from dependencies
const CATEGORY_MAP: Record<string, string> = {
  'react-native-health': 'Health & Fitness',
  'react-native-healthkit': 'Health & Fitness',
  '@react-native-google-signin/google-signin': 'Social Networking',
  'react-native-maps': 'Navigation',
  '@react-navigation/native': 'Utilities',
  'react-native-camera': 'Photo & Video',
  'expo-camera': 'Photo & Video',
  'react-native-video': 'Entertainment',
  'expo-av': 'Entertainment',
  'react-native-music-control': 'Music',
  '@stripe/stripe-react-native': 'Shopping',
  'react-native-iap': 'Shopping',
  '@react-native-firebase/messaging': 'Social Networking',
  'expo-notifications': 'Utilities',
  'react-native-game-engine': 'Games',
  '@tensorflow/tfjs-react-native': 'Education',
  'react-native-ble-plx': 'Health & Fitness',
  'react-native-pedometer': 'Health & Fitness',
};

// Permissions and their data usage implications
const PERMISSION_DATA_MAP: Record<string, { permission: string; dataUsage: string; description: string }> = {
  'expo-camera': { permission: 'Camera', dataUsage: 'Photos or Videos', description: 'Access to device camera for taking photos or recording video' },
  'expo-image-picker': { permission: 'Photo Library', dataUsage: 'Photos or Videos', description: 'Access to device photo library' },
  'expo-location': { permission: 'Location', dataUsage: 'Precise Location', description: 'Access to device GPS for location tracking' },
  'expo-contacts': { permission: 'Contacts', dataUsage: 'Contacts', description: 'Access to device contact list' },
  'expo-calendar': { permission: 'Calendar', dataUsage: 'Calendar Events', description: 'Access to device calendar' },
  'expo-notifications': { permission: 'Push Notifications', dataUsage: 'Device ID', description: 'Sending push notifications to the device' },
  'expo-media-library': { permission: 'Photo Library', dataUsage: 'Photos or Videos', description: 'Access to device media library' },
  'expo-sensors': { permission: 'Motion & Fitness', dataUsage: 'Health & Fitness', description: 'Access to device motion sensors' },
  'react-native-camera': { permission: 'Camera', dataUsage: 'Photos or Videos', description: 'Access to device camera' },
  '@react-native-community/geolocation': { permission: 'Location', dataUsage: 'Precise Location', description: 'Location tracking' },
  'react-native-permissions': { permission: 'Various', dataUsage: 'Various', description: 'Dynamic permission requests' },
};

export interface MetadataField {
  value: string;
  source: 'auto' | 'user' | 'default';
}

export interface Metadata {
  appName: MetadataField;
  subtitle: MetadataField;
  shortDescription: MetadataField;
  longDescription: MetadataField;
  keywords: MetadataField;
  category: MetadataField;
  ageRating: MetadataField;
}

export interface PrivacyInfo {
  permissions: string[];
  dataUsage: Array<{ type: string; description: string }>;
  policyHtml: string;
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PrepareResult {
  metadata: Metadata;
  privacy: PrivacyInfo;
  validation: ValidationIssue[];
  savedTo: string;
}

export interface PrepareOptions {
  projectPath?: string;
  appName?: string;
  description?: string;
  keywords?: string[];
  category?: string;
  interactive?: boolean;
}

export async function execute(options: PrepareOptions = {}): Promise<Result<PrepareResult>> {
  const projectPath = resolve(options.projectPath || '.');

  // Scan the project
  const scan = scanProject(projectPath);

  // Generate metadata
  const metadata: Metadata = {
    appName: options.appName
      ? { value: options.appName, source: 'user' }
      : { value: scan.appName || 'My App', source: scan.appName ? 'auto' : 'default' },
    subtitle: { value: scan.subtitle || '', source: scan.subtitle ? 'auto' : 'default' },
    shortDescription: options.description
      ? { value: options.description.slice(0, LIMITS.shortDescription), source: 'user' }
      : { value: scan.shortDescription || '', source: scan.shortDescription ? 'auto' : 'default' },
    longDescription: options.description
      ? { value: options.description, source: 'user' }
      : { value: scan.longDescription || '', source: scan.longDescription ? 'auto' : 'default' },
    keywords: options.keywords
      ? { value: options.keywords.join(', '), source: 'user' }
      : { value: scan.keywords.join(', '), source: scan.keywords.length > 0 ? 'auto' : 'default' },
    category: options.category
      ? { value: options.category, source: 'user' }
      : { value: scan.category || 'Utilities', source: scan.category ? 'auto' : 'default' },
    ageRating: { value: scan.ageRating || '4+', source: scan.ageRating ? 'auto' : 'default' },
  };

  // Detect privacy/permissions
  const privacy = detectPrivacy(projectPath, scan.dependencies);

  // Validate
  const validation = validateMetadata(metadata);

  // Save metadata
  const shipmobileDir = join(projectPath, '.shipmobile');
  mkdirSync(shipmobileDir, { recursive: true });
  const metadataPath = join(shipmobileDir, 'metadata.json');
  const metadataJson = {
    appName: metadata.appName.value,
    subtitle: metadata.subtitle.value,
    shortDescription: metadata.shortDescription.value,
    longDescription: metadata.longDescription.value,
    keywords: metadata.keywords.value,
    category: metadata.category.value,
    ageRating: metadata.ageRating.value,
  };
  writeFileSync(metadataPath, JSON.stringify(metadataJson, null, 2));

  // Save privacy policy HTML
  if (privacy.policyHtml) {
    const policyPath = join(projectPath, 'privacy-policy.html');
    writeFileSync(policyPath, privacy.policyHtml);
  }

  return ok({
    metadata,
    privacy,
    validation,
    savedTo: metadataPath,
  });
}

interface ProjectScan {
  appName: string | null;
  subtitle: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  keywords: string[];
  category: string | null;
  ageRating: string | null;
  dependencies: string[];
  readme: string | null;
}

function scanProject(projectPath: string): ProjectScan {
  const scan: ProjectScan = {
    appName: null,
    subtitle: null,
    shortDescription: null,
    longDescription: null,
    keywords: [],
    category: null,
    ageRating: '4+',
    dependencies: [],
    readme: null,
  };

  // Parse package.json
  const pkgPath = join(projectPath, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      scan.dependencies = Object.keys(pkg.dependencies || {});

      // Infer app name
      if (pkg.name) {
        scan.appName = formatAppName(pkg.name);
      }
    } catch {
      // ignore parse errors
    }
  }

  // Parse app.json / app.config.js
  const appJsonPath = join(projectPath, 'app.json');
  if (existsSync(appJsonPath)) {
    try {
      const appJson = JSON.parse(readFileSync(appJsonPath, 'utf-8'));
      const expo = appJson.expo || appJson;
      if (expo.name) scan.appName = expo.name;
      if (expo.description) {
        scan.shortDescription = expo.description.slice(0, LIMITS.shortDescription);
        scan.longDescription = expo.description;
      }
    } catch {
      // ignore
    }
  }

  // Parse README
  const readmePath = findReadme(projectPath);
  if (readmePath) {
    try {
      const readme = readFileSync(readmePath, 'utf-8');
      scan.readme = readme;

      // Extract description from README (first paragraph after title)
      const descMatch = readme.match(/^#\s+.+\n\n(.+?)(?:\n\n|\n#)/s);
      if (descMatch?.[1] && !scan.longDescription) {
        const desc = descMatch[1].replace(/\n/g, ' ').trim();
        scan.longDescription = desc.slice(0, LIMITS.longDescription);
        if (!scan.shortDescription) {
          scan.shortDescription = desc.slice(0, LIMITS.shortDescription);
        }
      }

      // Extract keywords from README
      scan.keywords = extractKeywords(readme, scan.appName || '');
    } catch {
      // ignore
    }
  }

  // Infer subtitle from description
  if (scan.shortDescription && !scan.subtitle) {
    scan.subtitle = scan.shortDescription.slice(0, LIMITS.subtitle);
  }

  // Infer category from dependencies
  scan.category = inferCategory(scan.dependencies);

  return scan;
}

function formatAppName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/@[\w-]+\//g, ''); // strip npm scope
}

function findReadme(projectPath: string): string | null {
  const candidates = ['README.md', 'readme.md', 'Readme.md', 'README.txt', 'README'];
  for (const c of candidates) {
    const full = join(projectPath, c);
    if (existsSync(full)) return full;
  }
  return null;
}

function extractKeywords(readme: string, appName: string): string[] {
  const keywords: Set<string> = new Set();

  // Common mobile app keywords
  const lowerReadme = readme.toLowerCase();
  const kw = [
    'tracker', 'fitness', 'health', 'social', 'photo', 'camera', 'music',
    'video', 'game', 'shopping', 'food', 'recipe', 'travel', 'map',
    'weather', 'news', 'education', 'finance', 'productivity', 'utility',
    'chat', 'messaging', 'calendar', 'notes', 'todo', 'task', 'habit',
    'meditation', 'workout', 'running', 'cycling', 'yoga',
  ];

  for (const k of kw) {
    if (lowerReadme.includes(k)) {
      keywords.add(k);
    }
  }

  if (appName) {
    // Add app name words as keywords
    const nameWords = appName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    for (const w of nameWords) {
      keywords.add(w);
    }
  }

  return Array.from(keywords).slice(0, 10);
}

function inferCategory(dependencies: string[]): string | null {
  const categoryCounts: Record<string, number> = {};
  for (const dep of dependencies) {
    const cat = CATEGORY_MAP[dep];
    if (cat) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  }

  let bestCategory: string | null = null;
  let bestCount = 0;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > bestCount) {
      bestCategory = cat;
      bestCount = count;
    }
  }

  return bestCategory;
}

function detectPrivacy(projectPath: string, dependencies: string[]): PrivacyInfo {
  const permissions: string[] = [];
  const dataUsage: Array<{ type: string; description: string }> = [];

  for (const dep of dependencies) {
    const info = PERMISSION_DATA_MAP[dep];
    if (info) {
      if (!permissions.includes(info.permission)) {
        permissions.push(info.permission);
      }
      dataUsage.push({ type: info.dataUsage, description: info.description });
    }
  }

  const policyHtml = generatePrivacyPolicyHtml(permissions, dataUsage);

  return { permissions, dataUsage, policyHtml };
}

function generatePrivacyPolicyHtml(
  permissions: string[],
  dataUsage: Array<{ type: string; description: string }>,
): string {
  const permissionsList = permissions.length > 0
    ? permissions.map(p => `<li>${p}</li>`).join('\n        ')
    : '<li>No special permissions required</li>';

  const dataList = dataUsage.length > 0
    ? dataUsage.map(d => `<li><strong>${d.type}</strong>: ${d.description}</li>`).join('\n        ')
    : '<li>This app does not collect personal data</li>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        h1 { color: #333; } h2 { color: #555; margin-top: 2rem; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p>Last updated: ${new Date().toISOString().split('T')[0]}</p>

    <h2>Permissions</h2>
    <p>This app may request the following permissions:</p>
    <ul>
        ${permissionsList}
    </ul>

    <h2>Data Collection</h2>
    <ul>
        ${dataList}
    </ul>

    <h2>Data Sharing</h2>
    <p>We do not sell or share your personal data with third parties.</p>

    <h2>Contact</h2>
    <p>If you have questions about this privacy policy, please contact us.</p>
</body>
</html>`;
}

export function validateMetadata(metadata: Metadata): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Title length
  if (metadata.appName.value.length > LIMITS.title) {
    issues.push({
      field: 'appName',
      message: `App name is ${metadata.appName.value.length} chars (max ${LIMITS.title})`,
      severity: 'error',
    });
  }
  if (metadata.appName.value.length === 0) {
    issues.push({ field: 'appName', message: 'App name is required', severity: 'error' });
  }

  // Subtitle length
  if (metadata.subtitle.value.length > LIMITS.subtitle) {
    issues.push({
      field: 'subtitle',
      message: `Subtitle is ${metadata.subtitle.value.length} chars (max ${LIMITS.subtitle})`,
      severity: 'error',
    });
  }

  // Description length
  if (metadata.longDescription.value.length > LIMITS.longDescription) {
    issues.push({
      field: 'longDescription',
      message: `Description is ${metadata.longDescription.value.length} chars (max ${LIMITS.longDescription})`,
      severity: 'error',
    });
  }
  if (metadata.longDescription.value.length === 0) {
    issues.push({ field: 'longDescription', message: 'Description is required', severity: 'error' });
  }

  // Keywords length
  if (metadata.keywords.value.length > LIMITS.keywords) {
    issues.push({
      field: 'keywords',
      message: `Keywords are ${metadata.keywords.value.length} chars (max ${LIMITS.keywords})`,
      severity: 'error',
    });
  }

  // Banned keywords check
  const allText = `${metadata.appName.value} ${metadata.subtitle.value} ${metadata.longDescription.value}`.toLowerCase();
  for (const banned of BANNED_KEYWORDS) {
    if (allText.includes(banned.toLowerCase())) {
      issues.push({
        field: 'general',
        message: `Banned/restricted keyword found: "${banned}"`,
        severity: 'warning',
      });
    }
  }

  // Required fields
  if (metadata.category.value.length === 0) {
    issues.push({ field: 'category', message: 'Category is required', severity: 'error' });
  }

  return issues;
}

// Export for testing
export { scanProject as _scanProject, inferCategory as _inferCategory, extractKeywords as _extractKeywords, formatAppName as _formatAppName, generatePrivacyPolicyHtml as _generatePrivacyPolicyHtml };
