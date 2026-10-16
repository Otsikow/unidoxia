import { describe, expect, it } from 'vitest';
import { getAcademicYearOptions, getStudentAcademicYearOptions, getIntakeOptionsForYear } from './intakeOptions';

const now = new Date(2026, 9, 17);

describe('student intake options', () => {
  it('hides years without upcoming intakes', () => {
    expect(getStudentAcademicYearOptions(now).map(({ startYear }) => startYear))
      .toEqual([2027, 2028, 2029, 2030, 2031]);
    expect(getStudentAcademicYearOptions(new Date(2026, 0, 31))[0].startYear).toBe(2026);
    expect(getStudentAcademicYearOptions(now, [{ month: 11, label: 'November' }])[0].startYear).toBe(2026);
  });

  it('preserves saved years and past intake months', () => {
    expect(getStudentAcademicYearOptions(now, undefined, 2019)[0].startYear).toBe(2019);
    expect(getStudentAcademicYearOptions(now, undefined, 2026)[0].startYear).toBe(2026);
    expect(getStudentAcademicYearOptions(now, undefined, 2035).at(-1)?.startYear).toBe(2035);
    expect(getIntakeOptionsForYear(2019, now, undefined, 2)[0].month).toBe(2);
  });

  it('uses sentence case labels and preserves admin year availability', () => {
    expect(getAcademicYearOptions(now)[0]).toEqual({ startYear: 2025, label: '2025/2026 academic year' });
    expect(getIntakeOptionsForYear(2027, now)[0].label).toBe('January 2027 intake');
  });
});
