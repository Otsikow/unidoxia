import { describe, expect, it } from 'vitest';
import { WELCOME, HANDOVER, DISCLOSURE, LINK_FAILURE, MENU, isOpen, parseOpeningHours, runWhatsAppFlow as flow, type OpeningHours, type FlowState } from '../../supabase/functions/_shared/whatsappFlow';
const hours: OpeningHours = { days: [1,2,3,4,5], open: '09:00', close: '17:30' };
const introduced = { introduced: true };
describe('WhatsApp student flow', () => {
  it('greets with menu, automation disclosure, privacy and sensitive-data warning', () => {
    const r = flow({ text: 'Hi' });
    expect(r.replies[0]).toBe(WELCOME + '\n' + DISCLOSURE + '\n' + MENU);
    expect(r.replies[0]).toContain("Please don't send passport numbers, card details, passwords or documents here");
    expect(r.replies[0]).not.toContain('\u2014');
  });
  it('does not repeat the disclosure after introduction', () => expect(flow({ text: 'menu', state: introduced }).replies).toEqual([WELCOME + '\n' + MENU]));
  it('asks subject, level and optional country, then requests a database lookup', () => {
    let state: FlowState = flow({ text: '1', state: introduced }).state;
    expect(state.step).toBe('subject');
    state = flow({ text: 'Computing', state }).state;
    expect(state.step).toBe('level');
    state = flow({ text: 'postgraduate', state }).state;
    expect(state.step).toBe('country');
    expect(flow({ text: 'ANY', state }).lookup).toEqual({ type: 'courses', subject: 'Computing', level: 'postgraduate', country: undefined });
    expect(flow({ text: 'Canada', state }).lookup).toMatchObject({ country: 'Canada' });
  });
  it('formats at most five courses and uses real course detail routes without fees', () => {
    const r = flow({ text: 'ANY', state: { ...introduced, step: 'country' }, courses: Array.from({ length: 8 }, (_, i) => ({ id: `course-${i}`, name: `Computing ${i}`, university: 'Example University', country: 'Canada', level: 'Postgraduate' })) });
    expect(r.replies[0]).toContain('https://unidoxia.com/courses/course-0');
    expect(r.replies[0]).toContain('Example University, Canada');
    expect(r.replies[0]).not.toContain('Computing 5');
    expect(r.replies[0]).not.toMatch(/fee|deadline|visa/i);
    expect(r.state.step).toBeUndefined();
  });
  it('reports no matches without inventing a course', () => expect(flow({ text: 'ANY', state: { ...introduced, step: 'country' }, courses: [] }).replies[0]).toContain('No matching published courses'));
  it('lists actual destinations once with the search link', () => {
    expect(flow({ text: '2', state: introduced }).lookup).toEqual({ type: 'countries' });
    expect(flow({ text: '2', state: introduced, countries: ['Canada','Ghana','Canada'] }).replies[0]).toBe('Explore destinations with published universities:\nCanada\nGhana\nSearch: https://unidoxia.com/search');
    expect(flow({ text: '2', countries: [] }).replies[0]).toContain('No published destinations');
  });
  it('does not disclose application status to an unlinked contact', () => {
    const r = flow({ text: '3', state: introduced, applications: [{ university: 'Secret', programme: 'Secret', status: 'submitted', changedAt: null }] });
    expect(r.replies[0]).toContain('link your account first'); expect(r.replies[0]).not.toContain('Secret'); expect(r.lookup).toBeUndefined();
  });
  it('formats only the linked high-level summary and an honest date', () => {
    expect(flow({ text: '3', linked: true }).lookup).toEqual({ type: 'status' });
    const r = flow({ text: '3', linked: true, state: introduced, applications: [{ university: 'Example', programme: 'MSc Computing', status: 'conditional_offer', changedAt: '2026-10-16T14:00:00Z' }, { university: 'Example 2', programme: 'BA', status: 'draft', changedAt: null }] });
    expect(r.replies[0]).toBe('Example\nMSc Computing\nConditional offer\nLast updated: 16/10/2026\n\nExample 2\nBA\nDraft\nLast updated: date unavailable');
    expect(flow({ text: '3', linked: true, applications: [] }).replies[0]).toContain('No applications');
  });
  it('requests verification for a correctly formatted LINK and confirms success without opting in', () => {
    expect(flow({ text: 'LINK 123456' }).linkCode).toBe('123456');
    const r = flow({ text: 'LINK 123456', linkResult: true, state: introduced });
    expect(r.replies[0]).toContain('is linked'); expect(r.consent).toBeUndefined();
  });
  it.each(['LINK','LINK 12','LINK abcdef','LINK 1234567','LINK 123456 details'])('malformed code %s gives the same generic failure', text => {
    expect(flow({ text, state: introduced }).replies).toEqual([LINK_FAILURE]);
  });
  it.each(['missing','expired','used','wrong number','attempt limit','no student'])('%s code validation gives the same generic failure', () => {
    expect(flow({ text: 'LINK 123456', linkResult: false, state: introduced }).replies).toEqual([LINK_FAILURE]);
  });
  it.each(['4','adviser','advisor','agent','human','person','someone','manager','call me','speak to','complain','complaining','complaint','visa refusal','my visa was refused','visa denied','refund','eligibility dispute','legal matter'])('hands over %s', text => expect(flow({ text }).handover).toBeTruthy());
  it('uses only configured opening hours with friendly London times', () => {
    expect(flow({ text: '4', state: introduced }).replies).toEqual([HANDOVER]);
    expect(flow({ text: '4', state: introduced, hours, now: new Date('2026-10-16T09:00:00Z') }).replies).toEqual([HANDOVER]);
    expect(flow({ text: '4', state: introduced, hours, now: new Date('2026-10-18T10:00:00Z') }).replies).toEqual(["Thanks. I've passed this to the UniDoxia admissions team. We're closed now, so an adviser will reply on Monday 19 October from 9am UK time."]);
    expect(flow({ text: '4', state: introduced, hours: { ...hours, open: '09:30' }, now: new Date('2026-10-18T10:00:00Z') }).replies[0]).toContain('from 9:30am UK time.');
  });
  it('respects London daylight saving and has no fallback schedule', () => {
    expect(isOpen(new Date('2026-07-06T08:00:00Z'), hours)).toBe(true);
    expect(isOpen(new Date('2026-12-07T08:00:00Z'), hours)).toBe(false);
    expect(parseOpeningHours('{"days":[6],"open":"10:00","close":"12:00"}')).toEqual({ days: [6], open: '10:00', close: '12:00' });
    for (const raw of [undefined,'bad','{}','{"days":[0],"open":"09:00","close":"17:00"}','{"days":[1],"open":"29:00","close":"30:00"}']) expect(parseOpeningHours(raw)).toBeUndefined();
  });
  it.each(['Hi!', 'Hello there', 'Good morning', 'hiya, can you help?', 'An initial enquiry'])('welcomes first contact %s without a correction', text => {
    const reply = flow({ text }).replies.join('\n');
    expect(reply).toBe(WELCOME + '\n' + DISCLOSURE + '\n' + MENU);
  });
  it.each(['subject','level','country'] as const)('global commands override %s', step => {
    expect(flow({ text: 'courses', state: { ...introduced, step } }).state.step).toBe('subject');
    expect(flow({ text: 'status', state: { ...introduced, step } }).replies[0]).toContain('link your account');
    expect(flow({ text: 'menu', state: { ...introduced, step } }).state.step).toBeUndefined();
  });
  it('uses letters for the five study levels and reserves 4 for handover', () => {
    expect(flow({ text: 'Computing', state: { ...introduced, step: 'subject' } }).replies[0]).toContain('D Diploma');
    expect(flow({ text: 'd', state: { ...introduced, step: 'level' } }).state.level).toBe('diploma');
    expect(flow({ text: '4', state: { ...introduced, step: 'level' } }).handover).toBeTruthy();
  });
  it('hands a Zoe reference straight to the team', () => {
    const r = flow({ text: 'Hi UniDoxia, I was chatting with Zoe. Ref ZOE-0123456789abcdef0123' });
    expect(r.zoeRef).toBe('0123456789abcdef0123'); expect(r.handover).toBe('Zoe handover');
  });
  it('confirms STOP once, suppresses further responses and allows START', () => {
    expect(flow({ text: 'STOP' }).consent).toBe('out');
    expect(flow({ text: 'UNSUBSCRIBE' }).consent).toBe('out');
    for (const text of ['STOP','UNSUBSCRIBE','Hi','4','LINK 123456']) expect(flow({ text, optedOut: true }).replies).toEqual([]);
    const r = flow({ text: 'START', optedOut: true }); expect(r.consent).toBe('in'); expect(r.replies[0]).toContain(MENU);
  });
  it('keeps START in human mode clear that the team will continue', () => {
    const r = flow({ text: 'START', mode: 'human', optedOut: true });
    expect(r.replies[0]).toContain('The UniDoxia team will reply here.');
    expect(r.replies[0]).not.toContain(MENU);
  });
  it('hands over non-text without requesting documents over WhatsApp', () => {
    const r = flow({ text: null }); expect(r.handover).toBe('Non-text message');
    expect(r.replies.join('\n')).toContain('Please upload documents securely');
    expect(r.replies.join('\n')).toContain('https://unidoxia.com/student/documents');
  });
  it('hands over after two unknown messages', () => {
    const r = flow({ text: 'unmatched', state: introduced }); expect(r.handover).toBeUndefined();
    expect(flow({ text: 'still unmatched', state: r.state }).handover).toBe('Two messages not understood');
  });
});
