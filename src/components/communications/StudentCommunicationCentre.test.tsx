import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudentCommunicationCentre } from './StudentCommunicationCentre';
const fake=vi.hoisted(()=>({invoke:vi.fn(),scope:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'staff'},profile:{id:'staff',tenant_id:'tenant',role:'admin'}})}));
vi.mock('@/components/layout/DashboardLayout',()=>({DashboardLayout:({children}:{children:React.ReactNode})=><div>{children}</div>}));
vi.mock('./StudentInternalConversation',()=>({StudentInternalConversation:()=>null}));
const students=[{id:'a',profile_id:'pa',legal_name:'Ama Mensah',contact_email:'ama@example.test',reference_code:'UDX-A',whatsapp_number:'+233501234567',applications:[],current_country:'Ghana'},{id:'b',profile_id:'pb',legal_name:'Kojo Arthur',contact_email:'kojo@example.test',reference_code:'UDX-B',whatsapp_number:'+233501234568',applications:[],current_country:'Ghana'}];
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:(...args:unknown[])=>fake.invoke(...args)},from:()=>{
 let id:string|undefined;const chain:any={select:()=>chain,eq:(key:string,value:string)=>{fake.scope(key,value);if(key==='id')id=value;return chain;},order:()=>chain,range:()=>chain,or:()=>chain,single:async()=>({data:students.find(s=>s.id===id),error:null}),then:(resolve:any)=>Promise.resolve({data:students,count:2,error:null}).then(resolve)};return chain;
}}}));
beforeEach(()=>{vi.clearAllMocks();fake.invoke.mockImplementation(async(_name:string,{body}:{body:any})=>({data:body.action==='capabilities'?{emailEnabled:false,historyEnabled:false}: {rows:[],total:0},error:null}));});
afterEach(cleanup);
function show(){render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><MemoryRouter><StudentCommunicationCentre onTeamInbox={vi.fn()}/></MemoryRouter></QueryClientProvider>);}
describe('student communication centre routing and draft isolation',()=>{
 it('keeps drafts separate when switching between students',async()=>{
  show();const ama=await screen.findByRole('button',{name:/Ama Mensah/});await act(async()=>{await userEvent.click(ama);});
  await screen.findByLabelText('Message to Ama Mensah');await act(async()=>{await userEvent.type(screen.getByLabelText('Message to Ama Mensah'),' Ama-specific draft.');});
  await act(async()=>{await userEvent.click(screen.getByRole('button',{name:/Kojo Arthur/}));});await screen.findByLabelText('Message to Kojo Arthur');expect((screen.getByLabelText('Message to Kojo Arthur') as HTMLTextAreaElement).value).not.toContain('Ama-specific');
  await act(async()=>{await userEvent.click(screen.getByRole('button',{name:/Ama Mensah/}));});expect((await screen.findByLabelText('Message to Ama Mensah') as HTMLTextAreaElement).value).toContain('Ama-specific draft.');
  expect(fake.scope).toHaveBeenCalledWith('tenant_id','tenant');expect(fake.scope).toHaveBeenCalledWith('id','a');expect(fake.scope).toHaveBeenCalledWith('id','b');
 });
 it('keeps external actions available when the optional service is absent',async()=>{
  fake.invoke.mockResolvedValue({data:null,error:new Error('not deployed')});show();await screen.findByText(/Direct email and shared communication history are awaiting setup/);
  await act(async()=>{await userEvent.click(screen.getByRole('button',{name:/Ama Mensah/}));});await screen.findByRole('link',{name:/Open email app/});expect(screen.getByRole('button',{name:'Send Email'})).toBeDisabled();
 });
});
