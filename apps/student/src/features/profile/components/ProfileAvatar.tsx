import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';
import { getRenderableMediaUrl, isProtectedProfileImageUrl } from '../profileMedia';
import { getInitials } from '../profileValues';

export function ProfileAvatar({
  name,
  imageUrl,
  accessToken,
  loading = false,
  large = false,
}: {
  name: string;
  imageUrl?: string;
  accessToken?: string;
  loading?: boolean;
  large?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const normalizedUrl = getRenderableMediaUrl(imageUrl);

  const imageSource = normalizedUrl
    ? {
        uri: normalizedUrl,
        ...(accessToken && isProtectedProfileImageUrl(normalizedUrl)
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : {}),
      }
    : undefined;

  const closePreview = () => {
    setPreviewOpen(false);
    setZoom(1);
  };

  return (
    <>
      <Pressable
        accessibilityRole={imageSource ? 'imagebutton' : undefined}
        accessibilityLabel={imageSource ? `Open ${name}'s profile image` : undefined}
        disabled={!imageSource}
        onPress={() => setPreviewOpen(true)}
        style={[styles.avatar, large && styles.avatarLarge]}
      >
        {imageSource ? (
          <Image source={imageSource} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        )}

        {loading ? (
          <View style={styles.avatarLoading}>
            <ActivityIndicator color={colors.coral} size="small" />
          </View>
        ) : null}
      </Pressable>

      {/* Full-screen image preview */}
      <Modal transparent animationType="fade" visible={previewOpen} onRequestClose={closePreview}>
        <View style={styles.linkedinPreviewOverlay}>
          {/* Close button */}
          <Pressable
            onPress={closePreview}
            style={styles.linkedinPreviewClose}
            accessibilityRole="button"
            accessibilityLabel="Close image preview"
          >
            <Text style={styles.linkedinPreviewCloseText}>×</Text>
          </Pressable>

          {/* Zoom controls */}
          <View style={styles.linkedinZoomActions}>
            <Pressable
              onPress={() => setZoom((value) => Math.max(1, value - 0.5))}
              style={styles.linkedinZoomButton}
            >
              <Text style={styles.linkedinZoomText}>−</Text>
            </Pressable>

            <Text style={styles.linkedinZoomValue}>{Math.round(zoom * 100)}%</Text>

            <Pressable
              onPress={() => setZoom((value) => Math.min(4, value + 0.5))}
              style={styles.linkedinZoomButton}
            >
              <Text style={styles.linkedinZoomText}>+</Text>
            </Pressable>
          </View>

          {/* Zoomable image */}
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
                      height: 320 * zoom,
                    },
                  ]}
                  resizeMode="contain"
                />
              </ScrollView>
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: '#eef2e9',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  avatarLarge: {
    borderRadius: 42,
    height: 84,
    width: 84,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#eef2e9',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#385a46',
    fontFamily: fonts.heading,
    fontSize: 18,
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
