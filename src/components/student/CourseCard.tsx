import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const handleCardClick = () => {
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

  const handleApplyNow = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
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
    <div
      onClick={handleCardClick}
      className="cursor-pointer h-full"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`View details for ${course.name}`}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 h-full flex flex-col animate-fade-in-up hover:scale-[1.01] relative overflow-visible">
        <CardContent className="pt-6 pb-4 flex-1">
          {/* University Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border transition-transform duration-300 group-hover:scale-110">
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

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-start gap-3 justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground leading-tight truncate">
                    {course.university_name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">
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
          <h2 className="text-lg font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300">
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
            onClick={handleApplyNow}
            className="w-full group-hover:shadow-md transition-shadow pointer-events-auto"
            size="lg"
            aria-label={`${isAgentOrStaff ? 'Submit application' : 'Apply now'} for ${course.name}`}
          >
            {isAgentOrStaff ? 'Submit Application' : 'Apply Now'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
