/**
 * Result<T> — Typed error handling for ShipMobile
 */

export type Result<T> = { ok: true; data: T } | { ok: false; error: ShipMobileError };

export class ShipMobileError extends Error {
  constructor(
    public code: string,
    message: string,
    public severity: 'critical' | 'warning' | 'info' = 'critical',
    public suggestion?: string,
  ) {
    super(message);
    this.name = 'ShipMobileError';
  }
}

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T>(
  code: string,
  message: string,
  severity: 'critical' | 'warning' | 'info' = 'critical',
  suggestion?: string,
): Result<T> {
  return { ok: false, error: new ShipMobileError(code, message, severity, suggestion) };
}
