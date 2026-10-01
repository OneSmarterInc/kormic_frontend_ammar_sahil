import { DocumentProgress, DocumentStatus } from '../../../components/DocumentProgress';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { SectionLabel } from '../../../components/SectionLabel';
import { ResumeRecord } from '../../../services/api';
import { colors, fonts } from '../../../theme/tokens';
import { ExtractedGroup } from '../../linkedin/ExtractedData';
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
  progress,
  pendingFilename,
  onContinue,
}: {
  progress?: DocumentStatus;
  pendingFilename?: string;
  onContinue?: () => void;
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
  const [confirmUpload, setConfirmUpload] = useState(false);
  return (
    <View style={styles.form}>
      <View style={styles.resumeIntroCard}>
        <Text style={styles.resumeIntroTitle}>Your resume</Text>
        <Text style={styles.sectionIntro}>
          Your resume is the primary source for your profile. Review your name, contact details, education, experience, projects and skills below, or upload an updated PDF or DOCX.
        </Text>
      </View>
      <View style={styles.resumeActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={uploadLoading ? 'Uploading resume' : 'Upload new resume'}
          accessibilityState={{ disabled: uploadLoading, busy: uploadLoading }}
          disabled={uploadLoading}
          onPress={() => setConfirmUpload(true)}
          style={[styles.resumeUploadButton, uploadLoading && styles.resumeUploadButtonLoading]}
        >
          {uploadLoading ? (
            <>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.resumeUploadButtonText}>Reading and extracting your resume…</Text>
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
      <DocumentProgress status={progress} filename={pendingFilename} onContinue={onContinue} />
      {confirmUpload ? <View style={styles.resumeIntroCard}>
        <Text style={styles.resumeIntroTitle}>Update your profile from a resume?</Text>
        <Text style={styles.sectionIntro}>Extracted details, including your name and projects, will replace matching profile fields. Your sign-in email, GitHub and LinkedIn records stay separate. Missing details will not erase existing information.</Text>
        <PrimaryButton label="Choose resume and update profile" onPress={() => { setConfirmUpload(false); onUpload(); }} />
        <PrimaryButton label="Cancel" variant="secondary" onPress={() => setConfirmUpload(false)} />
      </View> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading ? <ActivityIndicator color={colors.coral} /> : null}
      {!loading && !pendingFilename && resumes.length === 0 ? (
        <Text style={styles.emptyText}>No resumes uploaded yet.</Text>
      ) : null}
      {resumes.map((resume) => (
        <View key={String(resume.id)} style={styles.resumeCard}>
          <View style={styles.resumeHeader}>
            <View style={styles.fileBadge}>
              <Text style={styles.fileBadgeText}>{resume.original_filename?.split('.').pop()?.toUpperCase() || 'FILE'}</Text>
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
          <ResumeDetails data={resume.extracted_data || {}} />
        </View>
      ))}
    </View>
  );
}

function ResumeDetails({data}: {data: Record<string, unknown>}) {
 const groups = [
  {title:'Profile', keys:['name','email','phone','location','summary','about']},
  {title:'Education', keys:['education']},
  {title:'Experience', keys:['experience','work_experience']},
  {title:'Skills', keys:['skills','technical_skills']},
  {title:'Projects', keys:['projects']},
  {title:'Certifications & achievements', keys:['certifications','achievements','awards']},
 ];
 const hidden = new Set(['agent_trace','schema_version','parser_engine','parser_status','document_sha256','evidence','source_files','warnings']);
 const used = new Set(groups.flatMap(g=>g.keys));
 const present = (value: unknown) => value != null && value !== '' && (!Array.isArray(value) || value.length > 0);
 const other = Object.entries(data).filter(([key,value])=>!hidden.has(key)&&!used.has(key)&&present(value));
 return <View style={{gap:16}}>{groups.map(g=>{const entries=g.keys.filter(k=>present(data[k])).map(k=>[k,data[k]] as [string,unknown]);return entries.length?<ExtractedGroup key={g.title} title={g.title} entries={entries}/>:null;})}{other.length?<ExtractedGroup title="Additional details" entries={other}/>:null}</View>;
}

const styles = StyleSheet.create({
  sectionIntro: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  resumeIntroCard: {
    backgroundColor: 'rgba(56,90,70,0.10)',
    borderColor: 'rgba(56,90,70,0.22)',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  resumeIntroTitle: {
    color: colors.text,
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
    gap: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(214, 6, 6, 0.14)',
    borderRadius: 16,
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
    borderColor: 'rgba(162,59,50,0.45)',
    backgroundColor: 'rgba(162,59,50,0.08)',
  },
  dangerButtonText: {
    color: colors.error,
  },
  disabledButton: {
    opacity: 0.45,
  },
  resumeCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 16,
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
    backgroundColor: 'rgba(56,90,70,0.15)',
    borderColor: 'rgba(56,90,70,0.34)',
    borderRadius: 16,
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
    marginBottom: 4,
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
    color: '#ffffff',
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
});
