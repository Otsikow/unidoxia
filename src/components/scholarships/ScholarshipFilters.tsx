import { useMemo, type ComponentType, type ReactNode } from "react";
import { Filter, Globe2, GraduationCap, DollarSign, CalendarDays, Sparkles, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ScholarshipSearchFilters, PublicApplicationStatus } from "@/types/scholarship";
import { PUBLIC_APPLICATION_STATUSES } from "@/types/scholarship";

interface ScholarshipFiltersProps {
  filters: ScholarshipSearchFilters;
  onFiltersChange: (filters: ScholarshipSearchFilters) => void;
  countryOptions: string[];
  levelOptions: string[];
  fundingTypeOptions: string[];
  fieldOptions: string[];
  eligibilityOptions: string[];
  className?: string;
}

const FilterPopover = ({
  label,
  icon: Icon,
  count,
  children,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  count?: number;
  children: ReactNode;
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start gap-2 min-w-[150px]">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
          {count ? (
            <Badge variant="secondary" className="ml-auto">
              {count}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {children}
      </PopoverContent>
    </Popover>
  );
};

const toggleValue = <T extends string>(current: T[], value: T): T[] => {
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
};

export const ScholarshipFilters = ({
  filters,
  onFiltersChange,
  countryOptions,
  levelOptions,
  fundingTypeOptions,
  fieldOptions,
  eligibilityOptions,
  className,
}: ScholarshipFiltersProps) => {
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.countries.length) count += 1;
    if (filters.levels.length) count += 1;
    if (filters.fundingTypes.length) count += 1;
    if (filters.fieldsOfStudy.length) count += 1;
    if (filters.eligibilityTags.length) count += 1;
    if (filters.applicationStatuses.length) count += 1;
    if (filters.deadline !== "all") count += 1;
    return count;
  }, [filters]);

  const updateFilters = (partial: Partial<ScholarshipSearchFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge variant="outline" className="gap-2">
        <Filter className="h-4 w-4" />
        Advanced Filters
        {activeCount ? <span className="text-primary">{activeCount}</span> : null}
      </Badge>

      <FilterPopover label="Country" icon={Globe2} count={filters.countries.length || undefined}>
        <Command>
          <CommandInput placeholder="Search countries..." />
          <CommandEmpty>No countries found.</CommandEmpty>
          <CommandGroup>
            {countryOptions.map((country) => (
              <CommandItem
                key={country}
                onSelect={() => updateFilters({ countries: toggleValue(filters.countries, country) })}
              >
                <Checkbox checked={filters.countries.includes(country)} className="mr-2" />
                {country}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </FilterPopover>

      <FilterPopover label="Level" icon={GraduationCap} count={filters.levels.length || undefined}>
        <Command>
          <CommandInput placeholder="Search levels..." />
          <CommandEmpty>No levels found.</CommandEmpty>
          <CommandGroup>
            {levelOptions.map((level) => (
              <CommandItem key={level} onSelect={() => updateFilters({ levels: toggleValue(filters.levels, level) })}>
                <Checkbox checked={filters.levels.includes(level)} className="mr-2" />
                {level}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </FilterPopover>

      <FilterPopover label="Funding" icon={DollarSign} count={filters.fundingTypes.length || undefined}>
        <Command>
          <CommandGroup>
            {fundingTypeOptions.map((type) => (
              <CommandItem
                key={type}
                onSelect={() => updateFilters({ fundingTypes: toggleValue(filters.fundingTypes, type) })}
              >
                <Checkbox checked={filters.fundingTypes.includes(type)} className="mr-2" />
                {type}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </FilterPopover>

      <FilterPopover label="Deadline" icon={CalendarDays} count={filters.deadline !== "all" ? 1 : undefined}>
        <div className="p-4 space-y-3">
          <RadioGroup value={filters.deadline} onValueChange={(value) => updateFilters({ deadline: value as ScholarshipSearchFilters["deadline"] })}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="deadline-all" />
              <Label htmlFor="deadline-all">Any deadline</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="upcoming" id="deadline-upcoming" />
              <Label htmlFor="deadline-upcoming">Upcoming only</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="flexible" id="deadline-flexible" />
              <Label htmlFor="deadline-flexible">Flexible/rolling</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="closed" id="deadline-closed" />
              <Label htmlFor="deadline-closed">Closed/archived</Label>
            </div>
          </RadioGroup>
        </div>
      </FilterPopover>

      <FilterPopover label="Field" icon={Sparkles} count={filters.fieldsOfStudy.length || undefined}>
        <Command>
          <CommandInput placeholder="Search fields..." />
          <CommandEmpty>No fields found.</CommandEmpty>
          <CommandGroup>
            {fieldOptions.map((field) => (
              <CommandItem
                key={field}
                onSelect={() => updateFilters({ fieldsOfStudy: toggleValue(filters.fieldsOfStudy, field) })}
              >
                <Checkbox checked={filters.fieldsOfStudy.includes(field)} className="mr-2" />
                {field}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </FilterPopover>

      <FilterPopover label="Eligibility" icon={Users} count={filters.eligibilityTags.length || undefined}>
        <Command>
          <CommandGroup>
            {eligibilityOptions.map((option) => (
              <CommandItem
                key={option}
                onSelect={() => updateFilters({ eligibilityTags: toggleValue(filters.eligibilityTags, option) })}
              >
                <Checkbox checked={filters.eligibilityTags.includes(option)} className="mr-2" />
                {option}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </FilterPopover>

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto"
        onClick={() =>
          onFiltersChange({
            countries: [],
            levels: [],
            fundingTypes: [],
            deadline: "all",
            fieldsOfStudy: [],
            eligibilityTags: [],
          })
        }
      >
        Reset filters
      </Button>
    </div>
  );
};
