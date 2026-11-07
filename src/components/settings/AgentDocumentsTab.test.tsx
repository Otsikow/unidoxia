import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({upload:vi.fn(),load:vi.fn()}));
vi.mock('@/lib/agentDocuments',()=>({uploadAgentCertificate:mocks.upload,getAgentCertificateUrl:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{const chain={select:()=>chain,eq:()=>chain,maybeSingle:mocks.load};return chain;}}}));
import AgentDocumentsTab from './AgentDocumentsTab';
beforeEach(()=>{vi.clearAllMocks(); mocks.load.mockResolvedValue({data:null,error:null});});
function setup(){const client=new QueryClient({defaultOptions:{queries:{retry:false}}});return render(<QueryClientProvider client={client}><AgentDocumentsTab profile={{id:'owner',tenant_id:'tenant'}} /></QueryClientProvider>);}
it('keeps the selected file after failure and permits retry, then clears on success',async()=>{
 mocks.upload.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce('agent-documents/owner/file.pdf');setup();
 await waitFor(()=>expect(mocks.load).toHaveBeenCalled());
 const file=new File(['pdf'],'agency.pdf',{type:'application/pdf'});
 fireEvent.change(screen.getByLabelText('Registration or accreditation certificate'),{target:{files:[file]}});
 await waitFor(()=>expect((screen.getByRole('button',{name:'Upload certificate'}) as HTMLButtonElement).disabled).toBe(false));
 fireEvent.click(screen.getByRole('button',{name:'Upload certificate'}));
 await screen.findByText('Network unavailable');expect(screen.getByText('Selected: agency.pdf')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Upload certificate'}));
 await screen.findByText('Certificate uploaded successfully. UniDoxia will review it.');
 expect(screen.queryByText('Selected: agency.pdf')).toBeNull();expect(mocks.upload).toHaveBeenCalledTimes(2);
});
it('shows a load error and retry instead of falsely reporting no certificate',async()=>{
 mocks.load.mockResolvedValueOnce({data:null,error:new Error('Denied')});setup();
 await screen.findByRole('alert'); expect(screen.getByRole('button',{name:'Retry'})).toBeTruthy();
});
