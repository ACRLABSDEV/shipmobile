/**
 * Audit Engine Types — Plugin-based audit rule interface
 */

export interface AuditFinding {
  ruleId: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'performance' | 'memory' | 'ux' | 'compliance' | 'security';
  file?: string;
  line?: number;
  column?: number;
  suggestion?: string;
  autoFixable?: boolean;
}

export interface AuditRule {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'memory' | 'ux' | 'compliance' | 'security';
  severity: 'critical' | 'warning' | 'info';
  check(context: AuditContext): Promise<AuditFinding[]>;
  fix?(context: AuditContext): Promise<number>;
}

export interface AuditContext {
  projectPath: string;
  files: ProjectFile[];
  packageJson: Record<string, unknown>;
  appJson: Record<string, unknown>;
}

export interface ProjectFile {
  path: string;
  absolutePath: string;
  content: string;
  ast?: unknown;
}
