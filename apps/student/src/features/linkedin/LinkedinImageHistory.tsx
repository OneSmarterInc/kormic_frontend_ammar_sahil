import { DocumentProgress, DocumentStatus } from '../../components/DocumentProgress';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthSession, LinkedInScreenshot } from '../../models/onboarding';
import { getLinkedInImage, LinkedInHistoryRecord } from '../../services/api';
import { colors, fonts } from '../../theme/tokens';
import { isProtectedLinkedinImageUrl } from '../profile/profileMedia';
import { formatDate } from '../profile/profileValues';
import { getLinkedinRecordImageUri } from './linkedinData';
import { ExtractedGroup } from './ExtractedData';
import { hasExtractedValue } from './linkedinData';
import { MaterialIcons } from '@expo/vector-icons';

export function LinkedinImageHistory({
  session,
  loading,
  localPreviews,
  records,
  actionLoading,
  onRefresh,
  extractedData,
  onUpload,
  error,
  progress,
  onContinue,
}: {
  session?: AuthSession;
  loading: boolean;
  localPreviews: LinkedInScreenshot[];
  records: LinkedInHistoryRecord[];
  actionLoading: boolean;
  onRefresh: () => void;
  extractedData?: Record<string, unknown>;
  onUpload: () => void;
  error?: string;
  progress?: DocumentStatus;
  onContinue?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const latestData = extractedData ?? records.find((record) => record.extracted_data)?.extracted_data;
  const hiddenKeys = new Set(['agent_trace', 'source_files', 'input_files', 'source', 'verified', 'schema_version', 'parser_engine', 'evidence', 'warnings', 'experiences']);
  const profileData = { ...latestData, experience: latestData?.experience ?? latestData?.experiences };
  const groups = [
    { title: 'Profile', keys: ['name', 'headline', 'location', 'email', 'phone', 'about'] },
    { title: 'Experience', keys: ['experience'] },
    { title: 'Education', keys: ['education'] },
    { title: 'Skills', keys: ['skills'] },
    { title: 'Projects', keys: ['projects'] },
    { title: 'Certifications', keys: ['certifications'] },
    { title: 'Posts', keys: ['posts'] },
  ];
  const groupedKeys = new Set(groups.flatMap((group) => group.keys));
  const data = profileData as Record<string, unknown>;
  const otherDetails = Object.entries(data).filter(([key, value]) => !hiddenKeys.has(key) && !groupedKeys.has(key) && hasExtractedValue(value));
  const hasDetails = Object.entries(data).some(([key, value]) => !hiddenKeys.has(key) && hasExtractedValue(value));
  const [authorizedImageUris, setAuthorizedImageUris] = useState<Record<string, string>>({});
  const savedImages = records
    .map((record, index) => ({
      id: String(
        record.id ??
          record.image_url ??
          record.image ??
          record.file_path ??
          record.filename ??
          `linkedin-${index}`,
      ),
      title: String(record.original_filename ?? record.filename ?? 'LinkedIn screenshot'),
      uri: getLinkedinRecordImageUri(record),
      createdAt: typeof record.created_at === 'string' ? record.created_at : undefined,
    }))
    .filter((record) => Boolean(record.uri));

  useEffect(() => {
    let cancelled = false;
    let objectUrls: string[] = [];

    const loadAuthorizedImages = async () => {
      if (!expanded || Platform.OS !== 'web' || !session || typeof URL === 'undefined') {
        setAuthorizedImageUris({});
        return;
      }

      const protectedImages = savedImages.filter((image) =>
        image.uri ? isProtectedLinkedinImageUrl(image.uri) : false,
      );
      if (protectedImages.length === 0) {
        setAuthorizedImageUris({});
        return;
      }

      const entries = await Promise.all(
        protectedImages.map(async (image) => {
          try {
            const blob = await getLinkedInImage(session, image.uri ?? '');
            const objectUrl = URL.createObjectURL(blob);
            objectUrls = [...objectUrls, objectUrl];
            return [image.id, objectUrl] as const;
          } catch {
            return [image.id, ''] as const;
          }
        }),
      );

      if (cancelled) {
        objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
        return;
      }

      setAuthorizedImageUris(Object.fromEntries(entries.filter(([, uri]) => Boolean(uri))));
    };

    loadAuthorizedImages();

    return () => {
      cancelled = true;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [expanded, records, session?.access, session?.user?.student_id]);

  return (
    <View style={styles.page}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Your LinkedIn profile</Text>
        <Text style={styles.introText}>Review your experience, education and skills, or upload updated profile screenshots.</Text>
      </View>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" onPress={onUpload} disabled={actionLoading || loading}
          accessibilityState={{ disabled: actionLoading || loading, busy: actionLoading }}
          style={[styles.uploadButton, (actionLoading || loading) && styles.disabledButton]}>
          {actionLoading ? <ActivityIndicator color="#ffffff" size="small" /> : <MaterialIcons name="file-upload" size={20} color="#ffffff" />}
          <Text style={styles.uploadText}>{actionLoading ? 'Extracting profile…' : 'Upload screenshots'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh LinkedIn information" onPress={onRefresh}
          disabled={loading || actionLoading} style={[styles.refreshButton, (loading || actionLoading) && styles.disabledButton]}>
          {loading ? <ActivityIndicator color={colors.text} size="small" /> : <MaterialIcons name="refresh" size={22} color={colors.text} />}
        </Pressable>
      </View>
      <DocumentProgress status={progress} onContinue={onContinue} />
      {localPreviews.length > 0 ? <View style={styles.linkedinGrid}>{localPreviews.map(preview => <LinkedinImageCard key={preview.id} title={preview.name || preview.label || 'Selected image'} uri={preview.uri} />)}</View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
      {hasDetails ? <View style={styles.details}>
        {groups.map((group) => {
          const entries = group.keys.filter((key) => hasExtractedValue(data[key])).map((key) => [key, data[key]] as [string, unknown]);
          return entries.length ? <ExtractedGroup key={group.title} title={group.title} entries={entries} /> : null;
        })}
        {otherDetails.length ? <ExtractedGroup title="Additional details" entries={otherDetails} /> : null}
      </View> : !loading ? <View style={styles.linkedinHistory}>
        <Text style={styles.cardTitle}>Build your LinkedIn overview</Text>
        <Text style={styles.introText}>Upload clear screenshots of your profile to see the extracted information here.</Text>
      </View> : null}
      {Array.isArray(latestData?.warnings) && latestData.warnings.length > 0 ?
        <Text style={styles.metaText}>Some details could not be extracted. Review the information and upload clearer screenshots if anything is missing.</Text> : null}
      <View style={styles.linkedinHistory}>
        <Pressable style={styles.galleryToggle} accessibilityRole="button"
          accessibilityLabel="Uploaded screenshots" accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}>
          <MaterialIcons name="photo-library" size={21} color={colors.textSoft} />
          <Text style={styles.galleryTitle}>Uploaded screenshots</Text>
          <Text style={styles.metaText}>{savedImages.length || localPreviews.length}</Text>
          <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={24} color={colors.textSoft} />
        </Pressable>

      {expanded && savedImages.length > 0 ? (
        <View style={styles.linkedinPreviewBlock}>
          <View style={styles.linkedinGrid}>
            {savedImages.map((image) => (
              <LinkedinImageCard
                key={image.id}
                title={image.title}
                uri={
                  image.uri && isProtectedLinkedinImageUrl(image.uri)
                    ? Platform.OS === 'web'
                      ? authorizedImageUris[image.id]
                      : image.uri
                    : image.uri
                }
                accessToken={
                  image.uri && isProtectedLinkedinImageUrl(image.uri) ? session?.access : undefined
                }
                caption={image.createdAt ? `Uploaded ${formatDate(image.createdAt)}` : undefined}
              />
            ))}
          </View>
        </View>
      ) : null}

      {expanded && !loading && localPreviews.length === 0 && savedImages.length === 0 ? (
        <Text style={styles.emptyText}>No uploaded LinkedIn images found yet.</Text>
      ) : null}
    </View>
    </View>
  );
}

export function LinkedinImageCard({
  title,
  uri,
  caption,
  accessToken,
}: {
  title: string;
  uri?: string;
  caption?: string;
  accessToken?: string;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const closePreview = () => {
    setPreviewOpen(false);
    setZoom(1);
  };

  const imageSource = uri
    ? {
        uri,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      }
    : undefined;

  return (
    <Pressable
      accessibilityRole={uri ? 'imagebutton' : undefined}
      accessibilityLabel={uri ? `Open ${title}` : undefined}
      disabled={!uri}
      onPress={() => setPreviewOpen(true)}
      style={styles.linkedinImageCard}
    >
      {imageSource ? (
        <Image source={imageSource} style={styles.linkedinImage} resizeMode="cover" />
      ) : (
        <View style={styles.linkedinImagePlaceholder} />
      )}

      <Text numberOfLines={2} style={styles.linkedinImageTitle}>
        {title}
      </Text>
      {caption ? <Text style={styles.metaText}>{caption}</Text> : null}

      <Modal transparent animationType="fade" visible={previewOpen} onRequestClose={closePreview}>
        <View style={styles.linkedinPreviewOverlay}>
          <Pressable onPress={closePreview} style={styles.linkedinPreviewClose}>
            <Text style={styles.linkedinPreviewCloseText}>x</Text>
          </Pressable>

          <View style={styles.linkedinZoomActions}>
            <Pressable
              onPress={() => setZoom((value) => Math.max(1, value - 0.5))}
              style={styles.linkedinZoomButton}
            >
              <Text style={styles.linkedinZoomText}>-</Text>
            </Pressable>
            <Text style={styles.linkedinZoomValue}>{Math.round(zoom * 100)}%</Text>
            <Pressable
              onPress={() => setZoom((value) => Math.min(4, value + 0.5))}
              style={styles.linkedinZoomButton}
            >
              <Text style={styles.linkedinZoomText}>+</Text>
            </Pressable>
          </View>

          {imageSource ? (
            <ScrollView
              style={styles.linkedinZoomScroll}
              contentContainerStyle={styles.linkedinZoomVerticalContent}
              showsVerticalScrollIndicator
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                contentContainerStyle={styles.linkedinZoomHorizontalContent}
              >
                <Image
                  source={imageSource}
                  style={[
                    styles.linkedinPreviewImage,
                    {
                      width: 320 * zoom,
                      height: 480 * zoom,
                    },
                  ]}
                  resizeMode="contain"
                />
              </ScrollView>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { gap: 16 },
  intro: { backgroundColor: 'rgba(56,90,70,0.08)', borderColor: 'rgba(56,90,70,0.18)', borderWidth: 1, borderRadius: 12, padding: 18, gap: 8 },
  introTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, lineHeight: 28 },
  introText: { color: colors.textSoft, fontFamily: fonts.body, fontSize: 15, lineHeight: 23 },
  toolbar: { flexDirection: 'row', gap: 10 },
  uploadButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.coral, borderRadius: 12, minHeight: 52, paddingHorizontal: 12 },
  uploadText: { color: '#ffffff', fontFamily: fonts.bodyMedium, fontSize: 15 },
  refreshButton: { minHeight: 52, width: 52, borderRadius: 12, borderWidth: 1, borderColor: '#e7e9e2', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  errorText: { color: colors.error, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  details: { gap: 12 },
  galleryToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  galleryTitle: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
  smallButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(214, 6, 6, 0.14)',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  smallButtonText: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.45,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 17,
    lineHeight: 23,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  linkedinHistory: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  linkedinHistoryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  linkedinHistoryTitleWrap: {
    flex: 1,
  },
  linkedinPreviewBlock: {
    gap: 9,
  },
  linkedinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  linkedinImageCard: {
    backgroundColor: '#eef2e9',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    overflow: 'hidden',
    padding: 8,
    width: '47%',
  },
  linkedinImage: {
    aspectRatio: 0.78,
    backgroundColor: '#ffffff',
    borderRadius: 7,
    width: '100%',
  },
  linkedinImagePlaceholder: {
    aspectRatio: 0.78,
    backgroundColor: '#ffffff',
    borderRadius: 7,
    width: '100%',
  },
  linkedinImageTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  extractedSectionTitle: {
    color: '#536149',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  metaText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  linkedinPreviewOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(250,249,246,0.98)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  linkedinPreviewClose: {
    alignItems: 'center',
    backgroundColor: '#e7e9e2',
    borderColor: '#e7e9e2',
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: 38,
    width: 44,
    zIndex: 2,
  },
  linkedinPreviewCloseText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 22,
    lineHeight: 24,
  },
  linkedinZoomScroll: {
    flex: 1,
    width: '100%',
  },
  linkedinPreviewImage: {
    width: 320,
    height: 480,
  },
  linkedinZoomVerticalContent: {
    minHeight: '100%',
  },
  linkedinZoomHorizontalContent: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    padding: 16,
  },
  linkedinZoomActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    bottom: 54,
    zIndex: 3,
  },
  linkedinZoomButton: {
    alignItems: 'center',
    backgroundColor: '#e7e9e2',
    borderColor: '#e7e9e2',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  linkedinZoomText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 22,
  },
  linkedinZoomValue: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});
