import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

const HTTP_URL_PATTERN = /['"`]http:\/\/[^'"`\s]+['"`]/g;
const ALLOWED_HOSTS = ['localhost', '127.0.0.1', '10.0.2.2', '0.0.0.0'];

export const hardcodedUrlsRule: AuditRule = {
  id: 'hardcoded-urls',
  name: 'Hardcoded HTTP URLs',
  description: 'HTTP (non-HTTPS) URLs in source code',
  category: 'security',
  severity: 'warning',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    for (const file of context.files) {
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const matches = lines[i]!.match(HTTP_URL_PATTERN);
        if (!matches) continue;
        for (const match of matches) {
          const isAllowed = ALLOWED_HOSTS.some((h) => match.includes(`http://${h}`));
          if (!isAllowed) {
            findings.push({
              ruleId: this.id, severity: this.severity, category: this.category,
              message: `Non-HTTPS URL: ${match.slice(0, 60)}`,
              file: file.path, line: i + 1,
              suggestion: 'Use HTTPS for all network requests (iOS ATS requirement)',
            });
          }
        }
      }
    }
    return findings;
  },
};

export default hardcodedUrlsRule;
