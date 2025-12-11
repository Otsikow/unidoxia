import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { GraduationCap, MapPin, DollarSign, Calendar, Search, Loader2 } from 'lucide-react';

interface ProgramSelection {
  programId: string;
  intakeYear: number;
  intakeMonth: number;
  intakeId?: string;
}

interface ProgramSelectionStepProps {
  data: ProgramSelection;
  onChange: (data: ProgramSelection) => void;
  onNext: () => void;
  onBack: () => void;
}

type ProgramQueryRow = Tables<'programs'> & {
  university: {
    name: string | null;
    city: string | null;
    country: string | null;
  } | null;
};

const mapProgramRow = (program: ProgramQueryRow): Program => ({
  id: program.id,
  name: program.name,
  level: program.level,
  discipline: program.discipline,
  tuition_amount: program.tuition_amount,
  tuition_currency: program.tuition_currency ?? '',
  duration_months: program.duration_months,
  university: {
    name: program.university?.name ?? 'Unknown University',
    city: program.university?.city ?? 'Unknown City',
    country: program.university?.country ?? 'Unknown Country',
  },
});

interface Program {
  id: string;
  name: string;
  level: string;
  discipline: string;
  tuition_amount: number;
  tuition_currency: string;
  duration_months: number;
  university: {
    name: string;
    city: string;
    country: string;
  };
}

interface Intake {
  id: string;
  term: string;
  start_date: string;
  app_deadline: string;
}

