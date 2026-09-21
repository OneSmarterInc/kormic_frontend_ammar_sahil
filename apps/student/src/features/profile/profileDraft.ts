import { firstProvidedValue, formatDraftValue } from './profileValues';
import { StudentProfile } from './types';
export function createProfileDraft(profile: StudentProfile) {
  return {
    name: profile.name ?? '',
    email: profile.email ?? '',
    country: profile.country ?? '',
    institution: profile.institution ?? '',
    major: profile.major ?? '',
    program: profile.program ?? '',
    graduation_year: formatDraftValue(profile.graduation_year),
    gpa: formatDraftValue(profile.gpa),
    gpa_scale: profile.gpa_scale ?? '',
    gre_quant: formatDraftValue(profile.gre_quant),
    gre_verbal: formatDraftValue(profile.gre_verbal),
    toefl: formatDraftValue(profile.toefl),
    ielts: formatDraftValue(profile.ielts),
    english_score_text: String(firstProvidedValue(profile.english_score, profile.english_score_text) ?? ''),
    budget: formatDraftValue(profile.budget),
  };
}
export type ProfileDraft = ReturnType<typeof createProfileDraft>;
