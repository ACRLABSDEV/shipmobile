import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';
import { findAssetFiles } from '../../discovery.js';

const ONE_MB = 1024 * 1024;

export const largeImagesRule: AuditRule = {
  id: 'large-images',
  name: 'Large Images',
  description: 'Scan assets for images over 1MB',
  category: 'performance',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const assets = findAssetFiles(context.projectPath);
    const findings: AuditFinding[] = [];
    for (const asset of assets) {
      if (asset.size > ONE_MB) {
        const sizeMB = (asset.size / ONE_MB).toFixed(1);
        findings.push({
          ruleId: this.id, severity: this.severity, category: this.category,
          message: `${asset.path} is ${sizeMB}MB`,
          file: asset.path,
          suggestion: 'Compress or resize image — consider WebP format',
        });
      }
    }
    return findings;
  },
};

export default largeImagesRule;
