import { LinkedInScreenshot } from '../../models/onboarding';
import { API_BASE_URL, ProfileImageFile } from '../../services/api';

export function normalizeMediaUrl(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value) || value.startsWith('blob:') || value.startsWith('data:')) {
    return value;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${apiOrigin}${value.startsWith('/') ? value : `/${value}`}`;
}

export function getRenderableMediaUrl(value: string | null | undefined) {
  return normalizeMediaUrl(value);
}

export function isProtectedProfileImageUrl(value: string) {
  return /\/api\/profile\/[^/]+\/image\/?(?:\?.*)?$/i.test(value);
}

export function isProtectedLinkedinImageUrl(value: string) {
  return /\/api\/profile\/linkedin\/[^/]+\/images\/[^/]+\/?$/i.test(value);
}

export function toProfileImageFile(image: LinkedInScreenshot): ProfileImageFile {
  return {
    uri: image.uri,
    name: image.name || image.label || 'profile-image.jpg',
    type: image.type || 'image/jpeg',
    file: image.file,
  };
}
