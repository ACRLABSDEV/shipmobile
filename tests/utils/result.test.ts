import { describe, it, expect } from 'vitest';
import { ok, err, ShipMobileError } from '../../src/utils/result.js';

describe('Result<T>', () => {
  it('ok() returns success result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });

  it('err() returns error result', () => {
    const result = err('TEST_ERROR', 'something broke');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('TEST_ERROR');
      expect(result.error.message).toBe('something broke');
      expect(result.error.severity).toBe('critical');
    }
  });

  it('err() supports severity and suggestion', () => {
    const result = err('WARN', 'heads up', 'warning', 'try this instead');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.severity).toBe('warning');
      expect(result.error.suggestion).toBe('try this instead');
    }
  });

  it('ShipMobileError is an Error', () => {
    const e = new ShipMobileError('CODE', 'msg');
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ShipMobileError');
  });
});
