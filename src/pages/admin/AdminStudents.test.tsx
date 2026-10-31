import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import AdminStudents from './AdminStudents';
const api=vi.hoisted(()=>({ read:vi.fn(),write:vi.fn(),toast:vi.fn(),update:vi.fn() }));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({profile:{id:'staff',tenant_id:'staff-tenant',role:'admin'}})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}));
vi.mock('@/lib/securityLogger',()=>({logSecurityEvent:vi.fn()}));
vi.mock('@/components/admin/DuplicateStudentsPanel',()=>({DuplicateStudentsPanel:()=> <div>Duplicate check loaded</div>}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:(table:string)=>{
 const chain={select:()=>chain,eq:()=>chain,order:()=>chain,range:api.read,maybeSingle:api.write,update:(value:unknown)=>{api.update(table,value);return chain;}};return chain;
}}}));
const student=(id='one',name='Ama Example',extra:Record<string,unknown>={})=>({ id,profile_id:`profile-${id}`,reference_code:`UDX-${id}`,legal_name:name,preferred_name:null,contact_email:`${id}@example.test`,contact_phone:null,current_country:'Ghana',preferred_course:'Computer Science',preferred_country:'Canada',preferred_intake_year:2027,preferred_intake_month:9,created_at:'2026-10-31T10:00:00Z',manual_status:null,archived_at:null,documents:[],applications:[],profile:null,...extra });
function Location(){const location=useLocation();return <output aria-label="Current location">{location.pathname}{location.search}</output>;}
function show(initial='/'){render(<MemoryRouter initialEntries={[initial]}><AdminStudents/><Location/></MemoryRouter>);}
beforeEach(()=>{vi.resetAllMocks();api.read.mockResolvedValue({data:[],error:null});api.write.mockResolvedValue({data:{id:'one'},error:null});});
describe('simple student workspace',()=>{
 it('shows real students, keeps archived records separate and opens the needed document tab',async()=>{
  api.read.mockResolvedValue({data:[student('one','Ama Example',{documents:[{id:'doc',document_type:'passport',admin_review_status:'awaiting_admin_review'}]}),student('two','Archived Example',{archived_at:'2026-10-30'})],error:null});
  show();await screen.findAllByText('Ama Example');expect(screen.queryByText('Archived Example')).not.toBeInTheDocument();
  expect(screen.getAllByText('Review uploaded documents')).toHaveLength(2);
  await userEvent.click(screen.getAllByRole('button',{name:'Open student Ama Example'})[0]);
  expect(screen.getByLabelText('Current location')).toHaveTextContent('/admin/students/one?tab=documents');
 });
 it('opens the dashboard document-review deep link with the matching queue selected',async()=>{
  api.read.mockResolvedValue({data:[student('one','Review Example',{documents:[{id:'doc',document_type:'passport',admin_review_status:'awaiting_admin_review'}]}),student('two','Other Example')],error:null});
  show('/admin/students?view=review');await screen.findAllByText('Review Example');
  expect(screen.queryByText('Other Example')).not.toBeInTheDocument();
  expect(screen.getByRole('combobox',{name:'Student queue'})).toHaveTextContent('Documents to review');
 });
 it('searches by reference or name, clears filters and defers duplicate checking',async()=>{
  api.read.mockResolvedValue({data:[student('one','Amá Example'),student('two','Kojo Example')],error:null});show();await screen.findAllByText('Amá Example');
  expect(screen.queryByText('Duplicate check loaded')).not.toBeInTheDocument();
  await userEvent.type(screen.getByRole('textbox',{name:'Search students'}),'Ama');expect(screen.queryByText('Kojo Example')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Clear filters'}));expect(screen.getAllByText('Kojo Example')).toHaveLength(2);
  await userEvent.click(screen.getByRole('button',{name:'Check duplicate records'}));expect(screen.getByText('Duplicate check loaded')).toBeInTheDocument();
 });
 it('shows a retryable error rather than a false empty list',async()=>{
  api.read.mockResolvedValue({data:null,error:new Error('offline')});show();expect(await screen.findByRole('alert')).toHaveTextContent('Students could not be loaded');
  expect(screen.queryByText('No students yet. Registered students will appear here.')).not.toBeInTheDocument();
  api.read.mockResolvedValue({data:[student()],error:null});await userEvent.click(screen.getByRole('button',{name:'Refresh students'}));expect((await screen.findAllByText('Ama Example'))[0]).toBeInTheDocument();
 });
 it('fetches beyond the server page limit and keeps the visible page to 20 students',async()=>{
  api.read.mockResolvedValueOnce({data:Array.from({length:500},(_,i)=>student(String(i),`Student ${i}`)),error:null}).mockResolvedValueOnce({data:[student('last','Last Example')],error:null});
  show();await waitFor(()=>expect(screen.getAllByRole('button',{name:/Open student /})).toHaveLength(40));
  expect(api.read).toHaveBeenNthCalledWith(1,0,499);expect(api.read).toHaveBeenNthCalledWith(2,500,999);
  await userEvent.type(screen.getByRole('textbox',{name:'Search students'}),'Last Example');expect((await screen.findAllByText('Last Example'))[0]).toBeInTheDocument();
 });
 it('does not claim an archive succeeded when no row was updated',async()=>{
  api.read.mockResolvedValue({data:[student()],error:null});api.write.mockResolvedValue({data:null,error:null});show();await screen.findAllByText('Ama Example');
  await userEvent.click(screen.getAllByRole('button',{name:'Actions for Ama Example'})[0]);await userEvent.click(screen.getByRole('menuitem',{name:'Archive'}));
  await userEvent.click(screen.getByRole('button',{name:'Archive student'}));
  await waitFor(()=>expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({variant:'destructive',title:'Change could not be saved'})));
  expect(api.toast).not.toHaveBeenCalledWith({title:'Student archived'});expect(screen.getByRole('alertdialog')).toBeInTheDocument();
 });
});
