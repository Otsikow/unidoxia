export interface ScoringConfig {
  academics: { weight: number };
  english_proficiency: { weight: number };
  statement_quality: { weight: number };
  visa_risk: { weight: number };
}

export interface ReviewerProfile {
  id: string;
  country_expertise: string[];
  program_expertise: string[];
  max_workload: number;
  current_workload: number;
}

export interface ApplicationReview {
  id: string;
  application_id: string;
  reviewer_id: string | null;
  stage: string;
  status: 'pending' | 'completed';
  scores: Record<string, number>; // e.g. { academics: 80 }
  feedback: {
    strengths: string[];
    weaknesses: string[];
    conditions: string[];
    visa_concerns: string[];
  };
  decision: 'approve' | 'reject' | 'request_changes';
  created_at: string;
}
