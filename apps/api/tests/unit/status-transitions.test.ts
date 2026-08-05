import { describe, expect, it } from 'vitest';
import { evaluateStatusTransition } from '../../src/utils/status-transitions.js';

describe('evaluateStatusTransition', () => {
  it('allows confirming a PENDING reservation', () => {
    expect(evaluateStatusTransition('PENDING', 'CONFIRMED')).toBe('ALLOWED');
  });

  it('allows rejecting a PENDING reservation', () => {
    expect(evaluateStatusTransition('PENDING', 'REJECTED')).toBe('ALLOWED');
  });

  it('allows cancelling a PENDING reservation', () => {
    expect(evaluateStatusTransition('PENDING', 'CANCELLED')).toBe('ALLOWED');
  });

  it('allows cancelling a CONFIRMED reservation', () => {
    expect(evaluateStatusTransition('CONFIRMED', 'CANCELLED')).toBe('ALLOWED');
  });

  it('treats confirming an already CONFIRMED reservation as idempotent', () => {
    expect(evaluateStatusTransition('CONFIRMED', 'CONFIRMED')).toBe('ALREADY_IN_TARGET_STATE');
  });

  it('treats rejecting an already REJECTED reservation as idempotent', () => {
    expect(evaluateStatusTransition('REJECTED', 'REJECTED')).toBe('ALREADY_IN_TARGET_STATE');
  });

  it('treats cancelling an already CANCELLED reservation as idempotent', () => {
    expect(evaluateStatusTransition('CANCELLED', 'CANCELLED')).toBe('ALREADY_IN_TARGET_STATE');
  });

  it('rejects confirming an already REJECTED reservation', () => {
    expect(evaluateStatusTransition('REJECTED', 'CONFIRMED')).toBe('CONFLICT');
  });

  it('rejects confirming an already CANCELLED reservation', () => {
    expect(evaluateStatusTransition('CANCELLED', 'CONFIRMED')).toBe('CONFLICT');
  });

  it('rejects rejecting an already CONFIRMED reservation', () => {
    expect(evaluateStatusTransition('CONFIRMED', 'REJECTED')).toBe('CONFLICT');
  });

  it('rejects cancelling an already REJECTED reservation', () => {
    expect(evaluateStatusTransition('REJECTED', 'CANCELLED')).toBe('CONFLICT');
  });
});
