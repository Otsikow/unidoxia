import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SuccessRate from '@/components/ui/success-rate';
import InfoCircledIcon from '@/components/ui/info-circled-icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calculator,
  CheckCircle,
  AlertCircle,
  XCircle,
  Globe,
  DollarSign,
  Clock,
  TrendingUp,
  Shield,
  Award,
  Brain,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface VisaRequirements {
  country: string;
  ielts_min: number;
  toefl_min: number;
  gpa_min: number;
  bank_balance_min: number;
  currency: string;
  work_experience_min: number;
  age_limit: number;
  processing_time_days: number;
  success_rate: number;
}

interface StudentProfile {
  ielts_score: string;
  toefl_score: string;
  gpa: string;
  bank_balance: string;
  work_experience: string;
  age: string;
  nationality: string;
  study_level: string;
  program_field: string;
}

interface AIVisaPrediction {
  summary: string;
  probabilityBand: 'Low' | 'Medium' | 'High';
  fixes: string[];
  financialEvidence: string[];
  redFlags: string[];
}

interface VisaEligibility {
  eligible: boolean;
  score: number;
  missing_requirements: string[];
  recommendations: string[];
  probability: 'high' | 'medium' | 'low';
  aiPrediction: AIVisaPrediction;
}

const VISA_REQUIREMENTS: Record<string, VisaRequirements> = {
  canada: {
    country: 'Canada',
    ielts_min: 6.0,
    toefl_min: 80,
    gpa_min: 3.0,
    bank_balance_min: 10000,
    currency: 'CAD',
    work_experience_min: 1,
    age_limit: 35,
    processing_time_days: 90,
    success_rate: 85
  },
  uk: {
    country: 'United Kingdom',
    ielts_min: 6.5,
    toefl_min: 90,
    gpa_min: 3.2,
    bank_balance_min: 12000,
    currency: 'GBP',
    work_experience_min: 2,
    age_limit: 30,
    processing_time_days: 60,
    success_rate: 78
  },
  usa: {
    country: 'United States',
    ielts_min: 6.5,
    toefl_min: 80,
    gpa_min: 3.5,
    bank_balance_min: 25000,
    currency: 'USD',
    work_experience_min: 2,
    age_limit: 30,
    processing_time_days: 120,
    success_rate: 65
  },
  australia: {
    country: 'Australia',
    ielts_min: 6.0,
    toefl_min: 79,
    gpa_min: 3.0,
    bank_balance_min: 15000,
    currency: 'AUD',
    work_experience_min: 1,
    age_limit: 40,
    processing_time_days: 75,
    success_rate: 82
  },
  germany: {
    country: 'Germany',
    ielts_min: 6.5,
    toefl_min: 90,
    gpa_min: 3.0,
    bank_balance_min: 11000,
    currency: 'EUR',
    work_experience_min: 1,
    age_limit: 35,
    processing_time_days: 45,
    success_rate: 88
  },
  ireland: {
    country: 'Ireland',
    ielts_min: 6.5,
    toefl_min: 90,
    gpa_min: 3.0,
    bank_balance_min: 10000,
    currency: 'EUR',
    work_experience_min: 1,
    age_limit: 35,
    processing_time_days: 60,
    success_rate: 85
  }
};

type NumericVisaRequirementKey = Exclude<keyof VisaRequirements, 'country' | 'currency'>;

interface ComparisonInsight {
  key: string;
  icon: typeof TrendingUp;
  title: string;
  description: string;
}

const MAX_COMPARISON_COUNTRIES = 3;

