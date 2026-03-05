import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../src/utils/crypto.js';

describe('crypto', () => {
  it('round-trips simple string', () => {
    const data = 'hello world';
    const encrypted = encrypt(data);
    expect(decrypt(encrypted)).toBe(data);
  });

  it('round-trips JSON data', () => {
    const data = JSON.stringify({ token: 'abc123', nested: { key: 'value' } });
    const encrypted = encrypt(data);
    expect(decrypt(encrypted)).toBe(data);
  });

  it('round-trips empty string', () => {
    const encrypted = encrypt('');
    expect(decrypt(encrypted)).toBe('');
  });

  it('round-trips unicode and special characters', () => {
    const data = '🚀 émojis & spëcial chars <>"\'';
    expect(decrypt(encrypt(data))).toBe(data);
  });

  it('encrypted output differs from input', () => {
    const data = 'sensitive-token-value';
    const encrypted = encrypt(data);
    expect(encrypted).not.toBe(data);
    expect(encrypted).not.toContain(data);
  });

  it('produces iv:authTag:ciphertext format', () => {
    const encrypted = encrypt('test');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Ciphertext is non-empty hex
    expect(parts[2]!.length).toBeGreaterThan(0);
    expect(parts[2]).toMatch(/^[0-9a-f]+$/);
  });

  it('produces different ciphertexts for same input (random IV)', () => {
    const data = 'same input';
    const a = encrypt(data);
    const b = encrypt(data);
    expect(a).not.toBe(b);
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encrypt('test data');
    const parts = encrypted.split(':');
    // Flip a character in ciphertext
    const tampered = parts[2]!.replace(/[0-9a-f]/, (c) => c === '0' ? '1' : '0');
    expect(() => decrypt(`${parts[0]}:${parts[1]}:${tampered}`)).toThrow();
  });

  it('throws on tampered auth tag', () => {
    const encrypted = encrypt('test data');
    const parts = encrypted.split(':');
    const tampered = parts[1]!.replace(/[0-9a-f]/, (c) => c === '0' ? '1' : '0');
    expect(() => decrypt(`${parts[0]}:${tampered}:${parts[2]}`)).toThrow();
  });

  it('throws on invalid format (missing parts)', () => {
    expect(() => decrypt('not-valid')).toThrow('Invalid encrypted data format');
  });
});
