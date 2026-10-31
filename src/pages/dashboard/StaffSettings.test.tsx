import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StaffSettings from './StaffSettings';

const fake = vi.hoisted(() => ({ update: vi.fn(), result: vi.fn(), auth: vi.fn(), toast: vi.fn(), refresh: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'staff-id', email: 'staff@example.test' }, profile: { id: 'staff-id', full_name: 'Old Name', phone: '123', email: 'staff@example.test' }, refreshProfile: fake.refresh }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ update: (value: unknown) => { fake.update(value); return { eq: () => ({ select: () => ({ maybeSingle: fake.result }) }) }; } }), auth: { updateUser: fake.auth } } }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: fake.toast }) }));
vi.mock('@/components/layout/DashboardLayout', () => ({ DashboardLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/BackButton', () => ({ default: () => null }));
vi.mock('@/components/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/providers/LanguageProvider', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn(), availableLanguages: ['en'] }) }));

beforeEach(() => { vi.clearAllMocks(); fake.result.mockResolvedValue({ data: { id: 'staff-id' }, error: null }); fake.auth.mockResolvedValue({ error: null }); fake.refresh.mockResolvedValue(undefined); });
describe('staff settings', () => {
  it('saves profile fields and an intentional password change', async () => {
    render(<StaffSettings />); const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Full name')); await user.type(screen.getByLabelText('Full name'), 'New Name');
    await user.type(screen.getByLabelText('Password'), 'new-password');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(fake.toast).toHaveBeenCalledWith({ title: 'Changes saved' }));
    expect(fake.update).toHaveBeenCalledWith({ full_name: 'New Name', phone: '123' });
    expect(fake.auth).toHaveBeenCalledWith({ password: 'new-password' });
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
  });
  it('reports a denied profile update and does not attempt an account change', async () => {
    fake.result.mockResolvedValue({ data: null, error: null });
    render(<StaffSettings />); const user = userEvent.setup();
    await user.type(screen.getByLabelText('Password'), 'new-password');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(fake.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Changes not saved', variant: 'destructive' })));
    expect(fake.auth).not.toHaveBeenCalled();
  });
  it('reports partial success when password update fails', async () => {
    fake.auth.mockResolvedValue({ error: { message: 'Password rejected' } });
    render(<StaffSettings />); const user = userEvent.setup();
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(fake.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Profile saved; account change failed', description: 'Password rejected' })));
  });
});