const generateAIVisaPrediction = ({
  requirements,
  percentage,
  missing,
  profile
}: {
  requirements: VisaRequirements;
  percentage: number;
  missing: string[];
  profile: StudentProfile;
}): AIVisaPrediction => {
  const readinessScore = Math.round(percentage);
  const probabilityBand: AIVisaPrediction['probabilityBand'] =
    readinessScore >= 85 ? 'High' : readinessScore >= 70 ? 'Medium' : 'Low';

  const fixes = missing.length
    ? [...missing]
    : ['No critical issues detected. Focus on strong personal statements and timely submission.'];

  const bankBalance = parseFloat(profile.bank_balance) || 0;
  const gpa = parseFloat(profile.gpa) || 0;
  const age = parseFloat(profile.age) || 0;
  const workExp = parseFloat(profile.work_experience) || 0;
  const ieltsScore = parseFloat(profile.ielts_score) || 0;
  const balanceGap = requirements.bank_balance_min - bankBalance;

  const financialEvidence: string[] = [];
  if (balanceGap > 0) {
    financialEvidence.push(
      `Proof of funds showing at least ${requirements.currency} ${requirements.bank_balance_min.toLocaleString()} (currently ${requirements.currency} ${Math.max(balanceGap, 0).toLocaleString()} short).`
    );
  } else if (bankBalance) {
    financialEvidence.push(
      `Six months of statements confirming ${requirements.currency} ${bankBalance.toLocaleString()} in liquid funds.`
    );
  }
  financialEvidence.push('Sponsor affidavit or bank reference covering tuition and living expenses.');
  if (workExp < requirements.work_experience_min) {
    financialEvidence.push('Employment letters or tax returns that demonstrate ties to home country.');
  }

  const redFlags: string[] = [];
  if (age > requirements.age_limit) {
    redFlags.push(`Age ${age} exceeds the typical limit of ${requirements.age_limit}.`);
  }
  if (balanceGap > 0) {
    redFlags.push('Funding gap detected—historically a top reason for refusals.');
  }
  if (gpa && gpa < requirements.gpa_min) {
    redFlags.push('Academic performance is below the competitive range.');
  }
  if (ieltsScore && ieltsScore < requirements.ielts_min) {
    redFlags.push('Language proficiency below threshold triggers additional scrutiny.');
  }
  if (!profile.nationality) {
    redFlags.push('Nationality not specified—officers expect this in the application.');
  }

  if (!redFlags.length) {
    redFlags.push('No critical red flags detected. Keep documentation consistent across submissions.');
  }

  return {
    summary: `Our AI compared your profile with historical ${requirements.country} visa approvals (${requirements.success_rate}% success). With a ${readinessScore}% readiness score, you currently sit in the ${probabilityBand} probability band. Focus on the insights below before booking biometrics.`,
    probabilityBand,
    fixes,
    financialEvidence,
    redFlags
  };
};

const COMPARISON_METRICS: Array<{
  key: NumericVisaRequirementKey;
  label: string;
  better: 'higher' | 'lower';
  format?: (requirements: VisaRequirements) => string;
}> = [
  {
    key: 'success_rate',
    label: 'Success Rate',
    better: 'higher',
    format: (req) => `${req.success_rate}%`
  },
  {
    key: 'processing_time_days',
    label: 'Processing Time',
    better: 'lower',
    format: (req) => `${req.processing_time_days} days`
  },
  {
    key: 'bank_balance_min',
    label: 'Bank Balance Requirement',
    better: 'lower',
    format: (req) => `${req.currency} ${req.bank_balance_min.toLocaleString()}`
  },
  {
    key: 'ielts_min',
    label: 'IELTS Minimum',
    better: 'lower',
    format: (req) => req.ielts_min.toFixed(1).replace(/\.0$/, '')
  },
  {
    key: 'toefl_min',
    label: 'TOEFL Minimum',
    better: 'lower'
  },
  {
    key: 'gpa_min',
    label: 'GPA Minimum',
    better: 'lower',
    format: (req) => req.gpa_min.toFixed(1)
  },
  {
    key: 'work_experience_min',
    label: 'Work Experience',
    better: 'lower',
    format: (req) => `${req.work_experience_min} years`
  },
  {
    key: 'age_limit',
    label: 'Age Limit',
    better: 'higher',
    format: (req) => `${req.age_limit} years`
  }
];

