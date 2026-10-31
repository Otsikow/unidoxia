import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import AdminLayout from './AdminLayout';
const state=vi.hoisted(()=>({ role:'admin',loading:false }));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'test'},profile:{full_name:'Test admin'},signOut:vi.fn()})}));
vi.mock('@/hooks/useUserRoles',()=>({useUserRoles:()=>({primaryRole:state.role,loading:state.loading,hasRole:(role:string)=>role===state.role})}));
vi.mock('@/hooks/use-mobile',()=>({useIsMobile:()=>false}));
vi.mock('@/hooks/usePageViewTracking',()=>({usePageViewTracking:vi.fn()}));
vi.mock('react-i18next',()=>({useTranslation:()=>({t:(_key:string,opts?:{defaultValue?:string})=>opts?.defaultValue??_key})}));
vi.mock('@/components/layout/AppSidebar',()=>({AppSidebar:()=> <p>Shared role navigation</p>}));
vi.mock('@/components/layout/AppFooter',()=>({AppFooter:()=>null}));
vi.mock('@/components/agent/AgentAgreementGate',()=>({AgentAgreementGate:()=>null}));
vi.mock('@/components/ThemeToggle',()=>({ThemeToggle:()=> <button>Theme control</button>}));
vi.mock('@/components/notifications/NotificationBell',()=>({NotificationBell:()=>null}));
vi.mock('@/components/BackButton',()=>({default:()=>null}));
function show(node:React.ReactNode){return render(<MemoryRouter>{node}</MemoryRouter>);}
beforeEach(()=>{state.role='admin';state.loading=false;localStorage.clear();});
describe('one admin shell',()=>{
 it('uses the simplified admin layout for a standalone shared page',()=>{show(<DashboardLayout><h1>Tasks content</h1></DashboardLayout>);expect(screen.getByText('Admin Control Centre')).toBeInTheDocument();expect(screen.queryByText('Shared role navigation')).not.toBeInTheDocument();expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();});
 it('does not nest another shell when a shared tool is inside an admin route',()=>{show(<AdminLayout><DashboardLayout><h1>Tasks content</h1></DashboardLayout></AdminLayout>);expect(screen.getAllByText('Admin Control Centre')).toHaveLength(1);expect(screen.getAllByRole('heading',{name:'Tasks content'})).toHaveLength(1);expect(screen.queryByText('Shared role navigation')).not.toBeInTheDocument();});
 it('preserves the shared layout for staff',()=>{state.role='staff';show(<DashboardLayout><h1>Staff content</h1></DashboardLayout>);expect(screen.getByText('Shared role navigation')).toBeInTheDocument();expect(screen.queryByText('Admin Control Centre')).not.toBeInTheDocument();});
 it('does not flash an old sidebar while resolving roles',()=>{state.loading=true;show(<DashboardLayout><h1>Content</h1></DashboardLayout>);expect(screen.getByText('Loading navigation…')).toBeInTheDocument();expect(screen.queryByText('Shared role navigation')).not.toBeInTheDocument();});
});
