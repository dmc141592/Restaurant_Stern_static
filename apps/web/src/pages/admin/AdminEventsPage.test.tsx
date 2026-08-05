import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render.js';
import AdminEventsPage from './AdminEventsPage.js';

vi.mock('../../api/admin.js', () => ({
  fetchAdminAreas: vi.fn(),
  fetchAdminEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

import { createEvent, fetchAdminAreas, fetchAdminEvents } from '../../api/admin.js';

const mockedFetchAdminAreas = fetchAdminAreas as unknown as ReturnType<typeof vi.fn>;
const mockedFetchAdminEvents = fetchAdminEvents as unknown as ReturnType<typeof vi.fn>;
const mockedCreateEvent = createEvent as unknown as ReturnType<typeof vi.fn>;

const areas = [
  {
    id: 'area-1',
    slug: 'garten',
    name: 'Garten',
    description: null,
    resourceMode: 'CAPACITY' as const,
    capacity: 200,
    defaultDurationMinutes: 120,
    slotIntervalMinutes: 30,
    isActive: true,
    isOnlineBookable: true,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('AdminEventsPage (Eventformular)', () => {
  beforeEach(() => {
    mockedFetchAdminAreas.mockReset().mockResolvedValue(areas);
    mockedFetchAdminEvents.mockReset().mockResolvedValue([]);
    mockedCreateEvent.mockReset().mockResolvedValue({
      id: 'event-1',
      slug: 'jazz-abend',
      title: 'Jazz-Abend',
      summary: 'Live-Musik im Garten',
      description: null,
      startsAt: '2026-09-05T18:00:00.000Z',
      endsAt: '2026-09-05T23:00:00.000Z',
      isPublished: false,
      publishedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      areas: [],
      areaIds: ['area-1'],
    });
  });

  it('submits a new event with the selected area and blocking option', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminEventsPage />);

    await waitFor(() => expect(mockedFetchAdminAreas).toHaveBeenCalled());

    await user.type(screen.getByLabelText('Titel'), 'Jazz-Abend');
    await user.type(screen.getByLabelText('Slug'), 'jazz-abend');
    await user.type(screen.getByLabelText('Kurzbeschreibung'), 'Live-Musik im Garten');
    fireEvent.change(screen.getByLabelText('Beginn Datum'), { target: { value: '2026-09-05' } });
    fireEvent.change(screen.getByLabelText('Beginn Zeit'), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText('Ende Datum'), { target: { value: '2026-09-05' } });
    fireEvent.change(screen.getByLabelText('Ende Zeit'), { target: { value: '23:00' } });

    await user.click(screen.getByRole('checkbox', { name: 'Garten' }));

    await user.click(screen.getByRole('button', { name: 'Event anlegen' }));

    await waitFor(() => {
      expect(mockedCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Jazz-Abend',
          slug: 'jazz-abend',
          areaIds: ['area-1'],
          blockAreas: true,
        }),
      );
    });
  });
});
