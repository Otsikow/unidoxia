// Dynamic Academic Year + Intake calculation utilities.
// Keeps the application form's "Preferred Study Year and Intake" section
// always up to date without manual admin updates.

export interface IntakeMonthOption {
  month: number; // 1-12
  label: string; // e.g. "January"
}

// Default intake months. Admins can later override this list (see overrideMonths).
export const DEFAULT_INTAKE_MONTHS: IntakeMonthOption[] = [
  { month: 1, label: "January" },
  { month: 5, label: "May" },
  { month: 9, label: "September" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface AcademicYearOption {
  /** First calendar year of the academic year, e.g. 2026 for "2026/2027". */
  startYear: number;
  label: string; // e.g. "2026/2027 Academic Year"
}

export interface IntakeOption {
  year: number;
  month: number; // 1-12
  label: string; // e.g. "January 2026 Intake"
  startDate: Date;
}

/**
 * Returns the current and next academic year, calculated from today's date.
 * Academic year YYYY/(YYYY+1) groups intakes occurring in calendar year YYYY.
 * The current academic year is hidden once all of its intakes have passed.
 */
export function getAcademicYearOptions(
  now: Date = new Date(),
  intakeMonths: IntakeMonthOption[] = DEFAULT_INTAKE_MONTHS,
): AcademicYearOption[] {
  const currentYear = now.getFullYear();
  const sortedMonths = [...intakeMonths].sort((a, b) => a.month - b.month);
  const lastMonth = sortedMonths[sortedMonths.length - 1]?.month ?? 12;

  // If every intake in the current calendar year has already passed,
  // roll the "current" academic year forward by one.
  const lastIntakeOfYear = new Date(currentYear, lastMonth - 1, 1);
  const startYear = lastIntakeOfYear < startOfMonth(now) ? currentYear + 1 : currentYear;

  return [0, 1].map((offset) => {
    const y = startYear + offset;
    return { startYear: y, label: `${y}/${y + 1} Academic Year` };
  });
}

/**
 * Returns the upcoming intake options for a given academic year.
 * Past intakes (those whose start month is before the current month) are filtered out.
 */
export function getIntakeOptionsForYear(
  startYear: number,
  now: Date = new Date(),
  intakeMonths: IntakeMonthOption[] = DEFAULT_INTAKE_MONTHS,
): IntakeOption[] {
  const today = startOfMonth(now);
  return [...intakeMonths]
    .sort((a, b) => a.month - b.month)
    .map((m) => {
      const startDate = new Date(startYear, m.month - 1, 1);
      return {
        year: startYear,
        month: m.month,
        startDate,
        label: `${MONTH_NAMES[m.month - 1]} ${startYear} Intake`,
      };
    })
    .filter((opt) => opt.startDate >= today);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function formatIntakeLabel(year: number, month: number): string {
  if (!year || !month) return "";
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatAcademicYearLabel(year: number, month: number): string {
  if (!year) return "";
  // Intakes in calendar year Y belong to academic year Y/(Y+1) per UniDoxia convention.
  return `${year}/${year + 1}`;
}
