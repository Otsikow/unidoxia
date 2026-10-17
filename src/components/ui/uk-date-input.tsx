import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { formatNumericDate, isDateWithinBounds, parseNumericDate } from '@/lib/applicationDates';

type Props = Omit<React.ComponentProps<typeof Input>, 'type' | 'value' | 'onChange' | 'min' | 'max'> & {
  value: string;
  onValueChange: (value: string) => void;
  bounds?: { min: string; max: string };
};

/** Explicit UK text entry, while keeping valid dates in ISO format for storage. */
export function UKDateInput({ value, onValueChange, bounds, ...props }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const message = !value || isDateWithinBounds(value, bounds) ? '' : bounds
      ? `Enter a valid date between ${formatNumericDate(bounds.min)} and ${formatNumericDate(bounds.max)} (DD/MM/YYYY).`
      : 'Enter a valid date as DD/MM/YYYY.';
    ref.current?.setCustomValidity(message);
  }, [value, bounds]);
  return <Input {...props} ref={ref} type="text" inputMode="numeric" placeholder="DD/MM/YYYY"
    value={formatNumericDate(value)} onChange={(event) => onValueChange(parseNumericDate(event.target.value))} />;
}
