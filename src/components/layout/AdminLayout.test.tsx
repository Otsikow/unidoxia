import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminLayout from './AdminLayout';
const state = vi.hoisted(() => ({ mobile: false }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profile: { full_name: 'Test admin' }, signOut: vi.fn() }) }));
vi.mock('@/hooks/useUserRoles', () => ({ useUserRoles: () => ({ loading: false, hasRole: () => true }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => state.mobile }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key }) }));
vi.mock('@/components/notifications/NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('@/components/BackButton', () => ({ default: () => null }));
function show() {
  render(<MemoryRouter initialEntries={['/admin/overview']}><Routes><Route path="/admin" element={<AdminLayout />}><Route path="overview" element={<h1>Admin overview</h1>} /><Route path="applications" element={<h1>Application queue</h1>} /></Route></Routes></MemoryRouter>);
}
beforeEach(() => { state.mobile = false; localStorage.clear(); });
describe('admin applications navigation', () => {
  it('opens the applications route from the admin sidebar', async () => {
    show();
    const link = screen.getByRole('link', { name: 'Applications' });
    expect(link).toHaveAttribute('href', '/admin/applications');
    await userEvent.click(link);
    expect(screen.getByRole('heading', { name: 'Application queue' })).toBeInTheDocument();
  });
  it('includes applications in the mobile navigation menu', async () => {
    state.mobile = true;
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog').querySelector('a[href="/admin/applications"]')).toHaveTextContent('Applications');
    await userEvent.click(screen.getByRole('dialog').querySelector('a[href="/admin/applications"]')!);
    expect(screen.getByRole('heading', { name: 'Application queue' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
