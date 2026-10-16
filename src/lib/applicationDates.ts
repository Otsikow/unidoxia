import { format, isValid, parse, subYears } from 'date-fns';

export function formatNumericDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(date) ? format(date, 'dd/MM/yyyy') : value;
}

export function parseNumericDate(value: string): string {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  const date = parse(value, 'dd/MM/yyyy', new Date());
  return isValid(date) && format(date, 'dd/MM/yyyy') === value ? format(date, 'yyyy-MM-dd') : value;
}

export function applicationDateBounds(now = new Date()) {
  const year = now.getFullYear();
  return {
    birth: { min: '1950-01-01', max: `${year - 15}-12-31` },
    passportIssue: { min: format(subYears(now, 15), 'yyyy-MM-dd'), max: format(now, 'yyyy-MM-dd') },
    secondarySchool: { min: `${year - 40}-01-01`, max: `${year + 1}-12-31` },
  };
}

export function isDateWithinBounds(value: string, bounds?: { min: string; max: string }) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && formatNumericDate(value) !== value
    && (!bounds || (value >= bounds.min && value <= bounds.max));
}
