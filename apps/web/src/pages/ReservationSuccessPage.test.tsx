import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/render.js';
import ReservationSuccessPage from './ReservationSuccessPage.js';
import type { CreateReservationResponse } from '../api/public.js';

const result: CreateReservationResponse = {
  reservation: {
    reference: 'STERNEN-2026-ABC123',
    status: 'PENDING',
    statusLabel: 'Eingegangen',
    area: { id: 'area-1', name: 'Restaurant' },
    startsAt: '2026-08-15T17:00:00.000Z',
    endsAt: '2026-08-15T19:00:00.000Z',
    partySize: 4,
  },
  message: 'Ihre Reservationsanfrage wurde übermittelt und wird vom Restaurant geprüft.',
};

describe('ReservationSuccessPage', () => {
  it('shows the success message and reservation reference when navigation state is present', () => {
    renderWithProviders(<ReservationSuccessPage />, {
      initialEntries: [{ pathname: '/reservation/erfolgreich', state: { result } }],
    });

    expect(screen.getByText(result.message)).toBeInTheDocument();
    expect(screen.getByText('STERNEN-2026-ABC123')).toBeInTheDocument();
    expect(screen.getByText('Eingegangen')).toBeInTheDocument();
  });

  it('falls back to a helpful message when no reservation state is present', () => {
    renderWithProviders(<ReservationSuccessPage />, { route: '/reservation/erfolgreich' });

    expect(screen.getByText(/keine Informationen/)).toBeInTheDocument();
  });
});
