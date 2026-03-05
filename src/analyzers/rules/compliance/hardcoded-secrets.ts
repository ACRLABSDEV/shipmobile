import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

const SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/ },
  { name: 'Generic Secret', pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/ },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
  { name: 'Bearer Token', pattern: /(?:bearer|token)\s*[:=]\s*['"][a-zA-Z0-9\-._~+/]{20,}['"]/ },
  { name: 'Firebase Config', pattern: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Slack Token', pattern: /xox[bpors]-[0-9a-zA-Z-]+/ },
  { name: 'GitHub Token', pattern: /gh[pous]_[A-Za-z0-9_]{36,}/ },
];

export const hardcodedSecretsRule: AuditRule = {
  id: 'hardcoded-secrets',
  name: 'Hardcoded Secrets',
  description: 'Regex patterns matching API keys, tokens, and passwords',
  category: 'compliance',
  severity: 'critical',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      // Skip test files and config files
      if (/\.(test|spec|mock)\.[jt]sx?$/.test(file.path)) continue;
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const sp of SECRET_PATTERNS) {
          if (sp.pattern.test(lines[i]!)) {
            // Skip comments
            const trimmed = lines[i]!.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
            findings.push({
              ruleId: this.id, severity: this.severity, category: this.category,
              message: `Possible ${sp.name} found`,
              file: file.path, line: i + 1,
              suggestion: 'Move secrets to environment variables or a secrets manager',
            });
            break; // one finding per line
          }
        }
      }
    }
    return findings;
  },
};

export default hardcodedSecretsRule;
