import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,waitFor,fireEvent,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import Checkout from './Checkout';
const api=vi.hoisted(()=>({start:vi.fn(),toast:vi.fn()}));
vi.mock('@/lib/studentCheckout',async()=>({...await vi.importActual<typeof import('@/lib/studentCheckout')>('@/lib/studentCheckout'),startStudentCheckout:api.start}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'synthetic-student'},profile:{}})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:api.toast})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
function Location(){return <output data-testid="location">{useLocation().pathname}</output>;}
function open(plan='agent_supported'){return render(<MemoryRouter initialEntries={[`/student/checkout?plan=${plan}`]}><Location/><Routes><Route path="/student/checkout" element={<Checkout/>}/><Route path="/pricing" element={<p>Current pricing</p>}/></Routes></MemoryRouter>);}
beforeEach(()=>{vi.resetAllMocks();api.start.mockRejectedValue(new Error('Payment provider unavailable'));});
describe('checkout failure recovery',()=>{
 it('keeps a failed payment retryable without claiming success or plan activation',async()=>{
  open();const user=userEvent.setup();await user.click(screen.getByRole('checkbox'));await user.click(screen.getByRole('button',{name:/Pay \$200 Securely/}));
  expect(await screen.findByText(/Your plan has not changed/)).toBeInTheDocument();
  expect(screen.getByTestId('location')).toHaveTextContent('/student/checkout');
  expect(screen.getByRole('button',{name:/Pay \$200 Securely/})).toBeEnabled();
  expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({title:'Payment unavailable'}));
  expect(api.toast).not.toHaveBeenCalledWith(expect.objectContaining({title:'Payment Successful!'}));
  await user.click(screen.getByRole('button',{name:/Pay \$200 Securely/}));await waitFor(()=>expect(api.start).toHaveBeenCalledTimes(2));
 });
 it('starts only one checkout while an earlier request is pending',async()=>{
  let reject:(error:Error)=>void=()=>{};api.start.mockImplementation(()=>new Promise((_,r)=>{reject=r;}));
  open();await userEvent.click(screen.getByRole('checkbox'));const button=screen.getByRole('button',{name:/Pay \$200 Securely/});
  act(()=>{fireEvent.click(button);fireEvent.click(button);});expect(api.start).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:/Processing/})).toBeDisabled();
  await act(async()=>reject(new Error('offline')));expect(screen.getByRole('button',{name:/Pay \$200 Securely/})).toBeEnabled();
 });
 it('takes an old retired-plan link back to current pricing without starting a session',async()=>{
  open('self_service');expect(await screen.findByText('Current pricing')).toBeInTheDocument();expect(api.start).not.toHaveBeenCalled();
 });
});
