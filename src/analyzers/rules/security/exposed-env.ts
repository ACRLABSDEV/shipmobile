import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';
import { readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

export const exposedEnvRule: AuditRule = {
  id: 'exposed-env',
  name: 'Exposed Environment Files',
  description: '.env files tracked in git or env vars embedded in source',
  category: 'security',
  severity: 'critical',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Check for .env files
    try {
      const entries = readdirSync(context.projectPath);
      const envFiles = entries.filter((e) => e.startsWith('.env'));
      for (const envFile of envFiles) {
        // Check if tracked by git
        try {
          execSync(`git ls-files --error-unmatch "${envFile}"`, {
            cwd: context.projectPath,
            stdio: 'pipe',
          });
          findings.push({
            ruleId: this.id, severity: this.severity, category: this.category,
            message: `${envFile} is tracked by git`,
            file: envFile,
            suggestion: 'Add .env* to .gitignore and remove from tracking',
          });
        } catch {
          // not tracked — good
        }
      }
    } catch {
      // can't read dir
    }

    // Check for process.env in source with hardcoded values
    for (const file of context.files) {
      const pattern = /process\.env\.\w+\s*(?:\|\||[=!]=)\s*['"][^'"]+['"]/;
      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i]!)) {
          findings.push({
            ruleId: this.id, severity: 'warning', category: this.category,
            message: 'Hardcoded fallback for environment variable',
            file: file.path, line: i + 1,
            suggestion: 'Use a .env file with react-native-dotenv instead of hardcoded fallbacks',
          });
        }
      }
    }

    return findings;
  },
};

export default exposedEnvRule;
