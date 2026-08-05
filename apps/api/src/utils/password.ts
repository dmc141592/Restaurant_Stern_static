import { hash, verify } from '@node-rs/argon2';

// @node-rs/argon2 declares `Algorithm` as a `const enum`, which cannot be
// imported under isolatedModules (required elsewhere in this project's
// tsconfig). `2` is that package's `Algorithm.Argon2id` value.
const ARGON2ID = 2;

// OWASP-recommended minimum parameters for Argon2id (as of 2024/2025 guidance).
const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(hashValue: string, plainPassword: string): Promise<boolean> {
  return verify(hashValue, plainPassword, ARGON2_OPTIONS);
}
