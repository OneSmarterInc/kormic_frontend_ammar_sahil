import { useEffect, useState } from 'react';
import { deleteProfileImage, getProfileImage, uploadProfileImage } from '../../services/api';
import { getRenderableMediaUrl, toProfileImageFile } from './profileMedia';
import { ProfileFeatureContext } from './types';

export function useProfileImage({
  session,
  services,
  profile,
  setSectionError,
  onProfileChanged,
}: Pick<ProfileFeatureContext, 'session' | 'services' | 'profile' | 'setSectionError' | 'onProfileChanged'>) {
  const [profileImageUrl, setProfileImageUrl] = useState(
    getRenderableMediaUrl(profile.profile_image_url) ?? '',
  );

  const [profileImageLoading, setProfileImageLoading] = useState(false);

  const [replaceImageLoading, setReplaceImageLoading] = useState(false);

  const [deleteImageLoading, setDeleteImageLoading] = useState(false);

  const loadProfileImage = async () => {
    if (!session) {
      return;
    }

    try {
      setProfileImageLoading(true);
      const imageBlob = await getProfileImage(session);
      if (imageBlob.type.includes('application/json')) {
        const data = JSON.parse(await imageBlob.text()) as { profile_image_url?: string | null };

        if (data.profile_image_url) {
          setProfileImageUrl(`${data.profile_image_url}?t=${Date.now()}`);
        }

        return;
      }

      const dataUri = await blobToDataUri(imageBlob);
      setProfileImageUrl(dataUri);
    } catch {
      setProfileImageUrl(getRenderableMediaUrl(profile.profile_image_url) ?? '');
    } finally {
      setProfileImageLoading(false);
    }
  };

  function blobToDataUri(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Unable to read profile image'));
      };

      reader.onerror = () => reject(new Error('Unable to read profile image'));
      reader.readAsDataURL(blob);
    });
  }

  useEffect(() => {
    loadProfileImage();
  }, [session?.access, session?.user?.student_id, profile.profile_image_url]);

  const replaceProfileImage = async () => {
    if (!session || !services) {
      setSectionError('Please sign in again to update your profile image.');
      return;
    }

    try {
      setReplaceImageLoading(true);
      setSectionError('');

      console.log('Session access token exists:', !!session.access);
      console.log('Student ID:', session.user?.student_id);

      const [image] = await services.linkedin.pickScreenshots(0);
      if (!image) {
        throw new Error('Choose a profile image before uploading.');
      }
      const response = await uploadProfileImage(session, toProfileImageFile(image));

      const previewUrl =
        getRenderableMediaUrl(image.uri) ?? getRenderableMediaUrl(response.profile_image_url);

      if (previewUrl) {
        setProfileImageUrl(`${previewUrl}?t=${Date.now()}`);
      }

      await onProfileChanged?.({
        ...profile,
        profile_image_url: response.profile_image_url ?? profile.profile_image_url,
      });

      await loadProfileImage();
    } catch (imageError) {
      setSectionError(imageError instanceof Error ? imageError.message : 'Unable to upload profile image');
    } finally {
      setReplaceImageLoading(false);
    }
  };

  const removeProfileImage = async () => {
    if (!session) {
      setSectionError('Please sign in again to delete your profile image.');
      return;
    }

    try {
      setDeleteImageLoading(true);
      setSectionError('');
      await deleteProfileImage(session);
      setProfileImageUrl('');
      await onProfileChanged?.();
    } catch (imageError) {
      setSectionError(imageError instanceof Error ? imageError.message : 'Unable to delete profile image');
    } finally {
      setDeleteImageLoading(false);
    }
  };
  useEffect(() => {
    setProfileImageUrl(getRenderableMediaUrl(profile.profile_image_url) ?? '');
  }, [profile]);
  return {
    profileImageUrl,
    setProfileImageUrl,
    profileImageLoading,
    replaceImageLoading,
    deleteImageLoading,
    replaceProfileImage,
    removeProfileImage,
  };
}
