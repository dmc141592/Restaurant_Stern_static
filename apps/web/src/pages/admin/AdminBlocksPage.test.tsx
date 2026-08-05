import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render.js';
import { ApiError } from '../../api/client.js';
import AdminBlocksPage from './AdminBlocksPage.js';

vi.mock('../../api/admin.js', () => ({
  fetchAdminAreas: vi.fn(),
  fetchBlocks: vi.fn(),
  createBlock: vi.fn(),
  deleteBlock: vi.fn(),
}));

import { createBlock, fetchAdminAreas, fetchBlocks } from '../../api/admin.js';

const mockedFetchAdminAreas = fetchAdminAreas as unknown as ReturnType<typeof vi.fn>;
const mockedFetchBlocks = fetchBlocks as unknown as ReturnType<typeof vi.fn>;
const mockedCreateBlock = createBlock as unknown as ReturnType<typeof vi.fn>;

const areas = [
  {
    id: 'area-1',
    slug: 'restaurant',
    name: 'Restaurant',
    description: null,
    resourceMode: 'CAPACITY' as const,
    capacity: 60,
    defaultDurationMinutes: 120,
    slotIntervalMinutes: 30,
    isActive: true,
    isOnlineBookable: true,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

async function fillBlockForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Titel'), 'Betriebsferien');
  fireEvent.change(screen.getByLabelText('Von Datum'), { target: { value: '2026-09-01' } });
  fireEvent.change(screen.getByLabelText('Von Zeit'), { target: { value: '00:00' } });
  fireEvent.change(screen.getByLabelText('Bis Datum'), { target: { value: '2026-09-02' } });
  fireEvent.change(screen.getByLabelText('Bis Zeit'), { target: { value: '00:00' } });
}

describe('AdminBlocksPage (Sperrformular)', () => {
  beforeEach(() => {
    mockedFetchAdminAreas.mockReset().mockResolvedValue(areas);
    mockedFetchBlocks.mockReset().mockResolvedValue([]);
    mockedCreateBlock.mockReset();
  });

  it('submits a new block with the entered title and time range', async () => {
    mockedCreateBlock.mockResolvedValue({
      id: 'block-1',
      areaId: null,
      areaName: null,
      blockType: 'CLOSURE',
      title: 'Betriebsferien',
      reason: null,
      startsAt: '2026-09-01T00:00:00.000Z',
      endsAt: '2026-09-02T00:00:00.000Z',
      blockedCapacity: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const user = userEvent.setup();

    renderWithProviders(<AdminBlocksPage />);
    await waitFor(() => expect(mockedFetchAdminAreas).toHaveBeenCalled());

    await fillBlockForm(user);
    await user.click(screen.getByRole('button', { name: 'Sperrung anlegen' }));

    await waitFor(() => {
      expect(mockedCreateBlock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Betriebsferien', startDate: '2026-09-01', endDate: '2026-09-02' }),
      );
    });
  });

  it('shows a conflict warning with affected reservations and allows overriding it', async () => {
    mockedCreateBlock
      .mockRejectedValueOnce(
        new ApiError(
          {
            code: 'BLOCK_CONFLICT',
            message: 'Diese Sperrung überschneidet sich mit bestehenden Reservationen.',
            requestId: 'req-1',
            details: {
              conflicts: [
                {
                  reference: 'STERNEN-2026-ABC123',
                  guestName: 'Anna Muster',
                  startsAt: '2026-09-01T19:00:00.000Z',
                  endsAt: '2026-09-01T21:00:00.000Z',
                  partySize: 4,
                  areaName: 'Restaurant',
                },
              ],
            },
          },
          409,
        ),
      )
      .mockResolvedValueOnce({
        id: 'block-1',
        areaId: null,
        areaName: null,
        blockType: 'CLOSURE',
        title: 'Betriebsferien',
        reason: null,
        startsAt: '2026-09-01T00:00:00.000Z',
        endsAt: '2026-09-02T00:00:00.000Z',
        blockedCapacity: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });

    const user = userEvent.setup();
    renderWithProviders(<AdminBlocksPage />);
    await waitFor(() => expect(mockedFetchAdminAreas).toHaveBeenCalled());

    await fillBlockForm(user);
    await user.click(screen.getByRole('button', { name: 'Sperrung anlegen' }));

    expect(await screen.findByText('STERNEN-2026-ABC123', { exact: false })).toBeInTheDocument();
    const overrideButton = screen.getByRole('button', { name: 'Trotzdem sperren' });

    await user.click(overrideButton);

    await waitFor(() => {
      expect(mockedCreateBlock).toHaveBeenLastCalledWith(expect.objectContaining({ acknowledgeConflicts: true }));
    });
  });
});
