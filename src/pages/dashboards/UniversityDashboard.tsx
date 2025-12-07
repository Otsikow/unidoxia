import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Mail, Globe, MapPin, Building2, Users, FileText, TrendingUp, CheckCircle, XCircle, ClipboardList, Stamp, GraduationCap, Target, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';

interface University {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  country: string;
  city: string | null;
  description?: string | null;
}

interface Application {
  id: string;
  app_number: string;
  status: string;
  created_at: string;
  student: {
    legal_name: string;
    nationality: string;
  };
  program: {
    id: string;
    name: string;
    level: string;
  };
}

interface Program {
  id: string;
  name: string;
  level: string;
  discipline: string;
  tuition_amount: number;
  tuition_currency: string;
  duration_months: number;
  active: boolean;
  ielts_overall: number | null;
  toefl_overall: number | null;
}

interface Agent {
  id: string;
  company_name: string;
  profile: {
    full_name: string;
    email: string;
  };
  referral_count: number;
}

type NewProgram = {
  name: string;
  level: string;
  discipline: string;
  duration_months: number | '';
  tuition_amount: number;
  tuition_currency: string;
  description: string;
  ielts_overall: number | null;
  toefl_overall: number | null;
  active: boolean;
};

const createDefaultProgram = (): NewProgram => ({
  name: '',
  level: 'Bachelor',
  discipline: '',
  duration_months: 12,
  tuition_amount: 0,
  tuition_currency: 'USD',
  description: '',
  ielts_overall: 6.5,
  toefl_overall: 80,
  active: true,
});

const createDefaultUniversityForm = () => ({
  name: '',
  country: '',
  city: '',
  website: '',
  logo_url: '',
  description: '',
});

