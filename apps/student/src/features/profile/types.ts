import { AuthSession } from '../../models/onboarding';
import { OnboardingServices } from '../../services/onboardingServices';

export type Project = {
  title: string;
  description: string;
  technologies: string[];
};

export type IntelligenceBlock = {
  academic_score?: number;
  readiness?: string;
  technical_score?: number;
  technical_level?: string;
  research_score?: number;
  behaviour_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  evidence?: string[];
};

export type StudentProfile = {
  name: string;
  email: string;
  profile_image_url?: string | null;
  country: string;
  institution: string;
  major: string;
  program: string;
  graduation_year: number | null;
  gpa: number | null;
  gpa_scale: string;
  gpa_text: string;
  gre_quant: number | null;
  gre_verbal: number | null;
  toefl: number | null;
  ielts: number | null;
  english_score?: string | number;
  english_score_text: string;
  budget: number | null;
  budget_text: string;
  work_months: number | null;
  github: string;
  linkedin_url: string;
  notes: string;
  source: string;
  verified: boolean;
  skills: string[];
  technical_skills: string[];
  soft_skills: string[];
  projects: Project[];
  research: string;
  research_interests: string[];
  publications_count: number;
  career_goals: string[];
  academic_intelligence: IntelligenceBlock;
  technical_intelligence: IntelligenceBlock & {
    skill_matrix?: Record<string, number>;
  };
  research_intelligence: IntelligenceBlock;
  behaviour_intelligence: {
    behaviour_score: number;
    evidence_count: number;
    summary: string;
  };
  overall_profile_score: number;
  overall_profile: {
    overall_score: number;
    profile_level: string;
    recommendation: string;
  };
  profile_completeness: {
    completed: number;
    total: number;
    percentage: number;
    missing: string[];
  };
  disciplines: string[];
  gaps: string[];
  parser_status: string;
  parser_engine: string;
  response_mode: string;
  work_experience_summary: string;
  student_id: string;
  created_at: string;
  updated_at: string;
};

export interface ProfileScreenProps {
  profile?: StudentProfile;
  loading?: boolean;
  error?: string;
  session?: AuthSession;
  services?: OnboardingServices;
  onRetry?: () => void;
  onProfileChanged?: (profile?: StudentProfile) => void | Promise<void>;
  onLogout?: () => void;
  onAriaSectionActiveChange?: (active: boolean) => void;
}

export type ProfileSection = 'overview' | 'edit' | 'resumes' | 'github' | 'githubProfile' | 'linkedin' | 'aria';

/** Shared inputs; each feature hook selects only the dependencies it needs. */
export interface ProfileFeatureContext extends Pick<
  ProfileScreenProps,
  'session' | 'services' | 'onProfileChanged'
> {
  profile: StudentProfile;
  section: ProfileSection;
  setSectionError: (message: string) => void;
  setActionLoading: (loading: boolean) => void;
  selectSection: (section: ProfileSection) => void;
}
