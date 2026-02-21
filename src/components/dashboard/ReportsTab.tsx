import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { Download, FileText, Users, DollarSign, Building2, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ReportType = 'users' | 'applications' | 'payments' | 'commissions' | 'universities' | 'programs';

export default function ReportsTab() {
  const [selectedReport, setSelectedReport] = useState<ReportType>('applications');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const convertToCSV = (data: any[], headers: string[]): string => {
    if (!data || data.length === 0) {
      return headers.join(',') + '\n';
    }

    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Handle null/undefined
        if (value === null || value === undefined) return '';
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, active, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(user => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        active: user.active ? 'Yes' : 'No',
        created_at: format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss'),
      })) || [];

      const csv = convertToCSV(formattedData, ['id', 'full_name', 'email', 'role', 'active', 'created_at']);
      downloadCSV(csv, `users-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);

      toast({
        title: 'Success',
        description: 'Users report exported successfully',
      });
    } catch (error) {
      console.error('Error exporting users:', error);
      toast({
        title: 'Error',
        description: 'Failed to export users report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportApplications = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          intake_month,
          intake_year,
          created_at,
          students (
            profiles!students_profile_id_fkey (
              full_name,
              email
            )
          ),
          programs (
            name,
            level,
            universities (
              name,
              country
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((app: any) => ({
        id: app.id,
        student_name: app.students?.profiles?.full_name || 'N/A',
        student_email: app.students?.profiles?.email || 'N/A',
        program_name: app.programs?.name || 'N/A',
        program_level: app.programs?.level || 'N/A',
        university: app.programs?.universities?.name || 'N/A',
        country: app.programs?.universities?.country || 'N/A',
        status: app.status,
        intake: `${app.intake_month}/${app.intake_year}`,
        created_at: format(new Date(app.created_at), 'yyyy-MM-dd HH:mm:ss'),
      })) || [];

      const csv = convertToCSV(formattedData, [
        'id',
        'student_name',
        'student_email',
        'program_name',
        'program_level',
        'university',
        'country',
        'status',
        'intake',
        'created_at',
      ]);
      downloadCSV(csv, `applications-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);

      toast({
        title: 'Success',
        description: 'Applications report exported successfully',
      });
    } catch (error) {
      console.error('Error exporting applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to export applications report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportPayments = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount_cents,
          currency,
          status,
          purpose,
          created_at,
          applications (
            students (
              profiles!students_profile_id_fkey (
                full_name,
                email
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((payment: any) => ({
        id: payment.id,
        student_name: payment.applications?.students?.profiles?.full_name || 'N/A',
        student_email: payment.applications?.students?.profiles?.email || 'N/A',
        amount: (payment.amount_cents / 100).toFixed(2),
        currency: payment.currency,
        status: payment.status,
        purpose: payment.purpose,
        created_at: format(new Date(payment.created_at), 'yyyy-MM-dd HH:mm:ss'),
      })) || [];

      const csv = convertToCSV(formattedData, [
        'id',
        'student_name',
        'student_email',
        'amount',
        'currency',
        'status',
        'purpose',
        'created_at',
      ]);
      downloadCSV(csv, `payments-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);

      toast({
        title: 'Success',
        description: 'Payments report exported successfully',
      });
    } catch (error) {
      console.error('Error exporting payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to export payments report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportCommissions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('commissions')
        .select(`
          id,
          level,
          rate_percent,
          amount_cents,
          currency,
          status,
          created_at,
          agents (
            profiles (
              full_name,
              email
            )
          ),
          applications (
            students (
              profiles!students_profile_id_fkey (
                full_name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((commission: any) => ({
        id: commission.id,
        agent_name: commission.agents?.profiles?.full_name || 'N/A',
        agent_email: commission.agents?.profiles?.email || 'N/A',
        student_name: commission.applications?.students?.profiles?.full_name || 'N/A',
        level: commission.level,
        rate_percent: commission.rate_percent,
        amount: (commission.amount_cents / 100).toFixed(2),
        currency: commission.currency,
        status: commission.status,
        created_at: format(new Date(commission.created_at), 'yyyy-MM-dd HH:mm:ss'),
      })) || [];

      const csv = convertToCSV(formattedData, [
        'id',
        'agent_name',
        'agent_email',
        'student_name',
        'level',
        'rate_percent',
        'amount',
        'currency',
        'status',
        'created_at',
      ]);
      downloadCSV(csv, `commissions-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);

      toast({
        title: 'Success',
        description: 'Commissions report exported successfully',
      });
    } catch (error) {
      console.error('Error exporting commissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to export commissions report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportUniversities = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('universities')
        .select('id, name, country, city, website, active, created_at')
        .order('name', { ascending: true });

      if (error) throw error;

      const formattedData = data?.map(uni => ({
        id: uni.id,
        name: uni.name,
        country: uni.country,
        city: uni.city || 'N/A',
        website: uni.website || 'N/A',
        active: uni.active ? 'Yes' : 'No',
        created_at: format(new Date(uni.created_at), 'yyyy-MM-dd HH:mm:ss'),
      })) || [];

      const csv = convertToCSV(formattedData, ['id', 'name', 'country', 'city', 'website', 'active', 'created_at']);
      downloadCSV(csv, `universities-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);

      toast({
        title: 'Success',
        description: 'Universities report exported successfully',
      });
    } catch (error) {
      console.error('Error exporting universities:', error);
      toast({
        title: 'Error',
        description: 'Failed to export universities report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportPrograms = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          level,
          discipline,
          duration_months,
          tuition_amount,
          tuition_currency,
          active,
          created_at,
          universities (
            name,
            country
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((program: any) => ({
        id: program.id,
        name: program.name,
        level: program.level,
        discipline: program.discipline,
        duration_months: program.duration_months,
        tuition: `${program.tuition_currency} ${program.tuition_amount}`,
        university: program.universities?.name || 'N/A',
        country: program.universities?.country || 'N/A',
        active: program.active ? 'Yes' : 'No',
        created_at: format(new Date(program.created_at), 'yyyy-MM-dd HH:mm:ss'),
      })) || [];

      const csv = convertToCSV(formattedData, [
        'id',
        'name',
        'level',
        'discipline',
        'duration_months',
        'tuition',
        'university',
        'country',
        'active',
        'created_at',
      ]);
      downloadCSV(csv, `programs-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);

      toast({
        title: 'Success',
        description: 'Courses report exported successfully',
      });
    } catch (error) {
      console.error('Error exporting programs:', error);
      toast({
        title: 'Error',
        description: 'Failed to export programs report',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    switch (selectedReport) {
      case 'users':
        exportUsers();
        break;
      case 'applications':
        exportApplications();
        break;
      case 'payments':
        exportPayments();
        break;
      case 'commissions':
        exportCommissions();
        break;
      case 'universities':
        exportUniversities();
        break;
      case 'programs':
        exportPrograms();
        break;
      default:
        break;
    }
  };

  const reportOptions = [
    { value: 'users', label: 'Users Report', icon: Users, description: 'Export all user accounts with roles and status' },
    { value: 'applications', label: 'Applications Report', icon: FileText, description: 'Export all applications with student and program details' },
    { value: 'payments', label: 'Payments Report', icon: DollarSign, description: 'Export all payment transactions' },
    { value: 'commissions', label: 'Commissions Report', icon: DollarSign, description: 'Export all commission records' },
    { value: 'universities', label: 'Universities Report', icon: Building2, description: 'Export all partner universities' },
    { value: 'programs', label: 'Courses Report', icon: FileSpreadsheet, description: 'Export all academic courses' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Report Type</label>
              <Select value={selectedReport} onValueChange={(value) => setSelectedReport(value as ReportType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a report to export" />
                </SelectTrigger>
                <SelectContent>
                  {reportOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleExport} disabled={loading} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              {loading ? 'Exporting...' : `Export ${reportOptions.find(r => r.value === selectedReport)?.label}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Options Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card
              key={option.value}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedReport === option.value ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedReport(option.value as ReportType)}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{option.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              About CSV Reports
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>All reports are exported in CSV format for easy analysis</li>
              <li>Reports include all relevant data with timestamps</li>
              <li>Files are named with the current date for easy organization</li>
              <li>CSV files can be opened in Excel, Google Sheets, or any spreadsheet software</li>
              <li>Data is exported in real-time from the database</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