export default function UniversityDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [university, setUniversity] = useState<University | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');
  
  // Filters
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [newProgram, setNewProgram] = useState<NewProgram>(() => createDefaultProgram());
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [creatingUniversity, setCreatingUniversity] = useState(false);
  const [universityForm, setUniversityForm] = useState(() => createDefaultUniversityForm());

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) {
      setUniversity(null);
      setPrograms([]);
      setApplications([]);
      setAgents([]);
      setLoading(false);
      if (!profile) return;
      toast({
        title: 'Tenant unavailable',
        description: 'We could not determine your university tenant. Please sign in again or contact support.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: uniData, error: uniError } = await supabase
        .from('universities')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .maybeSingle();

      if (uniError) {
        throw uniError;
      }

      if (!uniData) {
        setUniversity(null);
        setPrograms([]);
        setApplications([]);
        setAgents([]);
        return;
      }

      setUniversity(uniData);

      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('university_id', uniData.id)
        .order('name');

      if (programsError) {
        throw programsError;
      }

      const programList = programsData ?? [];
      setPrograms(programList);

      const programIds = programList.map(program => program.id);
      let assembledApplications: Application[] = [];

      if (programIds.length > 0) {
        const { data: rawApplications, error: applicationsError } = await supabase
          .from('applications')
          .select('id, app_number, status, created_at, program_id, student_id')
          .eq('tenant_id', profile.tenant_id)
          .in('program_id', programIds)
          .order('created_at', { ascending: false });

        if (applicationsError) {
          throw applicationsError;
        }

        const applicationRows = rawApplications ?? [];
        const studentIds = Array.from(new Set(applicationRows.map(app => app.student_id))).filter(Boolean);

        let studentsMap = new Map<string, { id: string; legal_name: string | null; nationality: string | null }>();
        if (studentIds.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('id, legal_name, nationality')
            .in('id', studentIds)
            .eq('tenant_id', profile.tenant_id);

          if (studentsError) {
            throw studentsError;
          }

          studentsMap = new Map((studentsData ?? []).map(student => [student.id, student]));
        }

        const programsMap = new Map(
          programList.map(program => [program.id, { id: program.id, name: program.name, level: program.level }])
        );

        assembledApplications = applicationRows.map((app) => ({
          id: app.id,
          app_number: app.app_number,
          status: app.status,
          created_at: app.created_at,
          student: studentsMap.get(app.student_id) || { legal_name: 'Unknown', nationality: 'Unknown' },
          program: programsMap.get(app.program_id) || { id: app.program_id, name: 'Unknown', level: 'Unknown' },
        }));
      }

      setApplications(assembledApplications);

      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          id,
          company_name,
          profile:profiles!inner(full_name, email)
        `)
        .eq('tenant_id', profile.tenant_id);

      if (agentsError) {
        throw agentsError;
      }

      const agentsWithCounts = await Promise.all(
        (agentsData ?? []).map(async (agent: any) => {
          const { count, error: countError } = await supabase
            .from('applications')
            .select('id', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .eq('tenant_id', profile.tenant_id);

          if (countError) {
            throw countError;
          }

          return {
            ...agent,
            referral_count: count ?? 0,
          };
        })
      );

      setAgents(agentsWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [profile, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleAddProgram = async () => {
    if (!university || !profile?.tenant_id) return;
    
    const durationValue = newProgram.duration_months === '' ? null : newProgram.duration_months;

    if (!durationValue || Number.isNaN(durationValue)) {
      toast({
        title: 'Duration required',
        description: 'Please enter the programme duration in months.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('programs')
        .insert({
          ...newProgram,
          duration_months: durationValue,
          university_id: university.id,
          tenant_id: profile.tenant_id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Course added successfully',
      });

      setIsAddCourseOpen(false);
      setNewProgram(createDefaultProgram());

      await fetchData();
    } catch (error) {
      console.error('Error adding program:', error);
      toast({
        title: 'Error',
        description: 'Failed to add course',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateProgram = async (programId: string, updates: Partial<Program>) => {
    try {
      if (!profile?.tenant_id) {
        toast({
          title: 'Tenant unavailable',
          description: 'We could not determine your university tenant. Please sign in again.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('programs')
        .update(updates)
        .eq('id', programId)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Course updated successfully',
      });

      await fetchData();
    } catch (error) {
      console.error('Error updating program:', error);
      toast({
        title: 'Error',
        description: 'Failed to update course',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProgram = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
      if (!profile?.tenant_id) {
        toast({
          title: 'Tenant unavailable',
          description: 'We could not determine your university tenant. Please sign in again.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', programId)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Course deleted successfully',
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting program:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive',
      });
    }
  };

  const handleCreateUniversity = async () => {
    if (!profile) return;

    const trimmedName = universityForm.name.trim();
    const trimmedCountry = universityForm.country.trim();

    if (!trimmedName || !trimmedCountry) {
      return;
    }

    try {
      setCreatingUniversity(true);
      
      // Generate initial profile details with contact info from user profile
      const initialProfileDetails = {
        tagline: null,
        highlights: [],
        contacts: {
          primary: {
            name: profile.full_name || null,
            email: profile.email || null,
            phone: profile.phone || null,
            title: null,
          },
        },
        social: {
          website: universityForm.website.trim() || null,
          facebook: null,
          instagram: null,
          linkedin: null,
          youtube: null,
        },
        media: {
          heroImageUrl: null,
          gallery: [],
        },
      };
      
      const { data, error } = await supabase
        .from('universities')
        .insert({
          name: trimmedName,
          country: trimmedCountry,
          city: universityForm.city.trim() || null,
          website: universityForm.website.trim() || null,
          logo_url: universityForm.logo_url.trim() || null,
          description: universityForm.description.trim() || null,
          tenant_id: profile.tenant_id,
          active: true,
          submission_config_json: initialProfileDetails,
        })
        .select('*')
        .single();

      if (error) throw error;

      toast({
        title: 'University profile created',
        description: `${data?.name ?? 'Your university'} is now connected. You can manage courses, applications, and agents.`,
      });

      setIsSetupModalOpen(false);
      setUniversityForm(createDefaultUniversityForm());

      await fetchData();
    } catch (error) {
      console.error('Error creating university:', error);
      toast({
        title: 'Error',
        description: 'Failed to create university profile',
        variant: 'destructive',
      });
    } finally {
      setCreatingUniversity(false);
    }
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesProgram = programFilter === 'all' || app.program.id === programFilter;
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesSearch = 
      searchTerm === '' ||
      app.student.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.app_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesProgram && matchesStatus && matchesSearch;
  });

  // Calculate analytics
  const countryData = applications.reduce((acc, app) => {
    const country = app.student.nationality || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartDataCountries = Object.entries(countryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const acceptedCount = applications.filter(app => 
    app.status === 'unconditional_offer' || app.status === 'conditional_offer'
  ).length;
  const totalCount = applications.length;
  const acceptanceRate = totalCount > 0 ? ((acceptedCount / totalCount) * 100).toFixed(1) : '0';

  const statusCounts = [
    {
      name: 'Accepted',
      value: acceptedCount,
      color: '#10b981',
    },
    { 
      name: 'Pending', 
      value: applications.filter(app => 
        app.status === 'submitted' || app.status === 'screening'
      ).length,
      color: '#f59e0b',
    },
    { 
      name: 'Other', 
      value: applications.filter(app => 
        !['unconditional_offer', 'conditional_offer', 'submitted', 'screening'].includes(app.status)
      ).length,
      color: '#6b7280',
    },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  const getStatusCount = (statuses: string[]) =>
    applications.filter((app) => statuses.includes(app.status)).length;

  const pipelineStageDefinitions: {
    key: string;
    label: string;
    description: string;
    statuses: string[];
    icon: LucideIcon;
  }[] = [
    {
      key: 'submitted',
      label: 'New Applications',
      description: 'Submitted and awaiting review',
      statuses: ['submitted'],
      icon: FileText,
    },
    {
      key: 'screening',
      label: 'In Review',
      description: 'Applications in screening and assessment',
      statuses: ['screening'],
      icon: ClipboardList,
    },
    {
      key: 'offers',
      label: 'Offers Issued',
      description: 'Students with conditional or unconditional offers',
      statuses: ['conditional_offer', 'unconditional_offer'],
      icon: CheckCircle,
    },
    {
      key: 'visa',
      label: 'Visa & CAS',
      description: 'Students preparing documentation',
      statuses: ['cas_loa', 'visa'],
      icon: Stamp,
    },
    {
      key: 'enrolled',
      label: 'Enrolled Students',
      description: 'Confirmed students ready to start',
      statuses: ['enrolled'],
      icon: GraduationCap,
    },
  ];

  const pipelineStages = pipelineStageDefinitions.map((stage) => {
    const count = getStatusCount(stage.statuses);
    return {
      key: stage.key,
      label: stage.label,
      description: stage.description,
      icon: stage.icon,
      count,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
    };
  });

  const trackedStatuses = new Set(
    pipelineStageDefinitions.flatMap((stage) => stage.statuses)
  );
  const otherCount = applications.filter(
    (app) => !trackedStatuses.has(app.status)
  ).length;

  if (otherCount > 0) {
    pipelineStages.push({
      key: 'other',
      label: 'Other Outcomes',
      description: 'Withdrawn or deferred applications',
      icon: XCircle,
      count: otherCount,
      percentage: totalCount > 0 ? Math.round((otherCount / totalCount) * 100) : 0,
    });
  }

  const offerCount = getStatusCount(['conditional_offer', 'unconditional_offer']);
  const visaCount = getStatusCount(['cas_loa', 'visa']);
  const enrolledCount = getStatusCount(['enrolled']);

  const conversionMetrics = [
    {
      key: 'offer',
      label: 'Offer Rate',
      value: totalCount > 0 ? Math.round((offerCount / totalCount) * 100) : 0,
      description: `${offerCount} offers issued`,
      icon: CheckCircle,
    },
    {
      key: 'visa',
      label: 'Visa Progress',
      value: offerCount > 0 ? Math.round((visaCount / offerCount) * 100) : 0,
      description: `${visaCount} students in visa or CAS stage`,
      icon: Stamp,
    },
    {
      key: 'enrolled',
      label: 'Enrollment Rate',
      value: totalCount > 0 ? Math.round((enrolledCount / totalCount) * 100) : 0,
      description: `${enrolledCount} students enrolled`,
      icon: GraduationCap,
    },
  ];

  const isUniversityFormValid =
    universityForm.name.trim().length > 0 && universityForm.country.trim().length > 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <LoadingState message="Loading university dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!university) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <EmptyState 
            icon={<Building2 />}
            title="No University Found"
            description="Set up your university profile to unlock the partner dashboard."
            action={{
              label: 'Create University Profile',
              onClick: () => setIsSetupModalOpen(true),
            }}
          />
        </div>

        <Dialog
          open={isSetupModalOpen}
          onOpenChange={(open) => {
            setIsSetupModalOpen(open);
            if (!open) {
              setUniversityForm(createDefaultUniversityForm());
            }
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Set up your university profile</DialogTitle>
              <DialogDescription>
                Provide a few details so agents and staff can recognize your institution.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="university-name">University Name *</Label>
                <Input
                  id="university-name"
                  value={universityForm.name}
                  onChange={(e) =>
                    setUniversityForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. UniDoxia University"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="university-country">Country *</Label>
                  <Input
                    id="university-country"
                    value={universityForm.country}
                    onChange={(e) =>
                      setUniversityForm((prev) => ({ ...prev, country: e.target.value }))
                    }
                    placeholder="e.g. United Kingdom"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="university-city">City</Label>
                  <Input
                    id="university-city"
                    value={universityForm.city}
                    onChange={(e) =>
                      setUniversityForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="e.g. London"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="university-website">Website</Label>
                  <Input
                    id="university-website"
                    value={universityForm.website}
                    onChange={(e) =>
                      setUniversityForm((prev) => ({ ...prev, website: e.target.value }))
                    }
                    placeholder="https://example.edu"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="university-logo">Logo URL</Label>
                  <Input
                    id="university-logo"
                    value={universityForm.logo_url}
                    onChange={(e) =>
                      setUniversityForm((prev) => ({ ...prev, logo_url: e.target.value }))
                    }
                    placeholder="https://cdn.example.edu/logo.png"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="university-description">Description</Label>
                <Textarea
                  id="university-description"
                  value={universityForm.description}
                  onChange={(e) =>
                    setUniversityForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Share an overview of your institution, flagship programs, and partnership goals."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSetupModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateUniversity}
                disabled={!isUniversityFormValid || creatingUniversity}
              >
                {creatingUniversity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        {/* University Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {university.logo_url ? (
                  <img 
                    src={university.logo_url} 
                    alt={university.name}
                    className="h-24 w-24 object-contain rounded-lg border"
                  />
                ) : (
                  <div className="h-24 w-24 bg-muted rounded-lg flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* University Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{university.name}</h1>
                <div className="flex flex-wrap gap-4 text-muted-foreground">
                  {university.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{university.city}, {university.country}</span>
                    </div>
                  )}
                  {university.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <a 
                        href={university.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary underline"
                      >
                        {university.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{programs.length}</div>
                  <div className="text-sm text-muted-foreground">Programs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{applications.length}</div>
                  <div className="text-sm text-muted-foreground">Applications</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{agents.length}</div>
                  <div className="text-sm text-muted-foreground">Agents</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline & Conversion Metrics */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Applicant Pipeline
              </CardTitle>
              <CardDescription>Track progression across each recruitment stage</CardDescription>
            </CardHeader>
            <CardContent>
              {totalCount > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Total applications in pipeline</span>
                    <span className="font-medium text-foreground">{totalCount}</span>
                  </div>
                  <div className="grid gap-3">
                    {pipelineStages.map((stage) => {
                      const StageIcon = stage.icon;
                      return (
                        <div key={stage.key} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-full bg-primary/10 p-2">
                                <StageIcon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-semibold">{stage.label}</div>
                                <div className="text-xs text-muted-foreground">{stage.description}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold">{stage.count}</div>
                              <div className="text-xs text-muted-foreground">{stage.percentage}%</div>
                            </div>
                          </div>
                          <Progress value={stage.percentage} className="mt-3 h-2" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<FileText />}
                  title="No Applications"
                  description="New applications will appear in your pipeline as soon as they are submitted"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Conversion Metrics
              </CardTitle>
              <CardDescription>Measure conversion health from application to enrollment</CardDescription>
            </CardHeader>
            <CardContent>
              {totalCount > 0 ? (
                <div className="space-y-4">
                  {conversionMetrics.map((metric) => {
                    const MetricIcon = metric.icon;
                    return (
                      <div key={metric.key} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="rounded-full bg-primary/10 p-2">
                              <MetricIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold">{metric.label}</div>
                              <div className="text-xs text-muted-foreground">{metric.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold">{metric.value}%</div>
                          </div>
                        </div>
                        <Progress value={metric.value} className="mt-3 h-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<TrendingUp />}
                  title="No Conversion Data"
                  description="Start receiving applications to unlock conversion analytics"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Application Sources by Country */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Application Sources
              </CardTitle>
              <CardDescription>Applications by student nationality</CardDescription>
            </CardHeader>
            <CardContent>
              {chartDataCountries.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartDataCountries}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartDataCountries.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon={<FileText />}
                  title="No Data"
                  description="No applications yet"
                />
              )}
            </CardContent>
          </Card>

          {/* Acceptance Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Acceptance Rate
              </CardTitle>
              <CardDescription>Application status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary">{acceptanceRate}%</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {acceptedCount} of {totalCount} applications accepted
                  </div>
                </div>
                
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusCounts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6">
                      {statusCounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agents
            </TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Applications</CardTitle>
                  <Badge variant="secondary">{filteredApplications.length} total</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="Search by student name or app number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={programFilter} onValueChange={setProgramFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="screening">Screening</SelectItem>
                      <SelectItem value="conditional_offer">Conditional Offer</SelectItem>
                      <SelectItem value="unconditional_offer">Unconditional Offer</SelectItem>
                      <SelectItem value="cas_loa">CAS/LOA</SelectItem>
                      <SelectItem value="visa">Visa</SelectItem>
                      <SelectItem value="enrolled">Enrolled</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Applications Table */}
                {filteredApplications.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>App Number</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Nationality</TableHead>
                          <TableHead>Program</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApplications.map((app) => (
                          <TableRow key={app.id}>
                            <TableCell className="font-medium">{app.app_number}</TableCell>
                            <TableCell>{app.student.legal_name}</TableCell>
                            <TableCell>{app.student.nationality}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{app.program.name}</div>
                                <div className="text-xs text-muted-foreground">{app.program.level}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={app.status} />
                            </TableCell>
                            <TableCell>
                              {new Date(app.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState 
                    icon={<FileText />}
                    title="No Applications"
                    description="No applications match your filters"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Courses & Programs</CardTitle>
                  <Dialog open={isAddCourseOpen} onOpenChange={(open) => {
                    setIsAddCourseOpen(open);
                    if (!open) {
                      setNewProgram(createDefaultProgram());
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Post New Course
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Course</DialogTitle>
                        <DialogDescription>
                          Fill in the details to add a new course to your university
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Course Name *</Label>
                          <Input
                            id="name"
                            value={newProgram.name}
                            onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                            placeholder="e.g. Master of Computer Science"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="level">Level *</Label>
                            <Select
                              value={newProgram.level}
                              onValueChange={(value) => setNewProgram({ ...newProgram, level: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Bachelor">Bachelor</SelectItem>
                                <SelectItem value="Master">Master</SelectItem>
                                <SelectItem value="PhD">PhD</SelectItem>
                                <SelectItem value="Diploma">Diploma</SelectItem>
                                <SelectItem value="Certificate">Certificate</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="discipline">Discipline *</Label>
                            <Input
                              id="discipline"
                              value={newProgram.discipline}
                              onChange={(e) => setNewProgram({ ...newProgram, discipline: e.target.value })}
                              placeholder="e.g. Computer Science"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="duration">Duration (months) *</Label>
                            <Input
                              id="duration"
                              type="text"
                              inputMode="numeric"
                              placeholder="e.g. 12"
                              value={newProgram.duration_months === '' ? '' : String(newProgram.duration_months)}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                // Allow only digits
                                const sanitized = rawValue.replace(/[^0-9]/g, "");
                                if (sanitized === "") {
                                  setNewProgram({
                                    ...newProgram,
                                    duration_months: '',
                                  });
                                } else {
                                  // Remove leading zeros except for a single "0"
                                  const normalized = sanitized.replace(/^0+(?=\d)/, "");
                                  setNewProgram({
                                    ...newProgram,
                                    duration_months: Number(normalized),
                                  });
                                }
                              }}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="tuition">Tuition Amount *</Label>
                            <div className="flex gap-2">
                              <Select
                                value={newProgram.tuition_currency}
                                onValueChange={(value) => setNewProgram({ ...newProgram, tuition_currency: value })}
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="CAD">CAD</SelectItem>
                                  <SelectItem value="AUD">AUD</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                id="tuition"
                                type="number"
                                value={newProgram.tuition_amount}
                                onChange={(e) => setNewProgram({ ...newProgram, tuition_amount: parseFloat(e.target.value) })}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="ielts">IELTS Requirement</Label>
                            <Input
                              id="ielts"
                              type="number"
                              step="0.5"
                              value={newProgram.ielts_overall || ''}
                              onChange={(e) => setNewProgram({ ...newProgram, ielts_overall: parseFloat(e.target.value) })}
                              placeholder="6.5"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="toefl">TOEFL Requirement</Label>
                            <Input
                              id="toefl"
                              type="number"
                              value={newProgram.toefl_overall || ''}
                              onChange={(e) => setNewProgram({ ...newProgram, toefl_overall: parseInt(e.target.value) })}
                              placeholder="80"
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newProgram.description || ''}
                            onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                            placeholder="Course description..."
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddCourseOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddProgram}>
                          Add Course
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {programs.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Program Name</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Discipline</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Tuition</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {programs.map((program) => (
                          <TableRow key={program.id}>
                            <TableCell className="font-medium">{program.name}</TableCell>
                            <TableCell>{program.level}</TableCell>
                            <TableCell>{program.discipline}</TableCell>
                            <TableCell>{program.duration_months} months</TableCell>
                            <TableCell>
                              {program.tuition_currency} {program.tuition_amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={program.active ? 'default' : 'secondary'}>
                                {program.active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateProgram(program.id, { active: !program.active })}
                                >
                                  {program.active ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteProgram(program.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Courses</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first course to get started
                    </p>
                    <Button onClick={() => setIsAddCourseOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connected Agents</CardTitle>
                <CardDescription>Agents referring students to your university</CardDescription>
              </CardHeader>
              <CardContent>
                {agents.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company Name</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Total Referrals</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agents.map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell className="font-medium">
                              {agent.company_name || 'N/A'}
                            </TableCell>
                            <TableCell>{agent.profile.full_name}</TableCell>
                            <TableCell>
                              <a 
                                href={`mailto:${agent.profile.email}`}
                                className="text-primary hover:underline flex items-center gap-2"
                              >
                                <Mail className="h-4 w-4" />
                                {agent.profile.email}
                              </a>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">
                                {agent.referral_count} applications
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <EmptyState 
                    icon={<Users />}
                    title="No Agents"
                    description="No agents are currently connected to your university"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
