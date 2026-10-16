// Dynamic Academic year + Intake calculation utilities.
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
  label: string; // e.g. "2026/2027 Academic year"
}

export interface IntakeOption {
  year: number;
  month: number; // 1-12
  label: string; // e.g. "January 2026 Intake"
  startDate: Date;
}

/** Calendar years from last year through five years ahead, plus a saved value. */
export function getAcademicYearOptions(
  now: Date = new Date(),
  _intakeMonths: IntakeMonthOption[] = DEFAULT_INTAKE_MONTHS,
  savedYear?: number,
): AcademicYearOption[] {
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 7 }, (_, index) => currentYear - 1 + index);
  if (savedYear && Number.isInteger(savedYear) && !years.includes(savedYear)) years.push(savedYear);
  return years.sort((a, b) => a - b).map((year) => ({
    startYear: year, label: `${year}/${year + 1} Academic year`,
  }));
}

/**
 * Returns the upcoming intake options for a given academic year.
 * Past intakes (those whose start month is before the current month) are filtered out.
 */
export function getIntakeOptionsForYear(
  startYear: number,
  now: Date = new Date(),
  intakeMonths: IntakeMonthOption[] = DEFAULT_INTAKE_MONTHS,
  savedMonth?: number,
): IntakeOption[] {
  const today = startOfMonth(now);
  const months = [...intakeMonths];
  if (savedMonth && savedMonth >= 1 && savedMonth <= 12 && !months.some((option) => option.month === savedMonth)) {
    months.push({ month: savedMonth, label: MONTH_NAMES[savedMonth - 1] });
  }
  return months
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
    .filter((opt) => opt.startDate >= today || opt.month === savedMonth);
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
