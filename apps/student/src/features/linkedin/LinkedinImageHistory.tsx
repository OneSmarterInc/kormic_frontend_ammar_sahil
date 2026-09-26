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

export function LinkedinImageHistory({
  session,
  loading,
  localPreviews,
  records,
  actionLoading,
  onRefresh,
}: {
  session?: AuthSession;
  loading: boolean;
  localPreviews: LinkedInScreenshot[];
  records: LinkedInHistoryRecord[];
  actionLoading: boolean;
  onRefresh: () => void;
}) {
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
      if (!session || typeof URL === 'undefined') {
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
  }, [records, session?.access, session?.user?.student_id]);

  return (
    <View style={styles.linkedinHistory}>
      <View style={styles.linkedinHistoryHeader}>
        <View style={styles.linkedinHistoryTitleWrap}>
          <Text style={styles.cardTitle}>Uploaded screenshots</Text>
          <Text style={styles.metaText}>Review the LinkedIn images used for profile analysis.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRefresh}
          disabled={loading || actionLoading}
          style={[styles.smallButton, (loading || actionLoading) && styles.disabledButton]}
        >
          {loading ? (
            <ActivityIndicator color={colors.offWhite} size="small" />
          ) : (
            <Text style={styles.smallButtonText}>Refresh</Text>
          )}
        </Pressable>
      </View>

      {localPreviews.length > 0 ? (
        <View style={styles.linkedinPreviewBlock}>
          <Text style={styles.extractedSectionTitle}>Just uploaded</Text>
          <View style={styles.linkedinGrid}>
            {localPreviews.map((preview) => (
              <LinkedinImageCard
                key={preview.id}
                title={preview.label || preview.name || 'Selected image'}
                uri={preview.uri}
              />
            ))}
          </View>
        </View>
      ) : null}

      {savedImages.length > 0 ? (
        <View style={styles.linkedinPreviewBlock}>
          <Text style={styles.extractedSectionTitle}>Saved images</Text>
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

      {!loading && localPreviews.length === 0 && savedImages.length === 0 ? (
        <Text style={styles.emptyText}>No uploaded LinkedIn images found yet.</Text>
      ) : null}
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
    color: colors.offWhite,
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
    marginTop: 14,
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
