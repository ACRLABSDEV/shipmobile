import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { execute, calculateScore } from '../../src/core/audit/index.js';
import { buildAuditContext } from '../../src/analyzers/discovery.js';
import { allRules, getRulesByCategory, getRuleById } from '../../src/analyzers/rules/index.js';
import { parseToAST, findImports, findComponents, findCallExpressions } from '../../src/analyzers/ast.js';
import type { AuditFinding } from '../../src/analyzers/types.js';

const FIXTURE_PATH = join(__dirname, '..', 'fixtures', 'audit-project');

describe('Audit Engine', () => {
  it('should have 25+ rules registered', () => {
    expect(allRules.length).toBeGreaterThanOrEqual(25);
  });

  it('should filter rules by category', () => {
    const perf = getRulesByCategory('performance');
    expect(perf.length).toBe(5);
    const mem = getRulesByCategory('memory');
    expect(mem.length).toBe(5);
    const ux = getRulesByCategory('ux');
    expect(ux.length).toBe(6);
    const compliance = getRulesByCategory('compliance');
    expect(compliance.length).toBe(6);
    const security = getRulesByCategory('security');
    expect(security.length).toBe(3);
  });

  it('should find rules by id', () => {
    const rule = getRuleById('no-console-log');
    expect(rule).toBeDefined();
    expect(rule!.category).toBe('compliance');
  });

  it('should calculate score correctly', () => {
    expect(calculateScore([])).toBe(100);
    expect(calculateScore([
      { ruleId: 'a', message: '', severity: 'critical', category: 'compliance' },
    ])).toBe(90);
    expect(calculateScore([
      { ruleId: 'a', message: '', severity: 'warning', category: 'compliance' },
    ])).toBe(97);
    expect(calculateScore([
      { ruleId: 'a', message: '', severity: 'info', category: 'compliance' },
    ])).toBe(99);
    // Score doesn't go below 0
    const manyFindings: AuditFinding[] = Array.from({ length: 20 }, (_, i) => ({
      ruleId: `r${i}`, message: '', severity: 'critical' as const, category: 'compliance' as const,
    }));
    expect(calculateScore(manyFindings)).toBe(0);
  });

  it('should discover files from fixture project', () => {
    const ctx = buildAuditContext(FIXTURE_PATH);
    expect(ctx.files.length).toBeGreaterThan(0);
    expect(ctx.packageJson.name).toBe('test-app');
  });

  it('should run full audit on fixture and find issues', async () => {
    const result = await execute({ projectPath: FIXTURE_PATH });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data;
    expect(data.score).toBeLessThan(100);
    expect(data.critical.length).toBeGreaterThan(0);
    expect(data.warnings.length).toBeGreaterThan(0);
    expect(data.metrics.totalFiles).toBeGreaterThan(0);
    expect(data.metrics.rulesRun).toBe(allRules.length);
  });

  it('should filter by category', async () => {
    const result = await execute({ projectPath: FIXTURE_PATH, category: 'performance' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cats = new Set(result.data.findings.map((f) => f.category));
    expect(cats.size).toBeLessThanOrEqual(1);
    if (cats.size > 0) expect(cats.has('performance')).toBe(true);
  });

  it('should detect console.log statements', async () => {
    const ctx = buildAuditContext(FIXTURE_PATH);
    const rule = getRuleById('no-console-log')!;
    const findings = await rule.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.file?.includes('HomeScreen'))).toBe(true);
  });

  it('should detect heavy dependencies', async () => {
    const ctx = buildAuditContext(FIXTURE_PATH);
    const rule = getRuleById('heavy-deps')!;
    const findings = await rule.check(ctx);
    expect(findings.length).toBeGreaterThanOrEqual(3); // moment, lodash, axios
  });

  it('should detect hermes not enabled', async () => {
    const ctx = buildAuditContext(FIXTURE_PATH);
    const rule = getRuleById('hermes-check')!;
    const findings = await rule.check(ctx);
    expect(findings.length).toBe(1);
  });

  it('should detect HTTP URLs', async () => {
    const ctx = buildAuditContext(FIXTURE_PATH);
    const rule = getRuleById('hardcoded-urls')!;
    const findings = await rule.check(ctx);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should detect version < 1.0.0', async () => {
    const ctx = buildAuditContext(FIXTURE_PATH);
    const rule = getRuleById('version-production')!;
    const findings = await rule.check(ctx);
    expect(findings.length).toBe(1);
  });

  it('should auto-fix console.log with --fix', async () => {
    // Create a temp copy for fix testing
    const tmpDir = join(FIXTURE_PATH, '..', 'audit-fix-test');
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'package.json'), '{"name":"fix-test","version":"1.0.0"}');
    writeFileSync(join(tmpDir, 'app.json'), '{"expo":{"jsEngine":"hermes"}}');
    writeFileSync(join(tmpDir, 'src', 'test.ts'), 'const x = 1;\nconsole.log("hello");\nconst y = 2;\n');

    const result = await execute({ projectPath: tmpDir, fix: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const content = readFileSync(join(tmpDir, 'src', 'test.ts'), 'utf-8');
    expect(content).not.toContain('console.log');
    expect(content).toContain('const x = 1');

    expect(result.data._fixedCount).toBeGreaterThan(0);
    expect(result.data._fixReport?.length).toBeGreaterThan(0);
    expect(result.data._fixReport?.some((r) => r.ruleId === 'no-console-log')).toBe(true);

    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should only count currently-implementable auto-fixes', async () => {
    const result = await execute({ projectPath: FIXTURE_PATH });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const declaredAutoFixable = result.data.findings.filter((f) => f.autoFixable).length;
    const implementableAutoFixable = result.data._fixableCount ?? 0;

    expect(declaredAutoFixable).toBeGreaterThan(0);
    expect(implementableAutoFixable).toBeGreaterThanOrEqual(0);
    expect(implementableAutoFixable).toBeLessThanOrEqual(declaredAutoFixable);
  });
});

describe('AST Utilities', () => {
  it('should parse TypeScript JSX', () => {
    const ast = parseToAST(`
      import React from 'react';
      const App: React.FC = () => <View />;
      export default App;
    `);
    expect(ast).not.toBeNull();
  });

  it('should find imports', () => {
    const ast = parseToAST(`
      import React from 'react';
      import { View, Text } from 'react-native';
    `);
    const imports = findImports(ast!);
    expect(imports.length).toBe(2);
    expect(imports[0]!.source).toBe('react');
    expect(imports[1]!.specifiers.length).toBe(2);
  });

  it('should find components', () => {
    const ast = parseToAST(`
      function MyComponent() { return null; }
      const AnotherComponent = () => null;
      function helperFunc() {} // not a component
    `);
    const components = findComponents(ast!);
    expect(components.length).toBe(2);
  });

  it('should find call expressions', () => {
    const ast = parseToAST(`
      useEffect(() => {}, []);
      console.log('test');
    `);
    const effects = findCallExpressions(ast!, 'useEffect');
    expect(effects.length).toBe(1);
    const logs = findCallExpressions(ast!, 'console.log');
    expect(logs.length).toBe(1);
  });
});
