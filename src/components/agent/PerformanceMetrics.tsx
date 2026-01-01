import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Clock, CheckCircle, FileText, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PerformanceMetricsData {
  overall: {
    total_applications: number;
    avg_time_to_offer: number;
    offer_acceptance_rate: number;
    visa_success_rate: number;
  };
  funnel: {
    status: string;
    count: number;
  }[];
  universities: {
    university_id: string;
    university_name: string;
    application_count: number;
    avg_time_to_offer: number;
    acceptance_rate: number;
  }[];
  student_profiles: {
    student_nationality: string;
    application_count: number;
    visa_success_rate: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function PerformanceMetrics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["agent-performance-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_agent_performance_metrics");
      if (error) throw error;
      return data as unknown as PerformanceMetricsData;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load performance metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">{(error as Error).message}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Transform funnel data for sorting order
  const statusOrder = [
    'draft', 'submitted', 'screening',
    'conditional_offer', 'unconditional_offer',
    'cas_loa', 'visa', 'enrolled', 'withdrawn', 'deferred'
  ];

  const funnelData = (data.funnel || [])
    .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
    .map(item => ({
      ...item,
      status: item.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time to Offer</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overall.avg_time_to_offer} days</div>
            <p className="text-xs text-muted-foreground">Average time from submission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overall.offer_acceptance_rate}%</div>
            <p className="text-xs text-muted-foreground">Of total offers received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visa Success</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overall.visa_success_rate}%</div>
            <p className="text-xs text-muted-foreground">From CAS/LOA stage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overall.total_applications}</div>
            <p className="text-xs text-muted-foreground">Total applications managed</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>Application Funnel</CardTitle>
            <CardDescription>Drop-off points</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis dataKey="status" type="category" width={100} tick={{fontSize: 10}} interval={0} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>University Performance</CardTitle>
            <CardDescription>Top universities by speed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {(data.universities || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No data available</div>
              ) : (
                data.universities.map((uni) => (
                  <div key={uni.university_id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="font-medium leading-none text-sm">{uni.university_name}</p>
                      <p className="text-xs text-muted-foreground">{uni.application_count} apps</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{uni.avg_time_to_offer} days</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle>Student Success</CardTitle>
            <CardDescription>Visa success by nationality</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {(data.student_profiles || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No data available</div>
              ) : (
                data.student_profiles.map((profile, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <p className="font-medium leading-none text-sm">{profile.student_nationality}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{profile.application_count} apps</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-green-600">{profile.visa_success_rate}%</p>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
