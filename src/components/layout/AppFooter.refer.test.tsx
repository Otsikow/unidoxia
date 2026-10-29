import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REFERRAL_SHOW_IN_FOOTER } from '@/config/referral';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { AppFooter } from './AppFooter';

afterEach(() => cleanup());

const renderFooter = (props?: { showReferLink?: boolean }) =>
  render(
    <MemoryRouter>
      <AppFooter {...props} />
    </MemoryRouter>,
  );

describe('AppFooter Refer a friend link', () => {
  it('is hidden by default until go-live', () => {
    expect(REFERRAL_SHOW_IN_FOOTER).toBe(false);
    renderFooter();
    expect(screen.queryByRole('link', { name: /Refer a friend/ })).not.toBeInTheDocument();
  });

  it('links to /refer when the flag is on', () => {
    renderFooter({ showReferLink: true });
    expect(screen.getByRole('link', { name: /Refer a friend/ })).toHaveAttribute('href', '/refer');
  });
});
