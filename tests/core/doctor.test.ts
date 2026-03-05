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
});
