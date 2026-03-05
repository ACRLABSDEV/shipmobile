import type { AuditRule, AuditContext, AuditFinding } from '../../types.js';

export const darkModeRule: AuditRule = {
  id: 'dark-mode',
  name: 'Dark Mode Support',
  description: 'No dark mode theme configuration detected',
  category: 'ux',
  severity: 'info',
  async check(context: AuditContext): Promise<AuditFinding[]> {
    const hasDarkMode = context.files.some((f) =>
      f.content.includes('useColorScheme') ||
      f.content.includes('dark') && f.content.includes('theme') ||
      f.content.includes('DarkTheme') ||
      f.content.includes('darkMode'),
    );
    if (!hasDarkMode && context.files.length > 0) {
      return [{
        ruleId: this.id, severity: this.severity, category: this.category,
        message: 'No dark mode support detected',
        suggestion: 'Implement dark mode using useColorScheme or a theme system',
      }];
    }
    return [];
  },
};

export default darkModeRule;
