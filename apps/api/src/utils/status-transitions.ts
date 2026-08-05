import type { ReservationStatus } from '@sternen/shared';

export type StatusTransitionOutcome = 'ALLOWED' | 'ALREADY_IN_TARGET_STATE' | 'CONFLICT';

/**
 * Single source of truth for which reservation status transitions are
 * permitted. Pulled out as a pure function so the rule can be unit-tested
 * without a database, and so confirm/reject/cancel don't each re-implement
 * slightly different status-guard logic.
 */
export function evaluateStatusTransition(
  current: ReservationStatus,
  target: 'CONFIRMED' | 'REJECTED' | 'CANCELLED',
): StatusTransitionOutcome {
  if (current === target) {
    return 'ALREADY_IN_TARGET_STATE';
  }

  switch (target) {
    case 'CONFIRMED':
      return current === 'PENDING' ? 'ALLOWED' : 'CONFLICT';
    case 'REJECTED':
      return current === 'PENDING' ? 'ALLOWED' : 'CONFLICT';
    case 'CANCELLED':
      return current === 'PENDING' || current === 'CONFIRMED' ? 'ALLOWED' : 'CONFLICT';
  }
}
