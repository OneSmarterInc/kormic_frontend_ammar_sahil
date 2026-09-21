import { useEffect, useState } from 'react';
import { LinkedInScreenshot } from '../../models/onboarding';
import {
  LinkedInHistoryRecord,
  listLinkedInHistory,
  updateProfileFields,
  uploadLinkedIn,
} from '../../services/api';
import { ProfileFeatureContext } from '../profile/types';
import { normalizeLinkedinHistory } from './linkedinData';

export function useLinkedinProfile({
  session,
  services,
  profile,
  section,
  setSectionError,
  setActionLoading,
  onProfileChanged,
}: Pick<
  ProfileFeatureContext,
  'session' | 'services' | 'profile' | 'section' | 'setSectionError' | 'setActionLoading' | 'onProfileChanged'
>) {
  const [linkedinImages, setLinkedinImages] = useState<LinkedInHistoryRecord[]>([]);

  const [linkedinPreviews, setLinkedinPreviews] = useState<LinkedInScreenshot[]>([]);

  const [linkedinLoading, setLinkedinLoading] = useState(false);

  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url ?? '');

  const loadLinkedinImages = async () => {
    if (!session) {
      setSectionError('Please sign in again to view LinkedIn images.');
      return;
    }

    try {
      setSectionError('');
      setLinkedinLoading(true);
      const data = await listLinkedInHistory(session);
      setLinkedinImages(normalizeLinkedinHistory(data));
    } catch (linkedinError) {
      setSectionError(
        linkedinError instanceof Error ? linkedinError.message : 'Unable to load LinkedIn images',
      );
    } finally {
      setLinkedinLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'linkedin') {
      loadLinkedinImages();
    }
  }, [section, session?.access, session?.user?.student_id]);

  const savePlainUrl = async (field: 'github' | 'linkedin_url', value: string) => {
    if (!session) {
      setSectionError('Please sign in again to update your profile.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      await updateProfileFields(session, { [field]: value.trim() });
      await onProfileChanged?.();
    } catch (saveError) {
      setSectionError(saveError instanceof Error ? saveError.message : 'Unable to update profile');
    } finally {
      setActionLoading(false);
    }
  };

  const uploadLinkedinImages = async () => {
    if (!session || !services) {
      setSectionError('Please sign in again to upload LinkedIn images.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      const screenshots = await services.linkedin.pickScreenshots(0);
      await uploadLinkedIn(session, screenshots);
      setLinkedinPreviews(screenshots);
      await loadLinkedinImages();
      await onProfileChanged?.();
    } catch (linkedinError) {
      setSectionError(
        linkedinError instanceof Error ? linkedinError.message : 'Unable to upload LinkedIn images',
      );
    } finally {
      setActionLoading(false);
    }
  };
  useEffect(() => {
    setLinkedinUrl(profile.linkedin_url ?? '');
  }, [profile]);
  return {
    linkedinImages,
    linkedinPreviews,
    linkedinLoading,
    linkedinUrl,
    setLinkedinUrl,
    loadLinkedinImages,
    savePlainUrl,
    uploadLinkedinImages,
  };
}
