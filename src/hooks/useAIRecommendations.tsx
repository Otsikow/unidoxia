import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UniversityRanking {
  world_rank?: number;
  [key: string]: unknown;
}

export interface ProgramRecommendation {
  id: string;
  name: string;
  level: string;
  discipline: string;
  tuition_amount: number;
  tuition_currency: string;
  duration_months: number;
  match_score: number;
  match_reasons: string[];
  university: {
    name: string;
    city: string;
    country: string;
    ranking?: UniversityRanking;
  };
  entry_requirements: unknown;
  ielts_overall?: number;
  toefl_overall?: number;
  eligibility?: ProgramEligibilityResult;
}

export interface StudentProfile {
  academic_scores: {
    gpa?: number;
    ielts?: number;
    toefl?: number;
    gre?: number;
    gmat?: number;
    waec_english?: string;
  };
  age?: number;
  experience?: {
    years?: number;
    internships?: number;
    leadership_roles?: boolean;
  };
  subjects?: string[];
  study_gap_years?: number;
  previous_visa_refusals?: number;
  academic_progression?: 'strong' | 'steady' | 'weak';
  preferences: {
    countries: string[];
    budget_range: [number, number];
    program_level: string[];
    disciplines: string[];
  };
  career_goal?: string;
  education_history: Record<string, unknown>;
}

interface ProgramEntryRequirements {
  min_gpa?: number;
  min_ielts?: number;
  min_toefl?: number;
  max_age?: number;
  min_experience_years?: number;
  focus_areas?: string[];
  preferred_backgrounds?: string[];
  career_paths?: string[];
  prerequisite_subjects?: string[];
}

export type ProgramEligibilityStatus =
  | 'Eligible – Auto Proceed'
  | 'Borderline – Agent Review Required'
  | 'Ineligible – Block & Explain';

export interface ProgramEligibilityResult {
  status: ProgramEligibilityStatus;
  reasons: string[];
}

const parseEntryRequirements = (entryRequirements: unknown): ProgramEntryRequirements => {
  if (!entryRequirements) return {};
  if (typeof entryRequirements === 'object') return entryRequirements as ProgramEntryRequirements;
  if (typeof entryRequirements === 'string') {
    try {
      return JSON.parse(entryRequirements) as ProgramEntryRequirements;
    } catch (error) {
      console.warn('Failed to parse entry requirements', error);
      return {};
    }
  }
  return {};
};

const WAEC_PASS_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6'];

const evaluateProgramEligibility = (
  program: ProgramRecommendation,
  profile: StudentProfile,
  requirements: ProgramEntryRequirements
): ProgramEligibilityResult => {
  const ineligible: string[] = [];
  const borderline: string[] = [];

  // GPA / class requirements
  if (typeof requirements.min_gpa === 'number') {
    if (typeof profile.academic_scores.gpa !== 'number') {
      borderline.push(`GPA data missing for ${requirements.min_gpa} minimum`);
    } else if (profile.academic_scores.gpa < requirements.min_gpa - 0.2) {
      ineligible.push(`Minimum GPA ${requirements.min_gpa} not met`);
    } else if (profile.academic_scores.gpa < requirements.min_gpa) {
      borderline.push(`GPA slightly below ${requirements.min_gpa} requirement`);
    }
  }

  // Subject prerequisites
  const requiredSubjects = requirements.prerequisite_subjects || requirements.focus_areas || [];
  if (requiredSubjects.length > 0) {
    const subjects = (profile.subjects || []).map(subject => subject.toLowerCase());
    if (subjects.length === 0) {
      borderline.push('Subject prerequisites need verification');
    } else if (!requiredSubjects.some(subject => subjects.includes(subject.toLowerCase()))) {
      ineligible.push('Subject prerequisites not satisfied');
    }
  }

  // English language requirements (IELTS / WAEC)
  const requiredIELTS = program.ielts_overall ?? requirements.min_ielts;
  if (typeof requiredIELTS === 'number') {
    const ieltsScore = profile.academic_scores.ielts;
    const waecGrade = profile.academic_scores.waec_english?.toUpperCase();
    const waecPass = waecGrade ? WAEC_PASS_GRADES.includes(waecGrade) : false;

    if (typeof ieltsScore === 'number' && ieltsScore >= requiredIELTS) {
      // Pass
    } else if (waecPass && requiredIELTS <= 6.5) {
      borderline.push('WAEC English used to meet language requirement');
    } else {
      ineligible.push(`English requirement (${requiredIELTS} IELTS) not met`);
    }
  }

  // Age limits
  const maxAge = requirements.max_age ?? 45;
  if (typeof profile.age === 'number') {
    if (profile.age > maxAge) {
      ineligible.push(`Age exceeds maximum of ${maxAge}`);
    } else if (profile.age >= maxAge - 2) {
      borderline.push('Age close to upper limit—visa risk');
    }
  }

  // Visa-risk flags
  if (typeof profile.study_gap_years === 'number') {
    if (profile.study_gap_years >= 5) {
      ineligible.push('Study gap too long for visa approval');
    } else if (profile.study_gap_years >= 3) {
      borderline.push('Long study gap—justify with work or certifications');
    }
  }

  if (typeof profile.previous_visa_refusals === 'number') {
    if (profile.previous_visa_refusals >= 3) {
      ineligible.push('Multiple previous visa refusals');
    } else if (profile.previous_visa_refusals >= 1) {
      borderline.push('Prior visa refusal—requires strong SOP and evidence');
    }
  }

  if (profile.academic_progression === 'weak') {
    borderline.push('Academic progression flagged as weak');
  }

  if (ineligible.length > 0) {
    return {
      status: 'Ineligible – Block & Explain',
      reasons: ineligible
    };
  }

  if (borderline.length > 0) {
    return {
      status: 'Borderline – Agent Review Required',
      reasons: borderline
    };
  }

  return {
    status: 'Eligible – Auto Proceed',
    reasons: ['Meets minimum program and visa checks']
  };
};

