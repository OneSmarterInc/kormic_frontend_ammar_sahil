// AUTO-GENERATED FILE. DO NOT EDIT.
// Source: contracts/student-profile.openapi.json, derived from backend /api/schema/.

export interface StudentProfileUpsertRequest {
  student_id?: string;
  name?: string;
  email?: string;
  country?: string;
  institution?: string;
  major?: string;
  program?: string;
  graduation_year?: number | null;
  phone?: string;
  date_of_birth?: string;
  city?: string;
  region?: string;
  year_in_college?: string;
  interests?: string[];
  target_degree_or_field?: string;
  gpa?: number | null;
  gpa_scale?: string;
  gre_quant?: number | null;
  gre_verbal?: number | null;
  toefl?: number | null;
  ielts?: number | null;
  english_score_text?: string;
  budget?: number | null;
  work_months?: number | null;
  work_experience_summary?: string;
  target_country?: string;
  target_degree?: string;
  preferred_specialization?: string;
  github?: string;
  linkedin_url?: string;
  notes?: string;
}

export const STUDENT_PROFILE_UPSERT_FIELDS = [
  'student_id',
  'name',
  'email',
  'country',
  'institution',
  'major',
  'program',
  'graduation_year',
  'phone',
  'date_of_birth',
  'city',
  'region',
  'year_in_college',
  'interests',
  'target_degree_or_field',
  'gpa',
  'gpa_scale',
  'gre_quant',
  'gre_verbal',
  'toefl',
  'ielts',
  'english_score_text',
  'budget',
  'work_months',
  'work_experience_summary',
  'target_country',
  'target_degree',
  'preferred_specialization',
  'github',
  'linkedin_url',
  'notes',
] as const satisfies readonly (keyof StudentProfileUpsertRequest)[];

export type StudentProfileUpsertField = (typeof STUDENT_PROFILE_UPSERT_FIELDS)[number];
