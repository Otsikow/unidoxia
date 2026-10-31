import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RESIDENCE_COUNTRIES } from '@/lib/residenceCountries';
import { cn } from '@/lib/utils';

interface NationalitySelectProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
}

export function NationalitySelect({ id, value, onValueChange }: NationalitySelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-required="true"
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || 'Select your nationality'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Choose nationality country" className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command label="Search nationality countries">
          <CommandInput placeholder="Search countries…" aria-label="Search nationality countries" />
          <CommandList className="max-h-64">
            <CommandEmpty>No countries found. Try another search.</CommandEmpty>
            <CommandGroup heading="All countries">
              {RESIDENCE_COUNTRIES.map((country) => (
                <CommandItem
                  key={country}
                  value={country}
                  onSelect={() => {
                    onValueChange(country);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === country ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                  {country}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
