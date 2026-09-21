import { firstProvidedValue, getArray, getRecord, getStringArray } from './profileValues';
import { Project, StudentProfile } from './types';

export function getProfileFieldRecord(value: unknown) {
  return getRecord(value) ?? {};
}

export function normalizeStudentProfile(profile: StudentProfile | Record<string, unknown>): StudentProfile {
  const maybeWrappedProfile = (profile as Record<string, unknown>).profile;
  const wrapper = profile as Record<string, unknown>;
  const rawProfile =
    maybeWrappedProfile && typeof maybeWrappedProfile === 'object'
      ? { ...wrapper, ...(maybeWrappedProfile as Record<string, unknown>) }
      : wrapper;
  const evidence = getRecord(wrapper.evidence) || getRecord(rawProfile.evidence) || {};
  const resumeEvidence = getRecord(evidence.resume);
  const testScores = getRecord(wrapper.test_scores) || getRecord(rawProfile.test_scores) || {};
  const financials = getRecord(wrapper.financials) || getRecord(rawProfile.financials) || {};
  const workExperience = getRecord(wrapper.work_experience) || getRecord(rawProfile.work_experience) || {};
  const skillsBlock = getRecord(wrapper.skills) || getRecord(rawProfile.skills) || {};
  const researchBlock = getRecord(wrapper.research) || getRecord(rawProfile.research) || {};
  const careerBlock = getRecord(wrapper.career) || getRecord(rawProfile.career) || {};
  const meta = getRecord(wrapper.meta) || getRecord(rawProfile.meta) || {};
  const intelligence = getRecord(wrapper.intelligence) || {};
  const profileScoring = getRecord(wrapper.profile_scoring) || {};
  const githubAssessment =
    getRecord(rawProfile.github_assessment) || getRecord(getRecord(evidence.github)?.result);
  const linkedinProfile =
    getRecord(rawProfile.linkedin_profile) || getRecord(getRecord(evidence.linkedin)?.result);
  const manualProfile = getRecord(evidence.manual_profile_api);
  const publications = getArray(researchBlock.publications) || getArray(rawProfile.publications);
  const skills =
    getStringArray(skillsBlock.all_skills) ||
    getStringArray(rawProfile.skills) ||
    getStringArray(rawProfile.technical_skills) ||
    getStringArray(resumeEvidence?.skills) ||
    getStringArray(linkedinProfile?.skills) ||
    getStringArray(githubAssessment?.frameworks_and_tools) ||
    [];
  const technicalSkills =
    getStringArray(skillsBlock.technical_skills) ||
    getStringArray(rawProfile.technical_skills) ||
    getStringArray(resumeEvidence?.technical_skills) ||
    getStringArray(githubAssessment?.frameworks_and_tools) ||
    [];
  const disciplines =
    getStringArray(careerBlock.target_disciplines) ||
    getStringArray(rawProfile.disciplines) ||
    getStringArray(resumeEvidence?.disciplines) ||
    [];
  const projects =
    getProjectArray(wrapper.projects) ||
    getProjectArray(rawProfile.projects) ||
    getProjectArray(resumeEvidence?.projects) ||
    getProjectArray(linkedinProfile?.projects) ||
    [];

  return {
    ...rawProfile,
    student_id: rawProfile.student_id ?? wrapper.student_id,
    profile_image_url: rawProfile.profile_image_url ?? wrapper.profile_image_url,
    name: rawProfile.name ?? resumeEvidence?.name ?? linkedinProfile?.name ?? manualProfile?.name ?? '',
    email: rawProfile.email ?? resumeEvidence?.email ?? manualProfile?.email ?? '',
    country: rawProfile.country ?? linkedinProfile?.location ?? manualProfile?.country ?? '',
    institution: rawProfile.institution ?? resumeEvidence?.institution ?? manualProfile?.institution ?? '',
    major: rawProfile.major ?? resumeEvidence?.major ?? manualProfile?.major ?? '',
    program: rawProfile.program ?? resumeEvidence?.program ?? '',
    graduation_year:
      rawProfile.graduation_year ?? resumeEvidence?.graduation_year ?? manualProfile?.graduation_year ?? null,
    gpa: rawProfile.gpa ?? resumeEvidence?.gpa ?? manualProfile?.gpa ?? null,
    gpa_scale: rawProfile.gpa_scale ?? resumeEvidence?.gpa_scale ?? manualProfile?.gpa_scale ?? '',
    gpa_text: rawProfile.gpa_text ?? '',
    gre_quant:
      rawProfile.gre_quant ??
      testScores.gre_quant ??
      resumeEvidence?.gre_quant ??
      manualProfile?.gre_quant ??
      null,
    gre_verbal:
      rawProfile.gre_verbal ??
      testScores.gre_verbal ??
      resumeEvidence?.gre_verbal ??
      manualProfile?.gre_verbal ??
      null,
    toefl: rawProfile.toefl ?? testScores.toefl ?? resumeEvidence?.toefl ?? manualProfile?.toefl ?? null,
    ielts: rawProfile.ielts ?? testScores.ielts ?? resumeEvidence?.ielts ?? manualProfile?.ielts ?? null,
    english_score_text:
      firstProvidedValue(
        rawProfile.english_score,
        rawProfile.english_score_text,
        testScores.english_score,
        testScores.english_score_text,
        manualProfile?.english_score,
        manualProfile?.english_score_text,
      ) ?? '',
    english_score:
      firstProvidedValue(
        rawProfile.english_score,
        rawProfile.english_score_text,
        testScores.english_score,
        testScores.english_score_text,
        manualProfile?.english_score,
        manualProfile?.english_score_text,
      ) ?? '',
    budget: rawProfile.budget ?? financials.budget ?? resumeEvidence?.budget ?? manualProfile?.budget ?? null,
    budget_text: rawProfile.budget_text ?? financials.budget_text ?? '',
    work_months: rawProfile.work_months ?? workExperience.work_months ?? resumeEvidence?.work_months ?? null,
    github:
      rawProfile.github ??
      rawProfile.github_url ??
      manualProfile?.github ??
      getRecord(evidence.github)?.github_url ??
      '',
    linkedin_url: rawProfile.linkedin_url ?? linkedinProfile?.linkedin_url ?? '',
    notes: rawProfile.notes ?? wrapper.resume_notes ?? resumeEvidence?.notes ?? '',
    source: rawProfile.source ?? resumeEvidence?.source ?? '',
    verified: Boolean(rawProfile.verified ?? false),
    skills,
    technical_skills: technicalSkills,
    soft_skills: getStringArray(skillsBlock.soft_skills) || getStringArray(rawProfile.soft_skills) || [],
    projects,
    research: researchBlock.research ?? resumeEvidence?.research ?? '',
    research_interests:
      getStringArray(researchBlock.research_interests) || getStringArray(rawProfile.research_interests) || [],
    publications_count:
      rawProfile.publications_count ??
      researchBlock.publications_count ??
      publications?.length ??
      resumeEvidence?.publications_count ??
      0,
    career_goals: getStringArray(careerBlock.career_goals) || getStringArray(rawProfile.career_goals) || [],
    academic_intelligence:
      getRecord(intelligence.academic_intelligence) || getRecord(rawProfile.academic_intelligence) || {},
    technical_intelligence:
      getRecord(intelligence.technical_intelligence) || getRecord(rawProfile.technical_intelligence) || {},
    research_intelligence:
      getRecord(intelligence.research_intelligence) || getRecord(rawProfile.research_intelligence) || {},
    behaviour_intelligence:
      getRecord(intelligence.behaviour_intelligence) || getRecord(rawProfile.behaviour_intelligence) || {},
    overall_profile_score: profileScoring.overall_profile_score ?? rawProfile.overall_profile_score ?? 0,
    overall_profile: getRecord(profileScoring.overall_profile) || getRecord(rawProfile.overall_profile) || {},
    profile_completeness:
      getRecord(profileScoring.profile_completeness) || getRecord(rawProfile.profile_completeness) || {},
    disciplines,
    gaps: getStringArray(rawProfile.gaps) || getStringArray(resumeEvidence?.gaps) || [],
    parser_status: rawProfile.parser_status ?? meta.parser_status ?? resumeEvidence?.parser_status ?? '',
    parser_engine: rawProfile.parser_engine ?? meta.parser_engine ?? resumeEvidence?.parser_engine ?? '',
    response_mode: rawProfile.response_mode ?? meta.response_mode ?? '',
    work_experience_summary:
      rawProfile.work_experience_summary ??
      workExperience.summary ??
      resumeEvidence?.work_experience_summary ??
      getExperienceSummary(linkedinProfile?.experience) ??
      '',
    created_at: rawProfile.created_at ?? wrapper.created_at ?? '',
    updated_at: rawProfile.updated_at ?? wrapper.updated_at ?? '',
  } as StudentProfile;
}

export function getProjectArray(value: unknown): Project[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const projects = value
    .map((item) => {
      const record = getRecord(item);
      if (!record) {
        return undefined;
      }

      return {
        title: String(record.title ?? record.name ?? 'Project'),
        description: String(record.description ?? record.summary ?? ''),
        technologies: getStringArray(record.technologies) || getStringArray(record.tools) || [],
      };
    })
    .filter(Boolean) as Project[];

  return projects.length ? projects : undefined;
}

export function getExperienceSummary(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  return value
    .map((item) => {
      const record = getRecord(item);
      if (!record) {
        return undefined;
      }

      const title = record.title || record.role;
      const company = record.company;
      const summary = record.summary;
      return [title, company, summary].filter(Boolean).join(' - ');
    })
    .filter(Boolean)
    .join('; ');
}