export default function ProgramSelectionStep({
  data,
  onChange,
  onNext,
  onBack,
}: ProgramSelectionStepProps) {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingIntakes, setLoadingIntakes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [loadingProgramById, setLoadingProgramById] = useState(false);
  const isCourseLoading = loading || loadingProgramById;

  // Fetch programs
  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('programs')
        .select(`
          id,
          name,
          level,
          discipline,
          tuition_amount,
          tuition_currency,
          duration_months,
          university:universities (
            name,
            city,
            country
          )
        `)
        .eq('active', true)
        .order('name');

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,discipline.ilike.%${debouncedSearch}%`);
      }

      const { data: programsData, error } = await query.limit(50);

      if (error) throw error;
      const mappedPrograms: Program[] = (programsData ?? []).map(mapProgramRow);

      setPrograms(mappedPrograms);

      // If programId is already set, find and set the selected program
      if (data.programId) {
        const found = mappedPrograms.find((p) => p.id === data.programId);
        if (found) {
          setSelectedProgram(found);
          fetchIntakes(found.id);
        }
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast({
        title: 'Unable to load courses',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, data.programId, toast]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    const loadSelectedProgram = async () => {
      if (!data.programId) return;
      if (programs.some((program) => program.id === data.programId)) return;

      setLoadingProgramById(true);
      try {
        const { data: programData, error } = await supabase
          .from('programs')
          .select(
            `id, name, level, discipline, tuition_amount, tuition_currency, duration_months,
            university:universities (name, city, country)`
          )
          .eq('id', data.programId)
          .maybeSingle();

        if (error) throw error;
        if (!programData) return;

        const mappedProgram = mapProgramRow(programData as ProgramQueryRow);
        setPrograms((prev) => [...prev, mappedProgram]);
        setSelectedProgram(mappedProgram);
        await fetchIntakes(mappedProgram.id);
      } catch (error) {
        console.error('Error loading pre-selected program:', error);
        toast({
          title: 'Unable to load selected course',
          description: 'Please search and select your course again.',
          variant: 'destructive',
        });
      } finally {
        setLoadingProgramById(false);
      }
    };

    void loadSelectedProgram();
  }, [data.programId, programs, toast, fetchIntakes]);

  // Fetch intakes for selected program
  const fetchIntakes = async (programId: string) => {
    setLoadingIntakes(true);
    try {
      const { data: intakesData, error } = await supabase
        .from('intakes')
        .select('*')
        .eq('program_id', programId)
        .gte('app_deadline', new Date().toISOString().split('T')[0])
        .order('start_date', { ascending: true });

      if (error) throw error;
      setIntakes(intakesData || []);
    } catch (error) {
      console.error('Error fetching intakes:', error);
      setIntakes([]);
    } finally {
      setLoadingIntakes(false);
    }
  };

  const handleProgramChange = (programId: string) => {
    const program = programs.find((p) => p.id === programId);
    if (program) {
      setSelectedProgram(program);
      onChange({ ...data, programId });
      fetchIntakes(programId);
    }
  };

  const isValid = () => {
    return data.programId !== '' && data.intakeYear > 0 && data.intakeMonth > 0;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Select Your Desired Course
          </CardTitle>
          <CardDescription>
            Choose the course you wish to apply for and select your preferred intake.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Courses */}
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Courses
            </Label>
            <Input
              id="search"
              placeholder="Search by course name or discipline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Course Selection */}
          <div className="space-y-2">
            <Label htmlFor="program" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Select Course *
            </Label>
            <Select value={data.programId} onValueChange={handleProgramChange}>
              <SelectTrigger id="program" aria-busy={isCourseLoading}>
                <SelectValue placeholder={isCourseLoading ? 'Loading courses...' : 'Choose a course'} />
              </SelectTrigger>
              <SelectContent>
                {isCourseLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading courses...
                    </div>
                  </div>
                ) : programs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No courses found
                  </div>
                ) : (
                  programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name} - {program.university.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Program Details */}
          {selectedProgram && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">{selectedProgram.name}</CardTitle>
                <CardDescription>
                  {selectedProgram.level} • {selectedProgram.discipline}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedProgram.university.name}, {selectedProgram.university.city},{' '}
                    {selectedProgram.university.country}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Tuition: {selectedProgram.tuition_currency}{' '}
                    {selectedProgram.tuition_amount.toLocaleString()} per year
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Duration: {selectedProgram.duration_months} months</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Intake Selection */}
          {selectedProgram && (
            <>
              {loadingIntakes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : intakes.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="intake" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Select Intake
                  </Label>
                  <Select
                    value={data.intakeId || ''}
                    onValueChange={(value) => {
                      const intake = intakes.find((i) => i.id === value);
                      if (intake) {
                        const startDate = new Date(intake.start_date);
                        onChange({
                          ...data,
                          intakeId: value,
                          intakeYear: startDate.getFullYear(),
                          intakeMonth: startDate.getMonth() + 1,
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="intake">
                      <SelectValue placeholder="Choose an intake" />
                    </SelectTrigger>
                    <SelectContent>
                      {intakes.map((intake) => (
                        <SelectItem key={intake.id} value={intake.id}>
                          {intake.term} - Starts: {new Date(intake.start_date).toLocaleDateString()}{' '}
                          (Deadline: {new Date(intake.app_deadline).toLocaleDateString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No specific intakes available. Please select your preferred intake period:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="intakeYear">Intake Year *</Label>
                      <Select
                        value={data.intakeYear.toString()}
                        onValueChange={(v) => onChange({ ...data, intakeYear: parseInt(v) })}
                      >
                        <SelectTrigger id="intakeYear">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2].map((offset) => {
                            const year = new Date().getFullYear() + offset;
                            return (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="intakeMonth">Intake Month *</Label>
                      <Select
                        value={data.intakeMonth.toString()}
                        onValueChange={(v) => onChange({ ...data, intakeMonth: parseInt(v) })}
                      >
                        <SelectTrigger id="intakeMonth">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            'January',
                            'February',
                            'March',
                            'April',
                            'May',
                            'June',
                            'July',
                            'August',
                            'September',
                            'October',
                            'November',
                            'December',
                          ].map((month, idx) => (
                            <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onNext} disabled={!isValid()}>
              Continue to Documents
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
