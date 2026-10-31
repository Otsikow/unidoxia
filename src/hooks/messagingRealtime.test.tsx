import { StrictMode } from 'react';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useMessages } from './useMessages';
import { useAgentMessages } from './useAgentMessages';
import { usePresence } from './usePresence';
import StaffMessages from '@/pages/dashboard/StaffMessages';

const fake = vi.hoisted(() => ({
  channels: new Map<string, any>(), channel: vi.fn(), remove: vi.fn(), reads: vi.fn(),
  user: { id: 'admin', email: 'admin@example.test' },
  profile: { id: 'admin', full_name: 'Test admin', email: 'admin@example.test', role: 'admin', tenant_id: 'tenant' },
}));
vi.mock('./useAuth', () => ({ useAuth: () => ({ user: fake.user, profile: fake.profile }) }));
vi.mock('./use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    channel: (topic: string) => fake.channel(topic),
    removeChannel: (channel: unknown) => fake.remove(channel),
    from: (table: string) => {
      const chain: any = {
        select: () => chain, is: () => chain, eq: () => chain, in: () => chain, order: () => chain,
        limit: () => chain, upsert: () => chain, update: () => chain,
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve(fake.reads(table)).then(resolve, reject),
      };
      return chain;
    },
  },
}));
vi.mock('@/components/layout/DashboardLayout', () => ({ DashboardLayout: ({children}: {children: React.ReactNode}) => <div>{children}</div> }));
vi.mock('@/components/BackButton', () => ({default: () => null}));
vi.mock('@/components/ai/AIChatbot', () => ({default: () => null}));
vi.mock('@/components/staff/StaffMessagesTable', () => ({default: () => null}));
vi.mock('@/components/messages/MessagesDashboard', () => ({default: () => null}));

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn();
  vi.clearAllMocks();
  fake.channels.clear();
  localStorage.clear();
  fake.remove.mockResolvedValue('ok');
  fake.reads.mockImplementation((table: string) => ({data: table === 'conversation_participants' ? [{conversation_id:'conversation',user_id:'admin'}] : table === 'conversations' ? [{id:'conversation',title:'Test conversation',created_at:'2026-10-31T10:00:00Z'}] : table === 'profiles' ? [fake.profile] : [], error:null}));
  // Model the SDK's topic reuse and asynchronous channel removal.
  fake.channel.mockImplementation((topic: string) => {
    if (fake.channels.has(topic)) return fake.channels.get(topic);
    const channel: any = { topic, subscribed: false, callback: undefined,
      on: vi.fn((_type, _filter, callback) => {
        if (channel.subscribed) throw new Error('cannot add callbacks after subscribe');
        channel.callback = callback;
        return channel;
      }),
      subscribe: vi.fn(() => {channel.subscribed = true; return channel;}),
    };
    fake.channels.set(topic,channel);
    return channel;
  });
});
afterEach(cleanup);

function Consumers() {
  const partner = useAgentMessages();
  const internal = useMessages();
  usePresence();
  usePresence();
  return <div>{partner.loading || internal.loading ? 'Loading' : 'Chats ready'}</div>;
}

describe('messaging live-update ownership', () => {
  it('mounts partner/internal chats and multiple presence listeners together', async () => {
    const view = render(<Consumers />);
    await screen.findByText('Chats ready');
    expect(fake.channels.size).toBe(4);
    const owned = [...fake.channels.values()];
    view.rerender(<Consumers />);
    expect(fake.channel).toHaveBeenCalledTimes(4);
    view.unmount();
    expect(fake.remove).toHaveBeenCalledTimes(4);
    for (const channel of owned) expect(fake.remove).toHaveBeenCalledWith(channel);
  });

  it('survives StrictMode replay and rapid remount while old topics still exist', async () => {
    const view = render(<StrictMode><Consumers /></StrictMode>);
    await screen.findByText('Chats ready');
    expect(fake.channels.size).toBe(8);
    view.unmount();
    render(<Consumers />);
    await screen.findByText('Chats ready');
    expect(fake.channels.size).toBe(12);
  });

  it('keeps authorised conversation reads usable if realtime setup fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fake.channel.mockImplementation(() => {throw new Error('transport unavailable');});
    const hook = renderHook(() => useMessages());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.conversations[0].id).toBe('conversation');
    expect(hook.result.current.error).toBeNull();
    render(<Consumers />);
    await screen.findByText('Chats ready');
    warn.mockRestore();
  });

  it('merges a participating conversation event and ignores late callbacks after unmount', async () => {
    const hook = renderHook(() => useMessages());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    await act(async () => {await hook.result.current.setCurrentConversation('conversation');});
    const channel = [...fake.channels.values()][0];
    const event = {new:{id:'message',conversation_id:'conversation',sender_id:'admin',content:'Test event',created_at:'2026-10-31T11:00:00Z',message_type:'text'}};
    await act(async () => {await channel.callback(event);});
    expect(hook.result.current.messages[0].content).toBe('Test event');
    await act(async () => {await channel.callback(event);});
    expect(hook.result.current.messages).toHaveLength(1);
    hook.unmount();
    fake.reads.mockClear();
    await channel.callback(event);
    expect(fake.reads).not.toHaveBeenCalled();
  });

  it('drops an in-flight message event if its consumer unmounts during sender lookup', async () => {
    const hook = renderHook(() => useMessages());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    const channel = [...fake.channels.values()][0];
    let finish!: (value: unknown) => void;
    fake.reads.mockImplementation((table: string) => table === 'profiles' ? new Promise(resolve => {finish = resolve;}) : {data:[],error:null});
    const pending = channel.callback({new:{conversation_id:'conversation',sender_id:'admin'}});
    await waitFor(() => expect(finish).toBeDefined());
    hook.unmount();
    fake.reads.mockClear();
    await act(async () => {finish({data:[fake.profile],error:null}); await pending;});
    expect(fake.reads).not.toHaveBeenCalled();
  });

  it('updates presence and ignores events after cleanup', async () => {
    const hook = renderHook(() => usePresence());
    await act(async () => {});
    const channel = [...fake.channels.values()][0];
    await act(async () => {channel.callback({eventType:'INSERT',new:{user_id:'contact',status:'online'}});});
    expect(hook.result.current.isUserOnline('contact')).toBe(true);
    await act(async () => {channel.callback({eventType:'DELETE',old:{user_id:'contact'}});});
    expect(hook.result.current.isUserOnline('contact')).toBe(false);
    hook.unmount();
    expect(() => channel.callback({eventType:'INSERT',new:{user_id:'contact',status:'online'}})).not.toThrow();
    expect(fake.remove).toHaveBeenCalledWith(channel);
  });

  it('renders the actual Messages page with both chat hooks and can switch tabs', async () => {
    const user = userEvent.setup();
    render(<StaffMessages />);
    await screen.findByRole('heading', {name:'Messaging & Insights'});
    expect(fake.channels.size).toBe(3);
    await act(async () => {await user.click(screen.getByRole('tab',{name:'Internal Chats'}));});
    expect(screen.getByRole('tab',{name:'Internal Chats'})).toHaveAttribute('data-state','active');
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(fake.channel).toHaveBeenCalledTimes(3);
  });
});
