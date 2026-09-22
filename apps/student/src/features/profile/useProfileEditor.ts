import { useEffect, useState } from 'react';
import { updateProfileFields } from '../../services/api';
import { getProfileFieldRecord, normalizeStudentProfile } from './normalizeProfile';
import { createProfileDraft } from './profileDraft';
import { toOptionalNumber } from './profileValues';
import { ProfileFeatureContext } from './types';

export function useProfileEditor({
  session,
  profile,
  setSectionError,
  setActionLoading,
  onProfileChanged,
  selectSection,
}: Pick<
  ProfileFeatureContext,
  'session' | 'profile' | 'setSectionError' | 'setActionLoading' | 'onProfileChanged' | 'selectSection'
>) {
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});

  const [profileDraft, setProfileDraft] = useState(() => createProfileDraft(profile));

  useEffect(() => {
    setProfileDraft(createProfileDraft(profile));
  }, [profile]);

  const validateProfileDraft = () => {
    const errors: Record<string, string> = {};

    if (!profileDraft.name.trim()) errors.name = 'Full name is required.';
    if (!profileDraft.email.trim()) errors.email = 'Email is required.';
    if (!profileDraft.country.trim()) errors.country = 'Country is required.';
    if (!profileDraft.institution.trim()) errors.institution = 'Institution is required.';
    if (!profileDraft.major.trim()) errors.major = 'Branch is required.';
    if (!profileDraft.graduation_year.trim()) errors.graduation_year = 'Graduation year is required.';

    if (profileDraft.email.trim() && !/^\S+@\S+\.\S+$/.test(profileDraft.email.trim())) {
      errors.email = 'Enter a valid email address.';
    }

    if (profileDraft.graduation_year.trim() && Number.isNaN(Number(profileDraft.graduation_year.trim()))) {
      errors.graduation_year = 'Graduation year must be a number.';
    }

    setProfileFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveProfileDetails = async () => {
    if (!session) {
      setSectionError('Please sign in again to update your profile.');
      return;
    }

    if (!validateProfileDraft()) {
      setSectionError('Please fill all required profile fields.');
      return;
    }

    const englishScoreValue = profileDraft.english_score_text.trim();
    try {
      setActionLoading(true);
      setSectionError('');
      const updatedProfile = await updateProfileFields(session, {
        name: profileDraft.name.trim(),
        email: profileDraft.email.trim(),
        country: profileDraft.country.trim(),
        institution: profileDraft.institution.trim(),
        major: profileDraft.major.trim(),
        program: profileDraft.program.trim(),
        graduation_year: toOptionalNumber(profileDraft.graduation_year),
        gpa: toOptionalNumber(profileDraft.gpa),
        gpa_scale: profileDraft.gpa_scale.trim(),
        gre_quant: toOptionalNumber(profileDraft.gre_quant),
        gre_verbal: toOptionalNumber(profileDraft.gre_verbal),
        toefl: toOptionalNumber(profileDraft.toefl),
        ielts: toOptionalNumber(profileDraft.ielts),
        english_score: toOptionalNumber(englishScoreValue),
        english_score_text: englishScoreValue,
        budget: toOptionalNumber(profileDraft.budget),
      });
      const updatedProfileRecord = getProfileFieldRecord(updatedProfile.profile);
      await onProfileChanged?.(
        normalizeStudentProfile({
          ...updatedProfile,
          english_score: updatedProfile.english_score ?? englishScoreValue,
          english_score_text: updatedProfile.english_score_text || englishScoreValue,
          profile: {
            ...updatedProfileRecord,
            english_score: updatedProfileRecord.english_score ?? englishScoreValue,
            english_score_text: updatedProfileRecord.english_score_text || englishScoreValue,
          },
        }),
      );
      selectSection('overview');
    } catch (saveError) {
      setSectionError(saveError instanceof Error ? saveError.message : 'Unable to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  return { profileFieldErrors, profileDraft, setProfileDraft, saveProfileDetails };
}
