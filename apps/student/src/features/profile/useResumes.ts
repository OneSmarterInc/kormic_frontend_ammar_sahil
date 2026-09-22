import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  API_BASE_URL,
  deleteResume,
  downloadResumeFile,
  listStudentResumes,
  ResumeRecord,
} from '../../services/api';
import { ProfileFeatureContext } from './types';

export function useResumes({
  session,
  services,
  section,
  setSectionError,
  onProfileChanged,
}: Pick<ProfileFeatureContext, 'session' | 'services' | 'section' | 'setSectionError' | 'onProfileChanged'>) {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);

  const [resumesLoading, setResumesLoading] = useState(false);

  const [resumeUploadLoading, setResumeUploadLoading] = useState(false);

  const [viewLoadingId, setViewLoadingId] = useState<string | number | null>(null);

  const [deleteLoadingId, setDeleteLoadingId] = useState<string | number | null>(null);

  const loadResumes = async () => {
    if (!session) {
      setSectionError('Please sign in again to manage resumes.');
      return;
    }

    try {
      setSectionError('');
      setResumesLoading(true);
      const data = await listStudentResumes(session);
      setResumes(data.resumes ?? []);
    } catch (resumeError) {
      setSectionError(resumeError instanceof Error ? resumeError.message : 'Unable to load resumes');
    } finally {
      setResumesLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'resumes') {
      loadResumes();
    }
  }, [section, session?.access, session?.user?.student_id]);

  const uploadNewResume = async () => {
    if (!session || !services) {
      setSectionError('Please sign in again to upload a resume.');
      return;
    }

    try {
      setResumeUploadLoading(true);
      setSectionError('');
      const file = await services.cv.pickFile();
      await services.cv.upload(session, file);
      await loadResumes();
      await onProfileChanged?.();
    } catch (uploadError) {
      setSectionError(uploadError instanceof Error ? uploadError.message : 'Unable to upload resume');
    } finally {
      setResumeUploadLoading(false);
    }
  };

  const downloadResume = async (resume: ResumeRecord) => {
    if (!session) {
      setSectionError('Please sign in again to view a resume.');
      return;
    }

    try {
      setViewLoadingId(resume.id);
      setSectionError('');

      const filename = (resume.original_filename || `resume-${resume.id}.pdf`).replace(
        /[^a-zA-Z0-9._-]/g,
        '_',
      );

      const resumeUrl = `${API_BASE_URL}/profile/resume/${encodeURIComponent(String(resume.id))}/`;

      if (Platform.OS === 'web') {
        const fileBlob = await downloadResumeFile(session, resume.id);
        const fileUrl = URL.createObjectURL(fileBlob);
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(fileUrl);
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      const downloaded = await FileSystem.downloadAsync(resumeUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${session.access}`,
        },
      });

      if (downloaded.status !== 200) {
        setSectionError(`Unable to open resume. Server returned ${downloaded.status}.`);
        return;
      }

      if (Platform.OS === 'android') {
        try {
          const contentUri = await FileSystem.getContentUriAsync(downloaded.uri);

          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1,
            type: 'application/pdf',
          });

          return;
        } catch {
          const sharingAvailable = await Sharing.isAvailableAsync();

          if (sharingAvailable) {
            await Sharing.shareAsync(downloaded.uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Open resume',
            });
            return;
          }

          setSectionError('No PDF viewer app found on this device.');
          return;
        }
      }

      const sharingAvailable = await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        setSectionError('Resume downloaded, but this device cannot open sharing options.');
        return;
      }

      await Sharing.shareAsync(downloaded.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Open resume',
        UTI: 'com.adobe.pdf',
      });
    } catch (downloadError) {
      setSectionError(downloadError instanceof Error ? downloadError.message : 'Unable to open resume');
    } finally {
      setViewLoadingId(null);
    }
  };

  const removeResume = async (resumeId: ResumeRecord['id']) => {
    if (!session) {
      setSectionError('Please sign in again to delete a resume.');
      return;
    }

    try {
      setDeleteLoadingId(resumeId);
      setSectionError('');
      await deleteResume(session, resumeId);
      await loadResumes();
      await onProfileChanged?.();
    } catch (deleteError) {
      setSectionError(deleteError instanceof Error ? deleteError.message : 'Unable to delete resume');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return {
    resumes,
    resumesLoading,
    resumeUploadLoading,
    viewLoadingId,
    deleteLoadingId,
    setDeleteLoadingId,
    loadResumes,
    uploadNewResume,
    downloadResume,
    removeResume,
  };
}