export default function VisaCalculator() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({
    ielts_score: '',
    toefl_score: '',
    gpa: '',
    bank_balance: '',
    work_experience: '',
    age: '',
    nationality: '',
    study_level: '',
    program_field: ''
  });
  const [eligibility, setEligibility] = useState<VisaEligibility | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [comparisonCountries, setComparisonCountries] = useState<string[]>([]);

  const handleClear = () => {
    setSelectedCountry('');
    setStudentProfile({
      ielts_score: '',
      toefl_score: '',
      gpa: '',
      bank_balance: '',
      work_experience: '',
      age: '',
      nationality: '',
      study_level: '',
      program_field: ''
    });
    setEligibility(null);
  };

  const calculateEligibility = async () => {
    if (!selectedCountry || !studentProfile.ielts_score || !studentProfile.gpa) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setIsCalculating(true);
    
    // Simulate calculation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const requirements = VISA_REQUIREMENTS[selectedCountry];
    const missing: string[] = [];
    const recommendations: string[] = [];
    let score = 0;
    let totalChecks = 0;

    // Check IELTS/TOEFL
    const ieltsScore = parseFloat(studentProfile.ielts_score);
    const toeflScore = parseFloat(studentProfile.toefl_score);
    const gpa = parseFloat(studentProfile.gpa);
    const bankBalance = parseFloat(studentProfile.bank_balance);
    const workExp = parseFloat(studentProfile.work_experience);
    const age = parseFloat(studentProfile.age);

    // IELTS Check
    if (ieltsScore >= requirements.ielts_min) {
      score += 20;
    } else {
      missing.push(`IELTS score below ${requirements.ielts_min} (you have ${ieltsScore})`);
      recommendations.push(`Improve IELTS score to at least ${requirements.ielts_min}`);
    }
    totalChecks += 20;

    // TOEFL Check (if provided)
    if (studentProfile.toefl_score) {
      if (toeflScore >= requirements.toefl_min) {
        score += 15;
      } else {
        missing.push(`TOEFL score below ${requirements.toefl_min} (you have ${toeflScore})`);
        recommendations.push(`Improve TOEFL score to at least ${requirements.toefl_min}`);
      }
      totalChecks += 15;
    }

    // GPA Check
    if (gpa >= requirements.gpa_min) {
      score += 20;
    } else {
      missing.push(`GPA below ${requirements.gpa_min} (you have ${gpa})`);
      recommendations.push(`Improve GPA to at least ${requirements.gpa_min}`);
    }
    totalChecks += 20;

    // Bank Balance Check
    if (bankBalance >= requirements.bank_balance_min) {
      score += 20;
    } else {
      missing.push(`Bank balance below ${requirements.currency} ${requirements.bank_balance_min.toLocaleString()} (you have ${requirements.currency} ${bankBalance.toLocaleString()})`);
      recommendations.push(`Increase bank balance to at least ${requirements.currency} ${requirements.bank_balance_min.toLocaleString()}`);
    }
    totalChecks += 20;

    // Work Experience Check
    if (workExp >= requirements.work_experience_min) {
      score += 15;
    } else {
      missing.push(`Work experience below ${requirements.work_experience_min} years (you have ${workExp})`);
      recommendations.push(`Gain more work experience (${requirements.work_experience_min} years required)`);
    }
    totalChecks += 15;

    // Age Check
    if (age <= requirements.age_limit) {
      score += 10;
    } else {
      missing.push(`Age above ${requirements.age_limit} (you are ${age})`);
      recommendations.push(`Consider countries with higher age limits`);
    }
    totalChecks += 10;

    const percentage = (score / totalChecks) * 100;
    const eligible = percentage >= 70 && missing.length <= 2;

    let probability: 'high' | 'medium' | 'low';
    if (percentage >= 85) probability = 'high';
    else if (percentage >= 70) probability = 'medium';
    else probability = 'low';

    // Add general recommendations
    if (studentProfile.nationality === 'Nigeria' || studentProfile.nationality === 'Ghana') {
      recommendations.push('Consider applying during off-peak seasons for better chances');
    }
    
    if (studentProfile.study_level === 'Master\'s') {
      recommendations.push('Highlight your research experience and academic achievements');
    }

    const aiPrediction = generateAIVisaPrediction({
      requirements,
      percentage,
      missing,
      profile: studentProfile
    });

    setEligibility({
      eligible,
      score: Math.round(percentage),
      missing_requirements: missing,
      recommendations,
      probability,
      aiPrediction
    });

    setIsCalculating(false);
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'high': return 'text-success';
      case 'medium': return 'text-warning';
      case 'low': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getProbabilityIcon = (probability: string) => {
    switch (probability) {
      case 'high': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'medium': return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'low': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const handleOpenCompare = () => {
    setCompareDialogOpen(true);

    if (!selectedCountry) {
      return;
    }

    setComparisonCountries((prev) => {
      if (prev.includes(selectedCountry)) {
        return prev;
      }

      if (prev.length >= MAX_COMPARISON_COUNTRIES) {
        return [...prev.slice(1), selectedCountry];
      }

      return [...prev, selectedCountry];
    });
  };

  const handleCountryToggle = (countryKey: string, checked: boolean | 'indeterminate') => {
    const isChecked = checked === true;

    if (isChecked) {
      setComparisonCountries((prev) => {
        if (prev.includes(countryKey)) {
          return prev;
        }

        if (prev.length >= MAX_COMPARISON_COUNTRIES) {
          toast({
            title: 'Selection limit reached',
            description: `You can compare up to ${MAX_COMPARISON_COUNTRIES} countries at a time.`,
            variant: 'destructive'
          });
          return prev;
        }

        return [...prev, countryKey];
      });
    } else {
      setComparisonCountries((prev) => prev.filter((country) => country !== countryKey));
    }
  };

  const getMetricBestValue = (metricKey: NumericVisaRequirementKey, better: 'higher' | 'lower') => {
    if (comparisonCountries.length === 0) {
      return null;
    }

    const values = comparisonCountries
      .map((countryKey) => VISA_REQUIREMENTS[countryKey]?.[metricKey])
      .filter((value): value is number => typeof value === 'number');

    if (values.length === 0) {
      return null;
    }

    return better === 'higher' ? Math.max(...values) : Math.min(...values);
  };

  const comparisonData = comparisonCountries
    .filter((countryKey) => Boolean(VISA_REQUIREMENTS[countryKey]))
    .map((countryKey) => ({
      key: countryKey,
      requirements: VISA_REQUIREMENTS[countryKey]
    }));

  const insights: ComparisonInsight[] = comparisonData.length >= 2
    ? (() => {
        const highestSuccess = comparisonData.reduce((prev, current) =>
          current.requirements.success_rate > prev.requirements.success_rate ? current : prev
        );

        const fastestProcessing = comparisonData.reduce((prev, current) =>
          current.requirements.processing_time_days < prev.requirements.processing_time_days ? current : prev
        );

        const lowestBankRequirement = comparisonData.reduce((prev, current) =>
          current.requirements.bank_balance_min < prev.requirements.bank_balance_min ? current : prev
        );

        return [
          {
            key: 'success',
            icon: TrendingUp,
            title: `${highestSuccess.requirements.country} offers the highest approval chances`,
            description: `${highestSuccess.requirements.success_rate}% estimated success rate`
          },
          {
            key: 'processing',
            icon: Clock,
            title: `${fastestProcessing.requirements.country} has the quickest processing time`,
            description: `${fastestProcessing.requirements.processing_time_days} day average processing`
          },
          {
            key: 'bank',
            icon: DollarSign,
            title: `${lowestBankRequirement.requirements.country} has the lowest financial requirement`,
            description: `${lowestBankRequirement.requirements.currency} ${lowestBankRequirement.requirements.bank_balance_min.toLocaleString()} minimum balance`
          }
        ];
      })()
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visa Eligibility Calculator</h2>
          <p className="text-muted-foreground">Check your visa eligibility for different countries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenCompare}>
            <Globe className="h-4 w-4 mr-2" />
            Compare Countries
          </Button>
        </div>
      </div>

      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Compare Visa Requirements</DialogTitle>
            <DialogDescription>
              Select up to {MAX_COMPARISON_COUNTRIES} countries to view their visa requirements side by side.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 overflow-y-auto pr-1 max-h-[72vh]">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Countries</Label>
              <ScrollArea className="h-48 rounded-md border">
                <div className="grid gap-2 p-3 sm:grid-cols-2">
                  {Object.entries(VISA_REQUIREMENTS).map(([countryKey, requirement]) => {
                    const isSelected = comparisonCountries.includes(countryKey);

                    return (
                      <label
                        key={countryKey}
                        htmlFor={`compare-${countryKey}`}
                        className={`flex items-center justify-between gap-3 rounded-md border p-3 text-sm transition hover:border-primary ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`compare-${countryKey}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => handleCountryToggle(countryKey, checked)}
                          />
                          <span className="font-medium">{requirement.country}</span>
                        </div>
                        {isSelected && <Badge variant="secondary">Selected</Badge>}
                      </label>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {comparisonData.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Select at least one country to start a comparison.
              </div>
            ) : (
              <div className="space-y-4">
                {comparisonData.length >= 2 && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {insights.map((insight) => (
                      <div key={insight.key} className="rounded-lg border bg-muted/40 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <insight.icon className="h-4 w-4 text-primary" />
                          <span>{insight.title}</span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-md border">
                  <div className="max-h-[55vh] overflow-auto">
                    <Table className="min-w-[640px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Requirement</TableHead>
                          {comparisonData.map(({ key, requirements }) => (
                            <TableHead key={key} className="text-right">
                              {requirements.country}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {COMPARISON_METRICS.map((metric) => {
                          const bestValue = getMetricBestValue(metric.key, metric.better);

                          return (
                            <TableRow key={metric.key}>
                              <TableCell className="font-medium">{metric.label}</TableCell>
                              {comparisonData.map(({ key, requirements }) => {
                                const value = requirements[metric.key];
                                const displayValue = metric.format ? metric.format(requirements) : value;
                                const isBest = typeof bestValue === 'number' && value === bestValue;

                                return (
                                  <TableCell
                                    key={key}
                                    className={`text-right text-sm ${isBest ? 'font-semibold text-success' : ''}`}
                                  >
                                    {displayValue}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Student Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="country">Select Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a country" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VISA_REQUIREMENTS).map(([key, req]) => (
                    <SelectItem key={key} value={key}>
                      {req.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="ielts">IELTS Score</Label>
                <Input
                  id="ielts"
                  type="number"
                  step="0.5"
                  min="0"
                  max="9"
                  value={studentProfile.ielts_score}
                  onChange={(e) => setStudentProfile({ ...studentProfile, ielts_score: e.target.value })}
                  placeholder="e.g., 7.5"
                />
              </div>
              <div>
                <Label htmlFor="toefl">TOEFL Score (Optional)</Label>
                <Input
                  id="toefl"
                  type="number"
                  min="0"
                  max="120"
                  value={studentProfile.toefl_score}
                  onChange={(e) => setStudentProfile({ ...studentProfile, toefl_score: e.target.value })}
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="gpa">GPA</Label>
                <Input
                  id="gpa"
                  type="number"
                  step="0.1"
                  min="0"
                  max="4"
                  value={studentProfile.gpa}
                  onChange={(e) => setStudentProfile({ ...studentProfile, gpa: e.target.value })}
                  placeholder="e.g., 3.5"
                />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min="16"
                  max="50"
                  value={studentProfile.age}
                  onChange={(e) => setStudentProfile({ ...studentProfile, age: e.target.value })}
                  placeholder="e.g., 25"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bank_balance">Bank Balance</Label>
              <Input
                id="bank_balance"
                type="number"
                value={studentProfile.bank_balance}
                onChange={(e) => setStudentProfile({ ...studentProfile, bank_balance: e.target.value })}
                placeholder="e.g., 15000"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="work_experience">Work Experience (Years)</Label>
                <Input
                  id="work_experience"
                  type="number"
                  min="0"
                  max="20"
                  value={studentProfile.work_experience}
                  onChange={(e) => setStudentProfile({ ...studentProfile, work_experience: e.target.value })}
                  placeholder="e.g., 2"
                />
              </div>
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Select value={studentProfile.nationality} onValueChange={(value) => setStudentProfile({ ...studentProfile, nationality: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nigeria">Nigeria</SelectItem>
                    <SelectItem value="Ghana">Ghana</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="South Africa">South Africa</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={calculateEligibility}
                disabled={isCalculating}
                className="w-full"
              >
                {isCalculating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate Eligibility
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Eligibility Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eligibility ? (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(eligibility.score)}`}>
                    {eligibility.score}%
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {getProbabilityIcon(eligibility.probability)}
                    <span className={`font-medium ${getProbabilityColor(eligibility.probability)}`}>
                      {eligibility.probability.toUpperCase()} PROBABILITY
                    </span>
                  </div>
                  <Progress value={eligibility.score} className="mt-4" />
                </div>

                {/* Eligibility Status */}
                <div className={`p-4 rounded-lg border ${eligibility.eligible ? 'bg-success-light border-success/40 dark:bg-success/10' : 'bg-destructive/10 border-destructive/40'}`}>
                  <div className="flex items-center gap-2">
                    {eligibility.eligible ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className={`font-medium ${eligibility.eligible ? 'text-success' : 'text-destructive'}`}>
                      {eligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${eligibility.eligible ? 'text-success' : 'text-destructive'}`}>
                    {eligibility.eligible 
                      ? 'You meet the basic requirements for visa application'
                      : 'You need to improve some requirements before applying'
                    }
                  </p>
                </div>

                {/* AI Visa Success Predictor */}
                <div className="rounded-xl border bg-muted/40 p-4 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Visa Success Predictor</p>
                        <p className="text-sm text-muted-foreground">{eligibility.aiPrediction.summary}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${getProbabilityColor(eligibility.probability)} border-current text-xs font-semibold`}
                    >
                      {eligibility.aiPrediction.probabilityBand.toUpperCase()} PROBABILITY
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Wrench className="h-4 w-4" />
                        What to fix
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {eligibility.aiPrediction.fixes.map((item, index) => (
                          <li key={`fix-${index}`} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <DollarSign className="h-4 w-4" />
                        Required financial evidence
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {eligibility.aiPrediction.financialEvidence.map((item, index) => (
                          <li key={`finance-${index}`} className="flex gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        Red flags needing attention
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {eligibility.aiPrediction.redFlags.map((item, index) => (
                          <li key={`flag-${index}`} className="flex gap-2">
                            <span className="text-destructive">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Missing Requirements */}
                {eligibility.missing_requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-destructive mb-2">Missing Requirements:</h4>
                    <ul className="space-y-1">
                      {eligibility.missing_requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-destructive">
                          <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {eligibility.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-info mb-2">Recommendations:</h4>
                    <ul className="space-y-1">
                      {eligibility.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-info">
                          <Award className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                  {/* Country Requirements */}
                  {selectedCountry && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Requirements for {VISA_REQUIREMENTS[selectedCountry].country}:</h4>
                      <div className="grid gap-2 text-sm">
                        <TooltipProvider>
                          <div className="flex justify-between">
                            <div className="flex items-center gap-x-2">
                              <span>IELTS Minimum:</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>The minimum IELTS score required for admission.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="font-medium">{VISA_REQUIREMENTS[selectedCountry].ielts_min}</span>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex items-center gap-x-2">
                              <span>GPA Minimum:</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>The minimum GPA required for admission.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="font-medium">{VISA_REQUIREMENTS[selectedCountry].gpa_min}</span>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex items-center gap-x-2">
                              <span>Bank Balance:</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>The minimum bank balance required for visa application.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="font-medium">
                              {VISA_REQUIREMENTS[selectedCountry].currency} {VISA_REQUIREMENTS[selectedCountry].bank_balance_min.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex items-center gap-x-2">
                              <span>Work Experience:</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>The minimum work experience required for admission.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="font-medium">{VISA_REQUIREMENTS[selectedCountry].work_experience_min} years</span>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex items-center gap-x-2">
                              <span>Age Limit:</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>The maximum age limit for visa application.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="font-medium">{VISA_REQUIREMENTS[selectedCountry].age_limit} years</span>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex items-center gap-x-2">
                              <span>Processing Time:</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>The estimated processing time for visa application.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="font-medium">{VISA_REQUIREMENTS[selectedCountry].processing_time_days} days</span>
                          </div>
                          <div className="flex justify-between">
                            <div className="flex items-center gap-x-2">
                              <span>Success Rate:</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>The estimated success rate for visa application.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <SuccessRate rate={VISA_REQUIREMENTS[selectedCountry].success_rate} />
                          </div>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}

                  {/* Next Steps CTA */}
                  <div className="border-t pt-6 space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold">Ready to take the next step?</h4>
                      <p className="text-sm text-muted-foreground">
                        {user
                          ? 'Turn these results into a successful application with our team guiding you end to end.'
                          : 'Create your free account to save your progress and let our team guide you through your application.'}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {!user && (
                        <Button asChild className="sm:w-auto">
                          <Link to="/auth/signup">Sign up to start</Link>
                        </Button>
                      )}
                      <Button asChild variant={user ? 'default' : 'outline'} className="sm:w-auto">
                        <Link to={user ? '/student/applications/new' : '/auth/login'}>
                          {user ? 'Start your application' : 'Log in to continue'}
                        </Link>
                      </Button>
                    </div>
                  </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Calculate Your Eligibility</h3>
                <p className="text-muted-foreground">Fill in your details and click "Calculate Eligibility" to see your visa chances</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}