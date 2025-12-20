import { type MouseEvent, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Calendar, DollarSign, Clock, GraduationCap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export interface Course {
  id: string;
  university_id: string;
  name: string;
  level: string;
  discipline: string;
  duration_months: number;
  tuition_currency: string;
  tuition_amount: number;
  intake_months?: number[];
  university_name: string;
  university_country: string;
  university_city: string;
  university_logo_url?: string;
  next_intake_month?: number;
  next_intake_year?: number;
  applyUrl?: string;
  detailsUrl?: string;
  /** Indicates if the program is fully onboarded in UniDoxia for instant submission */
  instant_submission?: boolean;
  /** Indicates if the university is an official UniDoxia partner */
  is_unidoxia_partner?: boolean;
}

interface CourseCardProps {
  course: Course;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function CourseCard({ course }: CourseCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const studentIdFromUrl = searchParams.get('studentId') || searchParams.get('student');

  // Check if user is an agent/staff/admin to determine the correct apply URL
  const isAgentOrStaff = profile?.role === 'agent' || profile?.role === 'staff' || profile?.role === 'admin';

  // Determine if the Instant Submission badge should be shown
  const showInstantSubmission =
    course.instant_submission === true ||
    course.is_unidoxia_partner === true;

  const handleCardNavigation = () => {
    if (course.detailsUrl) {
      navigate(course.detailsUrl);
      return;
    }

    const params = new URLSearchParams({ program: course.id });
    if (studentIdFromUrl) {
      params.set('studentId', studentIdFromUrl);
    }
    navigate(`/universities/${course.university_id}?${params.toString()}`);
  };

  const handleApplyNow = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    if (course.applyUrl) {
      navigate(course.applyUrl);
      return;
    }

    const params = new URLSearchParams({ program: course.id });
    if (studentIdFromUrl) {
      params.set('studentId', studentIdFromUrl);
    }
    // Use the appropriate application route based on user role
    const baseUrl = isAgentOrStaff ? '/dashboard/applications/new' : '/student/applications/new';
    navigate(`${baseUrl}?${params.toString()}`);
  };

  const getNextIntakeDisplay = () => {
    if (course.next_intake_month && course.next_intake_year) {
      return `${MONTH_NAMES[course.next_intake_month - 1]} ${course.next_intake_year}`;
    }
    return 'Contact for dates';
  };

  return (
    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <div
        onClick={() => setIsDetailsOpen(true)}
        className="cursor-pointer h-full"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsDetailsOpen(true);
          }
        }}
        aria-label={`View details for ${course.name}`}
      >
        <Card className="group hover:shadow-lg transition-all duration-300 h-full flex flex-col animate-fade-in-up hover:scale-[1.01] relative overflow-visible">
          <CardContent className="pt-6 pb-4 flex-1">
            {/* University Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border transition-transform duration-300 group-hover:scale-110 shadow-sm">
                {course.university_logo_url ? (
                  <img
                    src={course.university_logo_url}
                    alt={course.university_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <GraduationCap className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-semibold text-[15px] text-foreground leading-snug line-clamp-2">
                      {course.university_name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground leading-snug">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-2">
                        {course.university_city}, {course.university_country}
                      </span>
                    </div>
                  </div>
                  {showInstantSubmission && (
                    <Badge className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md border-0 text-[11px] px-3 py-1 leading-tight rounded-full whitespace-nowrap">
                      Instant Submission
                    </Badge>
                  )}
                </div>

                {showInstantSubmission && (
                  <div className="inline-flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 w-fit">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    <span className="font-medium">Fast-track ready via UniDoxia</span>
                  </div>
                )}
              </div>
            </div>

            {/* Programme Title */}
            <h2 className="text-base sm:text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300 leading-snug">
              {course.name}
            </h2>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="text-xs">
                {course.level}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {course.discipline}
              </Badge>
            </div>

            {/* Programme Details */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4 flex-shrink-0" />
                <span className="font-semibold text-foreground">
                  {course.tuition_currency} {course.tuition_amount.toLocaleString()}
                </span>
                <span className="text-xs">/ year</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>
                  {course.duration_months} months
                  {course.duration_months >= 12 && (
                    <span className="text-xs ml-1">
                      ({Math.floor(course.duration_months / 12)}
                      {course.duration_months % 12 > 0 && `.${Math.round((course.duration_months % 12) / 12 * 10)}`} years)
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <span>Next intake:</span>
                  <span className="font-medium text-foreground">
                    {getNextIntakeDisplay()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-0 pb-6">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setIsDetailsOpen(true);
              }}
              className="w-full group-hover:shadow-md transition-shadow pointer-events-auto"
              size="lg"
              aria-label={`View details for ${course.name}`}
            >
              View Details
            </Button>
          </CardFooter>
        </Card>
      </div>

      <DialogContent className="max-w-5xl w-[min(98vw,1100px)] max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold leading-tight">
                {course.name}
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                {course.university_name} • {course.university_city}, {course.university_country}
              </DialogDescription>
              {showInstantSubmission && (
                <div className="inline-flex items-center gap-2 text-[12px] text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 w-fit">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span className="font-medium">Fast-track ready via UniDoxia</span>
                </div>
              )}
            </DialogHeader>

            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">{course.level}</Badge>
                    <Badge variant="outline" className="text-xs">{course.discipline}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Next intake: <span className="font-medium text-foreground">{getNextIntakeDisplay()}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Duration: <span className="font-medium text-foreground">{course.duration_months} months</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Tuition: <span className="font-medium text-foreground">{course.tuition_currency} {course.tuition_amount.toLocaleString()} / year</span></span>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                  <h3 className="font-semibold text-foreground">What you'll need to apply</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Academic transcripts and certificates</li>
                    <li>Valid identification (passport)</li>
                    <li>English proficiency test scores (IELTS/TOEFL) if required</li>
                    <li>Statement of Purpose outlining your goals</li>
                  </ul>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold text-foreground">Why this program</h3>
                  <p className="text-sm text-muted-foreground">
                    Review the program details, tuition, and intake schedule carefully before applying. Once you're ready, you can move forward with your application using the action buttons on this page.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border bg-gradient-to-br from-slate-950 to-slate-900 text-white p-5 shadow-lg space-y-3">
                  <div className="flex items-center gap-3">
                    {course.university_logo_url ? (
                      <img
                        src={course.university_logo_url}
                        alt={course.university_name}
                        className="h-12 w-12 rounded-lg bg-white/90 object-contain p-2"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-slate-200">{course.university_city}, {course.university_country}</p>
                      <p className="font-semibold text-white">{course.university_name}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-200">
                    Confirm your eligibility, prepare the required documents, and then proceed to submit your application when ready.
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      handleApplyNow();
                      setIsDetailsOpen(false);
                    }}
                    className="w-full"
                    size="lg"
                    aria-label={`${isAgentOrStaff ? 'Submit application' : 'Apply now'} for ${course.name}`}
                  >
                    {isAgentOrStaff ? 'Submit Application' : 'Apply Now'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDetailsOpen(false);
                      handleCardNavigation();
                    }}
                    className="w-full"
                    size="lg"
                  >
                    View full program page
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