export const useAIRecommendations = () => {
  const [recommendations, setRecommendations] = useState<ProgramRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const generateRecommendations = async (profile: StudentProfile) => {
    setLoading(true);
    setError(null);

    try {
      // Get student's current applications to avoid duplicates
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      const { data: existingApps } = studentData ? await supabase
        .from('applications')
        .select('program_id')
        .eq('student_id', studentData.id) : { data: [] };

      const appliedProgramIds = existingApps?.map(app => app.program_id) || [];

      // Fetch all active programs
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
          entry_requirements,
          ielts_overall,
          toefl_overall,
          university:universities (
            name,
            city,
            country,
            ranking
          )
        `)
        .eq('active', true);

      // Exclude programs the student already applied to (guard empty list)
      if (appliedProgramIds.length > 0) {
        const list = appliedProgramIds.map((id) => `'${id}'`).join(',');
        query = query.not('id', 'in', `(${list})`);
      }

      const { data: programs, error: programsError } = await query;

      if (programsError) throw programsError;

      // AI matching algorithm
      const scoredPrograms = programs?.map(program => {
        let score = 0;
        const reasons: string[] = [];
        const requirements = parseEntryRequirements(program.entry_requirements);

        const addScore = (value: number, reason?: string) => {
          score += value;
          if (reason) reasons.push(reason);
        };

        // Country preference matching (25% weight)
        if (profile.preferences.countries.includes(program.university.country)) {
          addScore(25, `Matches your preferred country: ${program.university.country}`);
        }

        // Program level matching (10% weight)
        if (profile.preferences.program_level.includes(program.level)) {
          addScore(10, `Preferred study level: ${program.level}`);
        }

        // Discipline matching (15% weight)
        if (profile.preferences.disciplines.some(d =>
          program.discipline.toLowerCase().includes(d.toLowerCase()) ||
          d.toLowerCase().includes(program.discipline.toLowerCase())
        )) {
          addScore(15, `Matches your field of interest: ${program.discipline}`);
        }

        // Budget matching (15% weight)
        const [minBudget, maxBudget] = profile.preferences.budget_range;
        if (program.tuition_amount >= minBudget && program.tuition_amount <= maxBudget) {
          addScore(15, 'Fits your budget range');
        }

        // Academic requirements matching (up to 20% weight)
        let academicScore = 0;
        const gpa = profile.academic_scores.gpa;
        const requiredGpa = requirements.min_gpa;

        if (typeof gpa === 'number') {
          if (requiredGpa && gpa >= requiredGpa) {
            academicScore += 8;
            reasons.push(`Meets minimum GPA of ${requiredGpa}`);
          } else if (!requiredGpa && gpa >= 3.5) {
            academicScore += 6;
            reasons.push('Strong GPA for competitive courses');
          } else if (gpa >= 3.0) {
            academicScore += 4;
            reasons.push('Solid academic record for eligibility');
          }
        }

        const requiredIELTS = program.ielts_overall ?? requirements.min_ielts;
        if (profile.academic_scores.ielts && requiredIELTS) {
          if (profile.academic_scores.ielts >= requiredIELTS) {
            academicScore += 6;
            reasons.push('Meets IELTS requirements');
          }
        }

        const requiredTOEFL = program.toefl_overall ?? requirements.min_toefl;
        if (profile.academic_scores.toefl && requiredTOEFL) {
          if (profile.academic_scores.toefl >= requiredTOEFL) {
            academicScore += 6;
            reasons.push('Meets TOEFL requirements');
          }
        }

        addScore(Math.min(academicScore, 20));

        // Work experience matching (10% weight)
        const experienceYears = profile.experience?.years ?? 0;
        if (requirements.min_experience_years) {
          if (experienceYears >= requirements.min_experience_years) {
            addScore(10, `Meets experience requirement (${requirements.min_experience_years}+ years)`);
          }
        } else if (experienceYears >= 2) {
          addScore(8, 'Relevant work experience strengthens your profile');
        }

        // Career goal alignment (5% weight)
        if (profile.career_goal) {
          const goalText = profile.career_goal.toLowerCase();
          const requirementKeywords = [
            ...(requirements.focus_areas || []),
            ...(requirements.preferred_backgrounds || []),
            ...(requirements.career_paths || []),
            program.discipline,
            program.name,
          ]
            .map((item) => item?.toLowerCase?.() ?? '')
            .filter(Boolean);

          if (requirementKeywords.some((keyword) => goalText.includes(keyword))) {
            addScore(5, 'Aligns with your stated career goal');
          }
        }

        // University ranking bonus
        const ranking = program.university.ranking as UniversityRanking | undefined;
        if (ranking && typeof ranking.world_rank === 'number' && ranking.world_rank <= 100) {
          addScore(5, 'Top-ranked university match');
        }

        const eligibility = evaluateProgramEligibility(program as ProgramRecommendation, profile, requirements);

        return {
          ...program,
          university: {
            ...program.university,
            ranking: program.university.ranking as UniversityRanking | undefined
          },
          match_score: Math.min(score, 100),
          match_reasons: Array.from(new Set(reasons)),
          eligibility
        };
      }) || [];

      // Sort by match score and return top 10
      const sortedPrograms = scoredPrograms
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 10);

      setRecommendations(sortedPrograms);
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setError('Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  const getVisaEligibility = async (country: string, profile: StudentProfile) => {
    // Simple visa eligibility estimation based on common factors
    let eligibility: 'High' | 'Medium' | 'Low' = 'Medium';
    const factors: string[] = [];

    // Academic performance
    if (profile.academic_scores.gpa && profile.academic_scores.gpa >= 3.5) {
      factors.push('Strong academic record');
    }

    // Language proficiency
    if (profile.academic_scores.ielts && profile.academic_scores.ielts >= 7.0) {
      factors.push('Excellent English proficiency');
    }

    // Financial capacity
    const [minBudget, maxBudget] = profile.preferences.budget_range;
    if (maxBudget >= 50000) {
      factors.push('Strong financial capacity');
    }

    // Country-specific factors
    switch (country.toLowerCase()) {
      case 'canada':
        if (profile.academic_scores.ielts && profile.academic_scores.ielts >= 6.5) {
          eligibility = 'High';
          factors.push('Meets Canadian language requirements');
        }
        break;
      case 'united kingdom':
      case 'uk':
        if (profile.academic_scores.ielts && profile.academic_scores.ielts >= 6.0) {
          eligibility = 'High';
          factors.push('Meets UK language requirements');
        }
        break;
      case 'australia':
        if (profile.academic_scores.ielts && profile.academic_scores.ielts >= 6.0) {
          eligibility = 'High';
          factors.push('Meets Australian language requirements');
        }
        break;
      case 'ireland':
        if (profile.academic_scores.ielts && profile.academic_scores.ielts >= 6.5) {
          eligibility = 'High';
          factors.push('Meets Irish language requirements');
        }
        break;
    }

    return {
      eligibility,
      factors,
      percentage: eligibility === 'High' ? 85 : eligibility === 'Medium' ? 65 : 45
    };
  };

  return {
    recommendations,
    loading,
    error,
    generateRecommendations,
    getVisaEligibility
  };
};