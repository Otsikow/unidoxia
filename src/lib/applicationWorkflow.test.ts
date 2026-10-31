import { describe, expect, it } from 'vitest';
import { applicationNeedsAttention, followUpDeadline, isFollowUpOverdue, londonDate, openFollowUps, type ApplicationFollowUp } from './applicationWorkflow';
const task = (values: Partial<ApplicationFollowUp> = {}): ApplicationFollowUp => ({ id: 'task', title: 'Check statement', status: 'open', due_at: null, assignee_id: null, ...values });
describe('application attention and UK follow-up dates', () => {
  it('uses UK calendar days across summer midnight and daylight-saving changes', () => {
    expect(londonDate('2027-06-01T23:30:00Z')).toBe('2027-06-02');
    expect(followUpDeadline('2027-06-02', '2026-10-31')).toBe('2027-06-02T22:59:59.999Z');
    expect(followUpDeadline('2027-01-02', '2026-10-31')).toBe('2027-01-02T23:59:59.999Z');
    expect(followUpDeadline('', '2026-10-31')).toBeNull();
  });
  it('rejects Sundays, invalid dates and past dates', () => {
    expect(() => followUpDeadline('2026-11-01', '2026-10-31')).toThrow('Monday to Saturday');
    expect(() => followUpDeadline('2027-02-30', '2026-10-31')).toThrow('valid');
    expect(() => followUpDeadline('2026-10-30', '2026-10-31')).toThrow('today or');
  });
  it('does not mark tasks due today or completed tasks overdue', () => {
    expect(isFollowUpOverdue(task({ due_at: '2026-10-31T23:59:59Z' }), '2026-10-31')).toBe(false);
    expect(isFollowUpOverdue(task({ due_at: '2026-10-30T23:59:59Z' }), '2026-10-31')).toBe(true);
    expect(isFollowUpOverdue(task({ status: 'done', due_at: '2026-10-30' }), '2026-10-31')).toBe(false);
  });
  it('prioritises blocked work and excludes completed work', () => {
    expect(openFollowUps([task({ id: 'done', status: 'done' }), task({ id: 'dated', due_at: '2026-11-02' }), task({ id: 'blocked', status: 'blocked' }), task()]).map(t => t.id)).toEqual(['blocked', 'dated', 'task']);
  });
  it('flags unfinished documents and overdue work, while leaving closed applications out', () => {
    const reviewed = { status: 'screening', documents: [{ verified: true }], tasks: [] };
    expect(applicationNeedsAttention(reviewed, '2026-10-31')).toBe(false);
    expect(applicationNeedsAttention({ ...reviewed, tasks: [task({ status: 'blocked' })] })).toBe(true);
    expect(applicationNeedsAttention({ ...reviewed, documents: [{ verified: false }] })).toBe(true);
    expect(applicationNeedsAttention({ ...reviewed, status: 'submitted' })).toBe(true);
    expect(applicationNeedsAttention({ status: 'enrolled', documents: [] })).toBe(false);
  });
});
