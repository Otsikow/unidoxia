import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
const state = vi.hoisted(() => ({ roles: ['admin'], roleLoading: false, signedIn: true, verified: true, phone: '+441234567890' }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: state.signedIn ? { id: 'user', email_confirmed_at: state.verified ? '2026-01-01' : null, user_metadata: { role: 'admin', referral_source: 'Test source' } } : null, profile: { role: 'staff', phone: state.phone }, loading: false, profileLoading: false, signOut: vi.fn() }) }));
vi.mock('@/hooks/useUserRoles', () => ({ useUserRoles: () => ({ roles: state.roles, loading: state.roleLoading }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/components/BackButton', () => ({ default: () => null }));
function Destination() { const location=useLocation(); return <><output>{location.pathname}{location.search}{location.hash}</output><output aria-label="Preserved navigation state">{location.state?.conversationId}</output></>; }
function show(allowedRoles: Array<'admin'|'staff'> = ['admin','staff']) { render(<MemoryRouter initialEntries={[{ pathname: '/dashboard/applications', search: '?application=test', hash: '#history', state: { conversationId: 'test-conversation' } }]}><Routes><Route path="/dashboard/applications" element={<ProtectedRoute allowedRoles={allowedRoles}><p>Original workspace</p></ProtectedRoute>} /><Route path="*" element={<Destination/>} /></Routes></MemoryRouter>); }
beforeEach(() => { state.roles=['admin']; state.roleLoading=false; state.signedIn=true; state.verified=true; state.phone='+441234567890'; });
describe('admin consolidation preserves route guards', () => {
  it('redirects an authorised admin with its deep link intact', () => { show(); expect(screen.getByText('/admin/applications?application=test#history')).toBeInTheDocument(); expect(screen.getByLabelText('Preserved navigation state')).toHaveTextContent('test-conversation'); });
  it('keeps a non-admin in their existing workspace even if editable metadata says admin', () => { state.roles=['staff']; show(); expect(screen.getByText('Original workspace')).toBeInTheDocument(); });
  it('does not redirect before roles finish loading', () => { state.roleLoading=true; show(); expect(screen.getByText('Authenticating...')).toBeInTheDocument(); expect(screen.queryByText('Original workspace')).not.toBeInTheDocument(); });
  it('keeps role denial ahead of canonical routing', () => { state.roles=['staff']; show(['admin']); expect(screen.getByText('/')).toBeInTheDocument(); });
  it('keeps sign-in and verification requirements ahead of canonical routing', () => { state.signedIn=false; show(); expect(screen.getByText('/auth/login')).toBeInTheDocument(); });
  it('keeps unverified accounts behind email verification', () => { state.verified=false; show(); expect(screen.getByText('/verify-email')).toBeInTheDocument(); });
  it('keeps incomplete signup behind the existing signup gate', () => { state.phone=''; show(); expect(screen.getByText('/auth/complete-signup')).toBeInTheDocument(); });
});
