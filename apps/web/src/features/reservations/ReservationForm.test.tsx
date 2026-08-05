import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render.js';
import { ApiError } from '../../api/client.js';
import ReservationForm from './ReservationForm.js';

vi.mock('../../api/public.js', () => ({
  fetchAvailability: vi.fn(),
  createReservation: vi.fn(),
}));

import { createReservation, fetchAvailability } from '../../api/public.js';

const mockedFetchAvailability = fetchAvailability as unknown as ReturnType<typeof vi.fn>;
const mockedCreateReservation = createReservation as unknown as ReturnType<typeof vi.fn>;

async function fillBaseDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Vorname'), 'Anna');
  await user.type(screen.getByLabelText('Nachname'), 'Muster');
  await user.type(screen.getByLabelText('E-Mail-Adresse'), 'anna@example.com');
  await user.type(screen.getByLabelText('Telefonnummer'), '+41791234567');
  await user.click(screen.getByLabelText(/Datenschutzbestimmungen/));
}

describe('ReservationForm', () => {
  beforeEach(() => {
    mockedFetchAvailability.mockReset();
    mockedCreateReservation.mockReset();
  });

  it('shows validation errors and does not submit when required fields are missing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReservationForm />);

    await user.click(screen.getByRole('button', { name: 'Reservation absenden' }));

    expect(await screen.findByText('Telefonnummer ist zu kurz.')).toBeInTheDocument();
    expect(
      screen.getByText('Die Datenschutzbestimmungen müssen akzeptiert werden.'),
    ).toBeInTheDocument();
    expect(mockedCreateReservation).not.toHaveBeenCalled();
  });

  it('loads and pre-selects the recommended area once date, time and party size are filled in', async () => {
    mockedFetchAvailability.mockResolvedValue({
      requestedStart: '2026-08-15T17:00:00.000Z',
      durationMinutes: 120,
      recommendation: {
        areaId: '11111111-1111-4111-8111-111111111111',
        areaName: 'Restaurant',
        availableCapacity: 24,
      },
      alternatives: [
        {
          areaId: '22222222-2222-4222-8222-222222222222',
          areaName: 'Garten',
          availableCapacity: 80,
        },
      ],
    });

    renderWithProviders(<ReservationForm />);

    const dateInput = screen.getByLabelText('Datum');
    const timeInput = screen.getByLabelText('Uhrzeit');
    fireEvent.change(dateInput, { target: { value: '2026-08-15' } });
    fireEvent.change(timeInput, { target: { value: '19:00' } });

    await waitFor(() => {
      expect(screen.getByText(/Restaurant/)).toBeInTheDocument();
    });

    const restaurantRadio = screen.getByRole('radio', { name: /Restaurant/ });
    expect(restaurantRadio).toBeChecked();
  });

  it('allows switching to an alternative area', async () => {
    mockedFetchAvailability.mockResolvedValue({
      requestedStart: '2026-08-15T17:00:00.000Z',
      durationMinutes: 120,
      recommendation: {
        areaId: '11111111-1111-4111-8111-111111111111',
        areaName: 'Restaurant',
        availableCapacity: 24,
      },
      alternatives: [
        {
          areaId: '22222222-2222-4222-8222-222222222222',
          areaName: 'Garten',
          availableCapacity: 80,
        },
      ],
    });

    const user = userEvent.setup();
    renderWithProviders(<ReservationForm />);

    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '2026-08-15' } });
    fireEvent.change(screen.getByLabelText('Uhrzeit'), { target: { value: '19:00' } });

    await waitFor(() => expect(screen.getByRole('radio', { name: /Garten/ })).toBeInTheDocument());

    const gardenRadio = screen.getByRole('radio', { name: /Garten/ });
    await user.click(gardenRadio);

    expect(gardenRadio).toBeChecked();
    expect(screen.getByRole('radio', { name: /Restaurant/ })).not.toBeChecked();
  });

  it('shows a conflict message with alternatives when submission fails with AVAILABILITY_CONFLICT', async () => {
    mockedFetchAvailability.mockResolvedValue({
      requestedStart: '2026-08-15T17:00:00.000Z',
      durationMinutes: 120,
      recommendation: {
        areaId: '11111111-1111-4111-8111-111111111111',
        areaName: 'Restaurant',
        availableCapacity: 24,
      },
      alternatives: [],
    });
    mockedCreateReservation.mockRejectedValue(
      new ApiError(
        {
          code: 'AVAILABILITY_CONFLICT',
          message: 'Der gewählte Bereich ist zu diesem Zeitpunkt nicht mehr verfügbar.',
          requestId: 'test-request-id',
          details: {
            alternatives: [
              {
                areaId: '22222222-2222-4222-8222-222222222222',
                areaName: 'Garten',
                availableCapacity: 80,
              },
            ],
          },
        },
        409,
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<ReservationForm />);

    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '2026-08-15' } });
    fireEvent.change(screen.getByLabelText('Uhrzeit'), { target: { value: '19:00' } });
    await waitFor(() => expect(screen.getByRole('radio', { name: /Restaurant/ })).toBeChecked());
    await fillBaseDetails(user);

    await user.click(screen.getByRole('button', { name: 'Reservation absenden' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('nicht mehr verfügbar');
    });
    expect(screen.getByText(/Garten/)).toBeInTheDocument();
  });
});
