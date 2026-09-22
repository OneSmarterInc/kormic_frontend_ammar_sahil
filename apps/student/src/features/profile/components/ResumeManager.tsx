import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SectionLabel } from '../../../components/SectionLabel';
import { ResumeRecord } from '../../../services/api';
import { colors, fonts } from '../../../theme/tokens';
import { ExtractedData } from '../../linkedin/ExtractedData';
import { formatDate } from '../profileValues';

export function ResumeManager({
  resumes,
  loading,
  viewLoadingId,
  deleteLoadingId,
  uploadLoading,
  error,
  onUpload,
  onDownload,
  onDelete,
  onRefresh,
}: {
  resumes: ResumeRecord[];
  loading: boolean;
  viewLoadingId: string | number | null;
  deleteLoadingId: string | number | null;
  uploadLoading: boolean;
  error: string;
  onUpload: () => void;
  onDownload: (resume: ResumeRecord) => void;
  onDelete: (resumeId: ResumeRecord['id']) => void;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.form}>
      <View style={styles.resumeIntroCard}>
        <Text style={styles.resumeIntroTitle}>Resume history</Text>
        <Text style={styles.sectionIntro}>
          Upload a new resume, review previous files, and inspect the parsed profile data from each upload.
        </Text>
      </View>
      <View style={styles.resumeActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uploadLoading ? 'Uploading resume' : 'Upload new resume'}
          accessibilityState={{ disabled: uploadLoading, busy: uploadLoading }}
          disabled={uploadLoading}
          onPress={onUpload}
          style={[styles.resumeUploadButton, uploadLoading && styles.resumeUploadButtonLoading]}
        >
          {uploadLoading ? (
            <>
              <ActivityIndicator color="#1A0F0A" size="small" />
              <Text style={styles.resumeUploadButtonText}>Uploading...</Text>
            </>
          ) : (
            <Text style={styles.resumeUploadButtonText}>Upload new resume</Text>
          )}
        </Pressable>
        <PrimaryButton
          label="Refresh resumes"
          onPress={onRefresh}
          variant="secondary"
          disabled={loading || uploadLoading}
          loading={loading}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.coral} /> : null}
      {!loading && resumes.length === 0 ? (
        <Text style={styles.emptyText}>No resumes uploaded yet.</Text>
      ) : null}
      {resumes.map((resume) => (
        <View key={String(resume.id)} style={styles.resumeCard}>
          <View style={styles.resumeHeader}>
            <View style={styles.fileBadge}>
              <Text style={styles.fileBadgeText}>PDF</Text>
            </View>
            <View style={styles.resumeTitleWrap}>
              <Text style={styles.cardTitle}>{resume.original_filename || `Resume ${resume.id}`}</Text>
              <Text style={styles.metaText}>Uploaded {formatDate(resume.created_at)}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={viewLoadingId !== null || deleteLoadingId !== null}
              onPress={() => onDownload(resume)}
              style={[styles.smallButton, viewLoadingId === resume.id && styles.disabledButton]}
            >
              {viewLoadingId === resume.id ? (
                <ActivityIndicator color={colors.offWhite} />
              ) : (
                <Text style={styles.smallButtonText}>View</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={viewLoadingId !== null || deleteLoadingId !== null}
              onPress={() => onDelete(resume.id)}
              style={[
                styles.smallButton,
                styles.dangerButton,
                deleteLoadingId === resume.id && styles.disabledButton,
              ]}
            >
              {deleteLoadingId === resume.id ? (
                <ActivityIndicator color={colors.error} />
              ) : (
                <Text style={[styles.smallButtonText, styles.dangerButtonText]}>Delete</Text>
              )}
            </Pressable>
          </View>
          <SectionLabel>Extracted data</SectionLabel>
          <ExtractedData data={resume.extracted_data} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionIntro: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  resumeIntroCard: {
    backgroundColor: 'rgba(91,141,239,0.10)',
    borderColor: 'rgba(91,141,239,0.22)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  resumeIntroTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 27,
  },
  resumeActions: {
    gap: 10,
  },
  errorText: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  form: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
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
  dangerButton: {
    borderColor: 'rgba(255,176,157,0.45)',
    backgroundColor: 'rgba(255,176,157,0.08)',
  },
  dangerButtonText: {
    color: colors.error,
  },
  disabledButton: {
    opacity: 0.45,
  },
  resumeCard: {
    backgroundColor: 'rgba(255,255,255,0.052)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 15,
  },
  resumeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  fileBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,74,0.15)',
    borderColor: 'rgba(255,107,74,0.34)',
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  fileBadgeText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  resumeTitleWrap: {
    flex: 1,
    gap: 2,
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
  metaText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  resumeUploadButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  resumeUploadButtonLoading: {
    opacity: 0.78,
  },
  resumeUploadButtonText: {
    color: '#1A0F0A',
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
});
