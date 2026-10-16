import { describe, expect, it } from 'vitest';
import { formatUkDate, formatUkTime, formatUkDateTime } from './dateFormat';

describe('UK display dates', () => {
  it('formats dates and 24-hour times consistently', () => {
    const date = new Date(2027, 0, 5, 14, 9);
    expect(formatUkDate(date)).toBe('5 Jan 2027');
    expect(formatUkTime(date)).toBe('14:09');
    expect(formatUkDateTime(date)).toBe('5 Jan 2027, 14:09');
    expect(formatUkDate('2027-01-05')).toBe('5 Jan 2027');
    expect(formatUkDate(date.getTime())).toBe('5 Jan 2027');
    expect(formatUkTime(new Date(2027, 0, 5, 0, 4))).toBe('00:04');
  });

  it.each([null, undefined, '', 'invalid', '2027-02-30', '2027-13-01', new Date(NaN), NaN, Infinity])(
    'returns Not set for missing or invalid values: %s', (value) => {
      expect(formatUkDate(value)).toBe('Not set');
      expect(formatUkTime(value)).toBe('Not set');
      expect(formatUkDateTime(value)).toBe('Not set');
    },
  );
});
