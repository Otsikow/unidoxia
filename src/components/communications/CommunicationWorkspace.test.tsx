import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationWorkspace, type CommunicationStudent } from './CommunicationWorkspace';
const fake=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'staff'},profile:{id:'staff',tenant_id:'tenant',role:'admin'}})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:(...args:unknown[])=>fake.invoke(...args)}}}));
vi.mock('./StudentInternalConversation',()=>({StudentInternalConversation:({profileId}:{profileId:string})=><div>Internal account {profileId}</div>}));
const student:CommunicationStudent={id:'student-a',profile_id:'profile-a',reference_code:'UDX-123',legal_name:'Ama Mensah',contact_email:'ama@example.test',whatsapp_number:'+233501234567',current_country:'Ghana',applications:[{id:'app-a',app_number:'APP123',program:{name:'Computing',university:{name:'Sample University'}}}]};
const capabilities={emailEnabled:true,historyEnabled:true,from:'info@unidoxia.com',whatsappMode:'external',emailReplies:'external'};
function show(enabled=true){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><MemoryRouter><CommunicationWorkspace student={student} capabilities={{...capabilities,emailEnabled:enabled}} onDirtyChange={vi.fn()}/></MemoryRouter></QueryClientProvider>);}
beforeEach(()=>{vi.clearAllMocks();fake.invoke.mockImplementation(async(_name:string,{body}:{body:any})=>({data:body.action==='history'?{rows:[],total:0}:{status:'accepted',providerId:'provider'},error:null}));});
afterEach(cleanup);
async function click(name:string){await act(async()=>{await userEvent.click(screen.getByRole('button',{name}));});}
describe('student communication composer',()=>{
 it('uses the student context, approved signature and an audited email send request',async()=>{
  show();expect((screen.getByLabelText('Message to Ama Mensah') as HTMLTextAreaElement).value).toContain('Ama Mensah');
  expect(screen.getByText(/Best regards,/)).toHaveTextContent('UniDoxia Team');
  await click('Send Email');
  const request=fake.invoke.mock.calls.find(call=>call[1].body.action==='send_email')[1].body;
  expect(request).toMatchObject({studentId:'student-a',expectedEmail:'ama@example.test',applicationId:null});expect(request).not.toHaveProperty('to');
  expect(await screen.findByRole('status')).toHaveTextContent('Delivery and replies are not confirmed');expect(screen.getByRole('button',{name:'Email accepted'})).toBeDisabled();
 });
 it('keeps an uncertain draft locked and retries with the same operation ID',async()=>{
  let attempts=0;fake.invoke.mockImplementation(async(_name:string,{body}:{body:any})=>body.action==='send_email'&&attempts++===0?{data:null,error:new Error('network lost')}:{data:body.action==='history'?{rows:[],total:0}:{status:'accepted'},error:null});
  show();await click('Send Email');expect(await screen.findByRole('alert')).toHaveTextContent('draft has been kept');
  expect(screen.getByLabelText('Message to Ama Mensah')).toHaveAttribute('readonly');await click('Retry same email');
  const sends=fake.invoke.mock.calls.filter(call=>call[1].body.action==='send_email').map(call=>call[1].body);expect(sends).toHaveLength(2);expect(sends[1]).toEqual(sends[0]);
 });
 it('does not claim direct email or WhatsApp synchronisation when not available',async()=>{
  show(false);expect(screen.getByRole('button',{name:'Send Email'})).toBeDisabled();expect(screen.getByRole('link',{name:/Open email app/})).toHaveAttribute('href',expect.stringContaining('mailto:ama%40example.test'));
  await act(async()=>{await userEvent.click(screen.getByRole('tab',{name:'WhatsApp'}));});
  expect(screen.getByText(/messages, replies and delivery status are not synchronised/)).toBeInTheDocument();
  const link=screen.getByRole('link',{name:/Message on WhatsApp/});expect(new URL(link.getAttribute('href')!).pathname).toBe('/233501234567');
 });
 it('asks before replacing edited content with a template and selects the exact application',async()=>{
  show();await act(async()=>{await userEvent.selectOptions(screen.getByLabelText('Application context'),'app-a');});
  expect((screen.getByLabelText('Message to Ama Mensah') as HTMLTextAreaElement).value).toContain('APP123');
  await act(async()=>{await userEvent.type(screen.getByLabelText('Message to Ama Mensah'),' Custom note.');});
  await click('Use template');expect(await screen.findByRole('alertdialog')).toHaveTextContent('Replace this draft?');await click('Keep draft');expect((screen.getByLabelText('Message to Ama Mensah') as HTMLTextAreaElement).value).toContain('Custom note.');
 });
 it('shows only the server-scoped history and identifies manual/external status correctly',async()=>{
  fake.invoke.mockResolvedValue({data:{rows:[{id:'one',student_id:'student-a',application_id:null,author_id:'staff',channel:'whatsapp_launch',status:'external_launch',subject:'WhatsApp launch requested',body:'Sample launch',created_at:'2026-10-31T12:00:00Z'}],total:1},error:null});
  show();await act(async()=>{await userEvent.click(screen.getByRole('tab',{name:'History & notes'}));});
  await screen.findByText('Sample launch');expect(screen.getByText('WhatsApp launch requested — not a send confirmation')).toBeInTheDocument();
  expect(fake.invoke).toHaveBeenCalledWith('student-communication',{body:{action:'history',studentId:'student-a',offset:0}});
 });
});
