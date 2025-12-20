import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  GraduationCap,
  MapPin,
  DollarSign,
  Clock,
  Star,
  Filter,
  Brain,
  Shield,
  Target,
  Sparkles,
  Briefcase,
  Globe,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAIRecommendations, StudentProfile } from '@/hooks/useAIRecommendations';
import { Link } from 'react-router-dom';

type VisaEligibilityResult = {
  eligibility: 'High' | 'Medium' | 'Low';
  factors: string[];
  percentage: number;
};

type Filters = {
  countries: string[];
  programLevels: string[];
  disciplines: string[];
  budgetRange: [number, number];
  matchScore: [number, number];
};

interface ProgramRecommendationsProps {
  onProgramSelect?: (programId: string) => void;
}

export default function ProgramRecommendations({ onProgramSelect }: ProgramRecommendationsProps) {
  const { recommendations, loading, error, generateRecommendations, getVisaEligibility } = useAIRecommendations();
  const [showFilters, setShowFilters] = useState(false);
  const [visaResults, setVisaResults] = useState<Record<string, VisaEligibilityResult>>({});
  const [selectedTab, setSelectedTab] = useState('recommendations');

  // Filter states
  const [filters, setFilters] = useState<Filters>({
    countries: [] as string[],
    programLevels: [] as string[],
    disciplines: [] as string[],
    budgetRange: [0, 100000] as [number, number],
    matchScore: [0, 100] as [number, number]
  });

  // Student profile state
  const [profile, setProfile] = useState<StudentProfile>({
    academic_scores: {
      gpa: 3.6,
      ielts: 7.5,
      toefl: 102
    },
    experience: {
      years: 2,
      internships: 1,
      leadership_roles: true
    },
    preferences: {
      countries: ['Canada', 'United Kingdom', 'Australia'],
      budget_range: [25000, 75000],
      program_level: ['Postgraduate', 'Undergraduate'],
      disciplines: ['Computer Science', 'Business', 'Engineering']
    },
    career_goal: 'Build AI-powered products for healthcare innovation',
    education_history: {}
  });
  const [profileDirty, setProfileDirty] = useState(false);

  const countries = ['Canada', 'United States', 'United Kingdom', 'Australia', 'Germany', 'Ireland'];
  const programLevels = ['Undergraduate', 'Postgraduate', 'PHD'];
  const disciplines = ['Computer Science', 'Business', 'Engineering', 'Medicine', 'Law', 'Arts', 'Sciences', 'Education'];
  const goalSuggestions = [
    'Launch a fintech startup',
    'Become a data scientist',
    'Work in global public policy',
    'Drive sustainable energy innovation',
    'Build AI research career'
  ];

  type AcademicScoreKey = keyof StudentProfile['academic_scores'];

  const handleProfileUpdate = (updater: (prev: StudentProfile) => StudentProfile) => {
    setProfile(prev => updater(prev));
    setProfileDirty(true);
  };

  const handleAcademicScoreChange = (key: AcademicScoreKey, value: string) => {
    handleProfileUpdate(prev => ({
      ...prev,
      academic_scores: {
        ...prev.academic_scores,
        [key]: value === '' || Number.isNaN(parseFloat(value)) ? undefined : parseFloat(value)
      }
    }));
  };

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExperienceChange = (value: number[]) => {
    handleProfileUpdate(prev => ({
      ...prev,
      experience: {
        ...prev.experience,
        years: value[0]
      }
    }));
  };

  const updateBudgetRange = (range: [number, number]) => {
    handleProfileUpdate(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        budget_range: range
      }
    }));
    handleFilterChange('budgetRange', range);
  };

  const toggleCountryPreference = (country: string, checked: boolean) => {
    handleProfileUpdate(prev => {
      const existing = new Set(prev.preferences.countries);
      if (checked) {
        existing.add(country);
      } else {
        existing.delete(country);
      }

      const countriesArray = Array.from(existing);

      handleFilterChange('countries', countriesArray);

      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          countries: countriesArray
        }
      };
    });
  };

  const handleGoalSuggestion = (goal: string) => {
    handleProfileUpdate(prev => ({ ...prev, career_goal: goal }));
  };

  const totalEligibilityScore = useMemo(() => {
    const gpa = profile.academic_scores.gpa ?? 0;
    const experienceYears = profile.experience?.years ?? 0;
    const budgetCeiling = profile.preferences.budget_range[1];
    const countryCount = profile.preferences.countries.length;
    const hasGoal = profile.career_goal?.trim().length ? 1 : 0.4;

    const normalizedGpa = Math.min(gpa / 4, 1);
    const normalizedExperience = Math.min(experienceYears / 5, 1);
    const normalizedBudget = Math.min(budgetCeiling / 80000, 1);
    const normalizedCountries = Math.min(countryCount / 3, 1);

    return Math.round(
      normalizedGpa * 30 +
        normalizedExperience * 20 +
        normalizedBudget * 15 +
        normalizedCountries * 20 +
        hasGoal * 15
    );
  }, [profile]);

  type EligibilitySignal = {
    label: string;
    status: 'strong' | 'ok' | 'weak';
    description: string;
  };

  const eligibilitySignals = useMemo<EligibilitySignal[]>(() => {
    const gpa = profile.academic_scores.gpa ?? 0;
    const experienceYears = profile.experience?.years ?? 0;
    const budgetCeiling = profile.preferences.budget_range[1];
    const countryCount = profile.preferences.countries.length;
    const goal = profile.career_goal?.trim();

    const gradeStatus = gpa >= 3.6 ? 'strong' : gpa >= 3.0 ? 'ok' : 'weak';
    const experienceStatus = experienceYears >= 3 ? 'strong' : experienceYears >= 1 ? 'ok' : 'weak';
    const budgetStatus = budgetCeiling >= 45000 ? 'strong' : budgetCeiling >= 25000 ? 'ok' : 'weak';
    const countryStatus = countryCount >= 2 ? 'strong' : countryCount === 1 ? 'ok' : 'weak';
    const goalStatus = goal ? 'strong' : 'ok';

    return [
      {
        label: `Grades • ${gpa ? gpa.toFixed(2) : 'N/A'} GPA`,
        status: gradeStatus,
        description:
          gradeStatus === 'strong'
            ? 'Competitive GPA for top universities'
            : gradeStatus === 'ok'
              ? 'Meets minimum GPA for many partners'
              : 'Consider boosting GPA or targeting flexible courses'
      },
      {
        label: `Experience • ${experienceYears} yrs`,
        status: experienceStatus,
        description:
          experienceStatus === 'strong'
            ? 'Great professional history for advanced courses'
            : experienceStatus === 'ok'
              ? 'Solid foundation; highlight projects in SOP'
              : 'Add internships or volunteering to strengthen profile'
      },
      {
        label: `Budget • up to $${budgetCeiling.toLocaleString()}`,
        status: budgetStatus,
        description:
          budgetStatus === 'strong'
            ? 'Wide access to flagship courses'
            : budgetStatus === 'ok'
              ? 'Balanced range; scholarships can unlock more options'
              : 'Focus on scholarship-heavy or lower tuition destinations'
      },
      {
        label: `Country focus • ${countryCount || 'No'} selected`,
        status: countryStatus,
        description:
          countryStatus === 'strong'
            ? 'Multiple preferred countries give the AI more room to match'
            : countryStatus === 'ok'
              ? 'Single country selected—AI will prioritize top fits there'
              : 'Add at least one preferred country to guide matching'
      },
      {
        label: goal ? 'Career goal defined' : 'Career goal needed',
        status: goalStatus,
        description: goal
          ? 'AI will align recommendations to this trajectory'
          : 'Share a desired role so we can tailor courses'
      }
    ];
  }, [profile]);

  const eligibilityStatusClasses: Record<EligibilitySignal['status'], string> = {
    strong: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
    ok: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    weak: 'bg-destructive/10 text-destructive'
  };

  const handleRunMatching = () => {
    generateRecommendations(profile);
    setProfileDirty(false);
  };

  useEffect(() => {
    generateRecommendations(profile);
  }, []);

  const filteredRecommendations = recommendations.filter(rec => {
    if (filters.countries.length > 0 && !filters.countries.includes(rec.university.country)) return false;
    if (filters.programLevels.length > 0 && !filters.programLevels.includes(rec.level)) return false;
    if (filters.disciplines.length > 0 && !filters.disciplines.some(d => 
      rec.discipline.toLowerCase().includes(d.toLowerCase())
    )) return false;
    if (rec.tuition_amount < filters.budgetRange[0] || rec.tuition_amount > filters.budgetRange[1]) return false;
    if (rec.match_score < filters.matchScore[0] || rec.match_score > filters.matchScore[1]) return false;
    return true;
  });

  const checkVisaEligibility = async (country: string) => {
    if (visaResults[country]) return;
    
    const result = await getVisaEligibility(country, profile);
    setVisaResults(prev => ({ ...prev, [country]: result }));
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-success bg-success-light dark:bg-success/20';
    if (score >= 60) return 'text-warning bg-warning-light dark:bg-warning/20';
    return 'text-destructive bg-destructive/10';
  };

  const getVisaColor = (eligibility: string) => {
    switch (eligibility) {
      case 'High': return 'text-success bg-success-light dark:bg-success/20';
      case 'Medium': return 'text-warning bg-warning-light dark:bg-warning/20';
      case 'Low': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            AI-Powered Course Recommendations
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">Discover courses that match your profile and goals</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 sm:flex-initial"
          >
            <Filter className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button onClick={handleRunMatching} className="flex-1 sm:flex-initial gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Run AI Match</span>
          </Button>
        </div>
      </div>

      {/* AI Course Finder */}
      <Card className="border-primary/10 bg-muted/30">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Course Finder
            </CardTitle>
            <CardDescription>
              Share your academic profile and goals to unlock hyper-relevant university matches.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {profileDirty && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                Profile updated — rerun to refresh matches
              </Badge>
            )}
            <Button onClick={handleRunMatching} disabled={loading} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {loading ? 'Analyzing...' : 'Update recommendations'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" /> Grades (GPA)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={4}
                    step={0.1}
                    value={profile.academic_scores.gpa ?? ''}
                    onChange={(e) => handleAcademicScoreChange('gpa', e.target.value)}
                    placeholder="3.5"
                  />
                  <p className="text-xs text-muted-foreground">On a 4.0 scale</p>
                </div>
                <div className="space-y-2">
                  <Label>IELTS Overall</Label>
                  <Input
                    type="number"
                    min={0}
                    max={9}
                    step={0.5}
                    value={profile.academic_scores.ielts ?? ''}
                    onChange={(e) => handleAcademicScoreChange('ielts', e.target.value)}
                    placeholder="7.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>TOEFL</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    step={1}
                    value={profile.academic_scores.toefl ?? ''}
                    onChange={(e) => handleAcademicScoreChange('toefl', e.target.value)}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" /> Work Experience ({profile.experience?.years ?? 0} yrs)
                  </Label>
                  <Slider
                    value={[profile.experience?.years ?? 0]}
                    onValueChange={handleExperienceChange}
                    max={10}
                    min={0}
                    step={0.5}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Budget Range (per year)</Label>
                  <Slider
                    value={profile.preferences.budget_range}
                    onValueChange={(value) => updateBudgetRange(value as [number, number])}
                    max={100000}
                    min={5000}
                    step={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    ${profile.preferences.budget_range[0].toLocaleString()} - ${profile.preferences.budget_range[1].toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Country Preferences
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {countries.map(country => (
                      <label key={country} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                        <Checkbox
                          checked={profile.preferences.countries.includes(country)}
                          onCheckedChange={(checked) => toggleCountryPreference(country, !!checked)}
                          id={`pref-${country}`}
                        />
                        {country}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Career Goal</Label>
                  <Textarea
                    placeholder="e.g. Build AI solutions for healthcare systems"
                    value={profile.career_goal ?? ''}
                    onChange={(e) => handleProfileUpdate(prev => ({ ...prev, career_goal: e.target.value }))}
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {goalSuggestions.map(goal => (
                      <Badge
                        key={goal}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleGoalSuggestion(goal)}
                      >
                        {goal}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/60 p-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Eligibility projection</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{totalEligibilityScore}%</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">match readiness</span>
                </div>
                <Progress value={totalEligibilityScore} className="h-2" />
              </div>
              <div className="space-y-3">
                {eligibilitySignals.map(signal => (
                  <div key={signal.label} className="flex items-start gap-3">
                    <div className={`rounded-full p-1 ${eligibilityStatusClasses[signal.status]}`}>
                      {signal.status === 'weak' ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{signal.label}</p>
                      <p className="text-xs text-muted-foreground">{signal.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Countries</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {countries.map(country => (
                    <div key={country} className="flex items-center space-x-2">
                      <Checkbox
                        id={country}
                        checked={filters.countries.includes(country)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleFilterChange('countries', [...filters.countries, country]);
                          } else {
                            handleFilterChange('countries', filters.countries.filter(c => c !== country));
                          }
                        }}
                      />
                      <Label htmlFor={country} className="text-sm">{country}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Course Level</Label>
                <div className="space-y-2">
                  {programLevels.map(level => (
                    <div key={level} className="flex items-center space-x-2">
                      <Checkbox
                        id={level}
                        checked={filters.programLevels.includes(level)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleFilterChange('programLevels', [...filters.programLevels, level]);
                          } else {
                            handleFilterChange('programLevels', filters.programLevels.filter(l => l !== level));
                          }
                        }}
                      />
                      <Label htmlFor={level} className="text-sm">{level}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Disciplines</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {disciplines.map(discipline => (
                    <div key={discipline} className="flex items-center space-x-2">
                      <Checkbox
                        id={discipline}
                        checked={filters.disciplines.includes(discipline)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleFilterChange('disciplines', [...filters.disciplines, discipline]);
                          } else {
                            handleFilterChange('disciplines', filters.disciplines.filter(d => d !== discipline));
                          }
                        }}
                      />
                      <Label htmlFor={discipline} className="text-sm">{discipline}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Budget Range: ${filters.budgetRange[0].toLocaleString()} - ${filters.budgetRange[1].toLocaleString()}</Label>
                  <Slider
                    value={filters.budgetRange}
                    onValueChange={(value) => handleFilterChange('budgetRange', value as [number, number])}
                    max={100000}
                    min={0}
                    step={1000}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Match Score: {filters.matchScore[0]}% - {filters.matchScore[1]}%</Label>
                  <Slider
                    value={filters.matchScore}
                    onValueChange={(value) => handleFilterChange('matchScore', value as [number, number])}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2 gap-2">
          <TabsTrigger value="recommendations">Recommendations ({filteredRecommendations.length})</TabsTrigger>
          <TabsTrigger value="visa">Visa Eligibility</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Generating AI recommendations...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredRecommendations.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No matching courses found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or preferences</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRecommendations.map((program) => (
                <Card key={program.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                            <h3 className="text-lg sm:text-xl font-semibold flex-1">{program.name}</h3>
                            <Badge className={getMatchColor(program.match_score)}>
                              {program.match_score}% Match
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {program.level} • {program.discipline}
                          </p>
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span className="break-words">
                              {program.university.name} • {program.university.city}, {program.university.country}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{program.tuition_currency} {program.tuition_amount.toLocaleString()}/year</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span>{program.duration_months} months</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">Ranking: {program.university.ranking?.world_rank || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-xs sm:text-sm">Why this course matches you:</h4>
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {program.match_reasons.map((reason, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span>Match Score</span>
                            <span className="font-semibold">{program.match_score}%</span>
                          </div>
                          <Progress value={program.match_score} className="h-2" />
                        </div>
                      </div>

                      <div className="flex flex-row lg:flex-col gap-2 w-full lg:w-auto lg:min-w-[140px]">
                        <Button
                          onClick={() => onProgramSelect?.(program.id)}
                          className="flex-1 lg:w-full"
                          size="sm"
                        >
                          Apply Now
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => checkVisaEligibility(program.university.country)}
                          className="flex-1 lg:w-full"
                          size="sm"
                        >
                          <Shield className="h-3.5 w-3.5 sm:mr-2" />
                          <span className="hidden sm:inline">Check Visa</span>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="flex-1 lg:w-full">
                          <Link to={`/courses?view=programs&program=${program.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="visa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visa Eligibility Assessment</CardTitle>
              <CardDescription>
                Based on your profile, here's your estimated visa eligibility for different countries
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {countries.map(country => {
                  const result = visaResults[country];
                  return (
                    <Card key={country} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-sm sm:text-base truncate">{country}</h3>
                            {result ? (
                              <Badge className={`${getVisaColor(result.eligibility)} text-xs`}>
                                {result.eligibility}
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => checkVisaEligibility(country)}
                                className="text-xs"
                              >
                                Check
                              </Button>
                            )}
                          </div>
                          
                          {result && (
                            <>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                  <span>Eligibility</span>
                                  <span className="font-semibold">{result.percentage}%</span>
                                </div>
                                <Progress value={result.percentage} className="h-2" />
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="text-xs sm:text-sm font-medium">Key Factors:</h4>
                                <div className="space-y-1">
                                  {result.factors.map((factor: string, index: number) => (
                                    <div key={index} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                      <div className="w-1 h-1 rounded-full bg-success flex-shrink-0 mt-1.5" />
                                      <span className="break-words">{factor}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}