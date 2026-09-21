import { LinkedInHistoryRecord } from '../../services/api';
import { normalizeMediaUrl } from '../profile/profileMedia';

export const EXTRACTED_DATA_SECTIONS = [
  {
    title: 'Basic details',
    featured: true,
    keys: [
      'name',
      'email',
      'phone',
      'student_id',
      'country',
      'location',
      'institution',
      'major',
      'program',
      'graduation_year',
    ],
  },
  {
    title: 'Academic details',
    keys: [
      'gpa',
      'gpa_scale',
      'gpa_text',
      'gre_quant',
      'gre_verbal',
      'toefl',
      'ielts',
      'english_score',
      'english_score_text',
      'budget',
      'budget_text',
    ],
  },
  {
    title: 'Skills',
    keys: [
      'skills',
      'technical_skills',
      'soft_skills',
      'tools',
      'technologies',
      'programming_languages',
      'frameworks',
    ],
  },
  {
    title: 'Projects',
    keys: ['projects', 'academic_projects', 'personal_projects'],
  },
  {
    title: 'Experience',
    keys: [
      'work_months',
      'work_experience_summary',
      'experience',
      'internships',
      'certifications',
      'achievements',
    ],
  },
  {
    title: 'Research and goals',
    keys: [
      'research',
      'research_interests',
      'publications_count',
      'career_goals',
      'disciplines',
      'gaps',
      'notes',
    ],
  },
  {
    title: 'Profile intelligence',
    keys: [
      'academic_intelligence',
      'technical_intelligence',
      'research_intelligence',
      'behaviour_intelligence',
      'overall_profile',
      'overall_profile_score',
      'profile_completeness',
    ],
  },
];

export function normalizeLinkedinHistory(data: unknown): LinkedInHistoryRecord[] {
  if (Array.isArray(data)) {
    return data.filter(isLinkedinHistoryRecord);
  }

  if (!data || typeof data !== 'object') {
    return [];
  }

  const record = data as Record<string, unknown>;
  const analyses = Array.isArray(record.analyses) ? record.analyses : [];
  if (analyses.length > 0) {
    return analyses.flatMap((analysis, analysisIndex) => {
      if (!analysis || typeof analysis !== 'object') {
        return [];
      }

      const analysisRecord = analysis as Record<string, unknown>;
      const images = Array.isArray(analysisRecord.images) ? analysisRecord.images : [];
      return images.filter(isLinkedinHistoryRecord).map((image, imageIndex) => ({
        ...image,
        id: `${String(analysisRecord.id ?? analysisIndex)}-${String(image.index ?? imageIndex)}`,
        original_filename:
          image.original_filename ??
          image.filename ??
          `Analysis #${String(analysisRecord.id ?? analysisIndex + 1)} image ${imageIndex + 1}`,
        extracted_data:
          image.extracted_data ??
          (typeof analysisRecord.extracted === 'object' && analysisRecord.extracted
            ? (analysisRecord.extracted as Record<string, unknown>)
            : undefined),
        created_at:
          typeof analysisRecord.created_at === 'string' ? analysisRecord.created_at : image.created_at,
        analysis_id: analysisRecord.id,
      }));
    });
  }

  const possibleLists = [record.images, record.screenshots, record.linkedin, record.results, record.history];
  const list = possibleLists.find(Array.isArray);
  return Array.isArray(list) ? list.filter(isLinkedinHistoryRecord) : [];
}

export function isLinkedinHistoryRecord(value: unknown): value is LinkedInHistoryRecord {
  return Boolean(value && typeof value === 'object');
}

export function shouldUseFullWidthSummaryItem(key: string, value: unknown) {
  const textValue = formatExtractedValue(value);
  return key === 'institution' || key === 'email' || textValue.length > 34;
}

export function getLinkedinRecordImageUri(record: LinkedInHistoryRecord) {
  const rawValue =
    record.uploaded_image_url ?? record.image_url ?? record.image ?? record.file_path ?? record.screenshot;
  if (typeof rawValue !== 'string' || rawValue.length === 0) {
    return undefined;
  }

  return normalizeMediaUrl(rawValue);
}

export function formatExtractedValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'Not provided';
    }

    return value
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return JSON.stringify(item);
        }

        return String(item);
      })
      .join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const title = record.title || record.name;
    const description = record.description || record.why || record.summary;
    if (title && description) {
      return `${String(title)}: ${String(description)}`;
    }
    if (title) {
      return String(title);
    }

    return Object.entries(record)
      .map(([key, item]) => `${humanizeKey(key)}: ${formatExtractedValue(item)}`)
      .join('\n');
  }

  return String(value);
}

export function hasExtractedValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasExtractedValue);
  }

  return true;
}

export function humanizeKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
