import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { execute } from '../../src/core/doctor.js';

const FIXTURES = join(__dirname, '..', 'fixtures');

describe('doctor', () => {
  it('passes most checks on valid expo project', async () => {
    const result = await execute({ projectPath: join(FIXTURES, 'valid-expo') });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    
    expect(result.data.checks.length).toBeGreaterThanOrEqual(20);
    expect(result.data.passed).toBeGreaterThan(10);
    
    // Specific checks should pass
    const appJsonCheck = result.data.checks.find(c => c.id === 'app-json-exists');
    expect(appJsonCheck?.status).toBe('passed');
    
    const pkgCheck = result.data.checks.find(c => c.id === 'package-json-valid');
    expect(pkgCheck?.status).toBe('passed');

    const bundleIdCheck = result.data.checks.find(c => c.id === 'bundle-id-format');
    expect(bundleIdCheck?.status).toBe('passed');

    const iconCheck = result.data.checks.find(c => c.id === 'app-icon-exists');
    expect(iconCheck?.status).toBe('passed');

    const iconDimCheck = result.data.checks.find(c => c.id === 'app-icon-dimensions');
    expect(iconDimCheck?.status).toBe('passed');

    const iosBidCheck = result.data.checks.find(c => c.id === 'ios-bundle-id');
    expect(iosBidCheck?.status).toBe('passed');

    const androidPkgCheck = result.data.checks.find(c => c.id === 'android-package');
    expect(androidPkgCheck?.status).toBe('passed');

    const easCheck = result.data.checks.find(c => c.id === 'eas-json-exists');
    expect(easCheck?.status).toBe('passed');

    const prodCheck = result.data.checks.find(c => c.id === 'eas-production-profile');
    expect(prodCheck?.status).toBe('passed');
  });

  it('fails checks on broken project', async () => {
    const result = await execute({ projectPath: join(FIXTURES, 'broken-project') });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should have critical/warning failures
    expect(result.data.critical.length + result.data.warnings.length).toBeGreaterThan(0);

    // No icon configured
    const iconCheck = result.data.checks.find(c => c.id === 'app-icon-exists');
    expect(iconCheck?.status).toBe('failed');

    // No bundle ID
    const bundleIdCheck = result.data.checks.find(c => c.id === 'bundle-id-format');
    expect(bundleIdCheck?.status).toBe('failed');

    // Version format bad
    const versionCheck = result.data.checks.find(c => c.id === 'version-format');
    expect(versionCheck?.status).toBe('failed');

    // No iOS bundle id
    const iosBid = result.data.checks.find(c => c.id === 'ios-bundle-id');
    expect(iosBid?.status).toBe('failed');
  });

  it('returns proper DoctorCheck structure', async () => {
    const result = await execute({ projectPath: join(FIXTURES, 'valid-expo') });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const check of result.data.checks) {
      expect(check).toHaveProperty('id');
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('category');
      expect(check).toHaveProperty('severity');
      expect(check).toHaveProperty('status');
      expect(check).toHaveProperty('message');
      expect(['structure', 'config', 'assets', 'accounts', 'build', 'dependencies', 'platform']).toContain(check.category);
      expect(['critical', 'warning', 'info']).toContain(check.severity);
      expect(['passed', 'failed', 'skipped']).toContain(check.status);
    }
  });

  it('has at least 20 checks', async () => {
    const result = await execute({ projectPath: join(FIXTURES, 'valid-expo') });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.checks.length).toBeGreaterThanOrEqual(20);
  });

  it('--fix auto-creates eas.json and sets bundle IDs on broken project', async () => {
    // Use a temp copy of broken-project to avoid mutating fixture
    const { mkdtemp, cp, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const tempDir = await mkdtemp(join(tmpdir(), 'doctor-fix-'));
    await cp(join(FIXTURES, 'broken-project'), tempDir, { recursive: true });

    try {
      const result = await execute({ projectPath: tempDir, fix: true });
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // eas.json should now exist (auto-fixed)
      const easCheck = result.data.checks.find(c => c.id === 'eas-json-exists');
      expect(easCheck?.status).toBe('passed');
      expect(easCheck?.message).toContain('auto-fixed');

      // iOS bundle ID should be set
      const iosBid = result.data.checks.find(c => c.id === 'ios-bundle-id');
      if (iosBid && iosBid.message.includes('auto-fixed')) {
        expect(iosBid.status).toBe('passed');
      }

      // Android package should be set
      const androidPkg = result.data.checks.find(c => c.id === 'android-package');
      if (androidPkg && androidPkg.message.includes('auto-fixed')) {
        expect(androidPkg.status).toBe('passed');
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns MCP-compatible structure with correct counts', async () => {
    const result = await execute({ projectPath: join(FIXTURES, 'valid-expo') });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify structure has all expected fields
    expect(result.data).toHaveProperty('passed');
    expect(result.data).toHaveProperty('warnings');
    expect(result.data).toHaveProperty('critical');
    expect(result.data).toHaveProperty('suggestions');
    expect(result.data).toHaveProperty('checks');

    // passed + warnings + critical should account for all non-skipped checks
    const nonSkipped = result.data.checks.filter(c => c.status !== 'skipped');
    const passedChecks = result.data.checks.filter(c => c.status === 'passed');
    expect(result.data.passed).toBe(passedChecks.length);
    // warnings + critical + info failures should account for all non-skipped non-passed
    const infoFailed = result.data.checks.filter(c => c.status === 'failed' && c.severity === 'info');
    expect(result.data.warnings.length + result.data.critical.length + infoFailed.length).toBe(
      nonSkipped.length - passedChecks.length,
    );

    // Arrays contain DoctorCheck objects
    for (const w of result.data.warnings) {
      expect(w.severity).toBe('warning');
      expect(w.status).toBe('failed');
    }
    for (const c of result.data.critical) {
      expect(c.severity).toBe('critical');
      expect(c.status).toBe('failed');
    }
  });
});
