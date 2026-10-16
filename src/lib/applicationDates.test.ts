import { describe, expect, it } from 'vitest';
import { applicationDateBounds, formatNumericDate, isDateWithinBounds, parseNumericDate } from './applicationDates';
import { getAcademicYearOptions, getIntakeOptionsForYear } from './intakeOptions';

const now = new Date(2026, 9, 16);

describe('UK application dates and year options', () => {
  it('round trips UK dates and rejects impossible or ambiguous input', () => {
    expect(formatNumericDate('2000-02-29')).toBe('29/02/2000');
    expect(parseNumericDate('29/02/2000')).toBe('2000-02-29');
    for (const invalid of ['29/02/2001', '31/04/2000', '12/31/2000', '1/2/2000']) {
      expect(isDateWithinBounds(parseNumericDate(invalid))).toBe(false);
    }
  });

  it('offers last year through five years ahead throughout the year', () => {
    for (const month of [0, 9, 11]) {
      expect(getAcademicYearOptions(new Date(2026, month, 1)).map((option) => option.startYear))
        .toEqual([2025, 2026, 2027, 2028, 2029, 2030, 2031]);
    }
    expect(getAcademicYearOptions(now, undefined, 2019).map((option) => option.startYear))
      .toEqual([2019, 2025, 2026, 2027, 2028, 2029, 2030, 2031]);
    expect(getAcademicYearOptions(now, undefined, 2035).at(-1)?.startYear).toBe(2035);
    expect(getAcademicYearOptions(now, undefined, 2026)).toHaveLength(7);
  });

  it('preserves a saved intake month even when past or outside the default months', () => {
    expect(getIntakeOptionsForYear(2019, now, undefined, 2).map((option) => option.month)).toEqual([2]);
    expect(getIntakeOptionsForYear(2026, now, undefined, 9).map((option) => option.month)).toEqual([9]);
  });

  it('includes date boundaries and excludes dates immediately outside', () => {
    const bounds = applicationDateBounds(now);
    for (const [range, before, after] of [
      [bounds.birth, '1949-12-31', '2012-01-01'],
      [bounds.passportIssue, '2011-10-15', '2026-10-17'],
      [bounds.secondarySchool, '1985-12-31', '2028-01-01'],
    ] as const) {
      expect(isDateWithinBounds(range.min, range)).toBe(true);
      expect(isDateWithinBounds(range.max, range)).toBe(true);
      expect(isDateWithinBounds(before, range)).toBe(false);
      expect(isDateWithinBounds(after, range)).toBe(false);
    }
  });
});
