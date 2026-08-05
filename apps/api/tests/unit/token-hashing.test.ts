import { describe, expect, it } from 'vitest';
import { generateOpaqueSecret, generatePublicReference, hashSecret, publicKeyPrefix } from '../../src/utils/crypto.js';

describe('hashSecret', () => {
  it('is deterministic for the same secret and pepper', () => {
    const secret = 'my-secret-token';
    const pepper = 'pepper-value';
    expect(hashSecret(secret, pepper)).toBe(hashSecret(secret, pepper));
  });

  it('produces a different hash for a different pepper (server secret)', () => {
    const secret = 'my-secret-token';
    expect(hashSecret(secret, 'pepper-a')).not.toBe(hashSecret(secret, 'pepper-b'));
  });

  it('produces a different hash for a different secret', () => {
    const pepper = 'pepper-value';
    expect(hashSecret('token-a', pepper)).not.toBe(hashSecret('token-b', pepper));
  });

  it('never reveals the pepper or secret in its output (hex digest only)', () => {
    const hash = hashSecret('my-secret-token', 'pepper-value');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateOpaqueSecret', () => {
  it('produces unique, high-entropy values on each call', () => {
    const secrets = new Set(Array.from({ length: 50 }, () => generateOpaqueSecret()));
    expect(secrets.size).toBe(50);
  });

  it('produces URL-safe output usable directly in an action link', () => {
    const secret = generateOpaqueSecret();
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('publicKeyPrefix', () => {
  it('is deterministic for the same secret', () => {
    const secret = generateOpaqueSecret();
    expect(publicKeyPrefix(secret)).toBe(publicKeyPrefix(secret));
  });

  it('does not reveal the underlying secret', () => {
    const secret = 'a-plaintext-api-key';
    expect(publicKeyPrefix(secret)).not.toContain(secret);
  });
});

describe('generatePublicReference', () => {
  it('follows the STERNEN-<year>-<suffix> format', () => {
    const reference = generatePublicReference(2026);
    expect(reference).toMatch(/^STERNEN-2026-[0-9A-F]{6}$/);
  });

  it('produces different references on repeated calls', () => {
    const references = new Set(Array.from({ length: 20 }, () => generatePublicReference(2026)));
    expect(references.size).toBeGreaterThan(1);
  });
});
