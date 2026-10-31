import {beforeEach,describe,it,expect,vi} from 'vitest';
import {renderHook,waitFor,act,render,screen} from '@testing-library/react';
import {QueryClient,QueryClientProvider,onlineManager} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';
import {useApplicationLimitCheck,useStudentBilling} from './useStudentBilling';
import {PlanStatusCard} from '@/components/billing/PlanStatusCard';
const api=vi.hoisted(()=>({billing:vi.fn(),count:vi.fn(),toast:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'synthetic-owner'}})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => table === 'students'
      ? {select: () => ({eq: () => ({single: api.billing})})}
      : {select: () => ({eq: () => ({neq: api.count})})},
  },
}));
const student={id:'synthetic-student',plan_type:'free',payment_confirmed_at:null,payment_date:null,assigned_agent_id:null};
function wrapper(cachedBilling?:typeof student){const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});if(cachedBilling)client.setQueryData(['student-billing','synthetic-owner'],cachedBilling);return ({children}:{children:React.ReactNode})=><QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>;}
beforeEach(()=>{vi.resetAllMocks();api.billing.mockResolvedValue({data:student,error:null});api.count.mockResolvedValue({count:0,error:null});});
describe('confirmed application allowances',()=>{
 it('waits for the count before allowing or describing a free allowance',async()=>{
  let resolve:(value:unknown)=>void=()=>{};api.count.mockImplementation(()=>new Promise(r=>{resolve=r;}));
  const {result}=renderHook(()=>useApplicationLimitCheck(),{wrapper:wrapper()});await waitFor(()=>expect(api.count).toHaveBeenCalled());
  expect(result.current.canCreate).toBe(false);expect(result.current.limitsLoading).toBe(true);expect(result.current.remainingApplications).toBeNull();
  await act(async()=>resolve({count:0,error:null}));await waitFor(()=>expect(result.current.canCreate).toBe(true));
 });
 it('reports a count error without claiming the free application was used or unused',async()=>{
  api.count.mockResolvedValue({count:null,error:new Error('synthetic count failure')});
  const {result}=renderHook(()=>useApplicationLimitCheck(),{wrapper:wrapper()});await waitFor(()=>expect(result.current.limitsUnavailable).toBe(true));
  expect(result.current.canCreate).toBe(false);expect(result.current.remainingApplications).toBeNull();
  act(()=>{expect(result.current.checkAndWarn()).toBe(false);});
  expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Application access unavailable'}));expect(api.toast).not.toHaveBeenCalledWith(expect.objectContaining({title:'Application Limit Reached'}));
 });
 it('recovers an unavailable count through the actual retry',async()=>{
  api.count.mockResolvedValue({count:null,error:new Error('offline')});const {result}=renderHook(()=>useApplicationLimitCheck(),{wrapper:wrapper()});await waitFor(()=>expect(result.current.limitsUnavailable).toBe(true));
  api.count.mockResolvedValue({count:0,error:null});await act(async()=>{await result.current.retry();});await waitFor(()=>expect(result.current.canCreate).toBe(true));expect(api.count).toHaveBeenCalledTimes(2);
 });
 it('shows a reached limit only after a confirmed count',async()=>{
  api.count.mockResolvedValue({count:1,error:null});const {result}=renderHook(()=>useApplicationLimitCheck(),{wrapper:wrapper()});await waitFor(()=>expect(api.count).toHaveBeenCalled());await waitFor(()=>expect(result.current.limitsLoading).toBe(false));
  expect(result.current.canCreate).toBe(false);expect(result.current.remainingApplications).toBe(0);act(()=>{result.current.checkAndWarn();});expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Application Limit Reached'}));
 });
 it('keeps confirmed legacy paid entitlement when its count is unavailable',async()=>{
  api.billing.mockResolvedValue({data:{...student,plan_type:'self_service'},error:null});api.count.mockResolvedValue({count:null,error:new Error('offline')});
  const {result}=renderHook(()=>useStudentBilling(),{wrapper:wrapper()});await waitFor(()=>expect(result.current.countError).toBeTruthy());expect(result.current.canCreateApplication()).toBe(true);expect(result.current.getPlanInfo().planType).toBe('self_service');expect(result.current.applicationCount).toBeUndefined();
 });
 it('does not infer access from an unknown billing plan',async()=>{
  api.billing.mockResolvedValue({data:{...student,plan_type:'unrecognised'},error:null});const {result}=renderHook(()=>useApplicationLimitCheck(),{wrapper:wrapper()});await waitFor(()=>expect(result.current.limitsUnavailable).toBe(true));expect(result.current.canCreate).toBe(false);expect(api.count).not.toHaveBeenCalled();
 });
 it('shows a retry instead of an allowance or upgrade when a count is unavailable',async()=>{
  api.count.mockResolvedValue({count:null,error:new Error('offline')});render(<PlanStatusCard/>,{wrapper:wrapper()});expect(await screen.findByRole('button',{name:'Retry'})).toBeInTheDocument();expect(screen.queryByText(/of 1 application used/)).not.toBeInTheDocument();expect(screen.queryByRole('link',{name:/Upgrade/})).not.toBeInTheDocument();
 });
 it('keeps a confirmed paid plan visible when only its count fails',async()=>{
  api.billing.mockResolvedValue({data:{...student,plan_type:'self_service'},error:null});api.count.mockResolvedValue({count:null,error:new Error('offline')});
  render(<PlanStatusCard/>,{wrapper:wrapper()});
  expect(await screen.findByText(/Legacy Self-Service/)).toBeInTheDocument();
  expect(await screen.findByText('Application count unavailable')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Retry'})).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText(/0 applications submitted/)).not.toBeInTheDocument();
 });
 it('keeps the paid plan visible while its count is loading, then shows the confirmed count',async()=>{
  let resolve:(value:unknown)=>void=()=>{};api.billing.mockResolvedValue({data:{...student,plan_type:'agent_supported'},error:null});api.count.mockImplementation(()=>new Promise(r=>{resolve=r;}));
  render(<PlanStatusCard/>,{wrapper:wrapper()});expect(await screen.findByText(/Agent-Supported — Full Guidance/)).toBeInTheDocument();expect(screen.getByText('Checking application count…')).toBeInTheDocument();
  await act(async()=>resolve({count:2,error:null}));expect(await screen.findByText('2 applications submitted')).toBeInTheDocument();
 });

 it('does not turn an offline paused count into a reached limit',()=>{
  onlineManager.setOnline(false);
  const view=renderHook(()=>useApplicationLimitCheck(),{wrapper:wrapper(student)});
  try {
    expect(view.result.current.limitsLoading).toBe(true);
    expect(view.result.current.canCreate).toBe(false);
    expect(view.result.current.remainingApplications).toBeNull();
    act(()=>{view.result.current.checkAndWarn();});
    expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Checking application access'}));
    expect(api.toast).not.toHaveBeenCalledWith(expect.objectContaining({title:'Application Limit Reached'}));
  } finally {view.unmount();onlineManager.setOnline(true);}
 });

});
