import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render.js';
import { AdminAuthProvider } from '../../features/admin/AdminAuthContext.js';
import AdminLoginPage from './AdminLoginPage.js';

vi.mock('../../api/admin.js', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchSession: vi.fn(),
}));

import { fetchSession, login } from '../../api/admin.js';

const mockedLogin = login as unknown as ReturnType<typeof vi.fn>;
const mockedFetchSession = fetchSession as unknown as ReturnType<typeof vi.fn>;

describe('AdminLoginPage', () => {
  beforeEach(() => {
    mockedLogin.mockReset();
    mockedFetchSession.mockReset();
    mockedFetchSession.mockResolvedValue({ authenticated: false });
  });

  it('submits the entered credentials to the login API', async () => {
    mockedLogin.mockResolvedValue({ administrator: { email: 'admin@sternen-albisrieden.ch' } });
    const user = userEvent.setup();

    renderWithProviders(<AdminLoginPage />, {
      wrapper: (children) => <AdminAuthProvider>{children}</AdminAuthProvider>,
    });

    await waitFor(() => expect(mockedFetchSession).toHaveBeenCalled());

    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'admin@sternen-albisrieden.ch');
    await user.type(screen.getByLabelText('Passwort'), 'correct-password-123');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith('admin@sternen-albisrieden.ch', 'correct-password-123');
    });
  });

  it('shows a generic error message when the login fails', async () => {
    mockedLogin.mockRejectedValue(new Error('Unauthorized'));
    const user = userEvent.setup();

    renderWithProviders(<AdminLoginPage />, {
      wrapper: (children) => <AdminAuthProvider>{children}</AdminAuthProvider>,
    });

    await waitFor(() => expect(mockedFetchSession).toHaveBeenCalled());

    await user.type(screen.getByLabelText('E-Mail-Adresse'), 'admin@sternen-albisrieden.ch');
    await user.type(screen.getByLabelText('Passwort'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(await screen.findByText('E-Mail-Adresse oder Passwort ist ungültig.')).toBeInTheDocument();
  });
});
