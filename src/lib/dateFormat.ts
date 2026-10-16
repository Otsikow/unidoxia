import { format, isValid, parseISO } from 'date-fns';
import { enGB } from 'date-fns/locale';

type DateValue = Date | string | number | null | undefined;

function formatDate(value: DateValue, pattern: string): string {
  if (value == null || value === '') return 'Not set';
  const date = typeof value === 'string' ? parseISO(value) : new Date(value);
  return isValid(date) ? format(date, pattern, { locale: enGB }) : 'Not set';
}

export const formatUkDate = (value: DateValue): string => formatDate(value, 'd MMM yyyy');
export const formatUkTime = (value: DateValue): string => formatDate(value, 'HH:mm');
export const formatUkDateTime = (value: DateValue): string => formatDate(value, 'd MMM yyyy, HH:mm');
