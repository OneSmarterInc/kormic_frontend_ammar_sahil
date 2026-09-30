import { DocumentProgress, DocumentStatus, documentStatus } from '../components/DocumentProgress';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { OnboardingState } from '../models/onboarding';
import { OnboardingServices } from '../services/onboardingServices';
import { OnboardingAction } from '../state/onboardingReducer';
import { colors, fonts, radii, type } from '../theme/tokens';

interface CvScreenProps {
  state: OnboardingState;
  services: OnboardingServices;
  dispatch: React.Dispatch<OnboardingAction>;
  onContinue: () => void;
}

export function CvScreen({ state, services, dispatch, onContinue }: CvScreenProps) {
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState<DocumentStatus>();
  const [error, setError] = React.useState('');

  const pick = async () => {
    setError('');
    try {
      setLoading(true);
      const file = await services.cv.pickFile();
      dispatch({ type: 'SELECT_CV', file });
      setProgress({ stage: 'uploading', accepted: false });
      await services.cv.upload(state.authSession, file, { onProgress: job => setProgress(documentStatus(job)) });
      setProgress({ stage: 'completed', accepted: true });
    } catch (uploadError) {
      setProgress({ stage: 'failed', accepted: false });
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload CV');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      scroll={false}
      footer={
        <PrimaryButton
          label={progress?.stage === 'failed' ? 'Try upload again' : state.cvFile ? 'Continue' : 'Upload CV and update profile'}
          onPress={state.cvFile && progress?.stage !== 'failed' ? onContinue : pick}
          disabled={loading && !progress?.accepted}
          loading={loading && !progress?.accepted}
        />
      }
    >
      <View style={styles.content}>
        <View style={styles.glyph}>
          <Text style={styles.glyphText}>CV</Text>
        </View>
        <Text style={styles.title}>Upload your CV</Text>
        <Text style={styles.subhead}>Your resume agent extracts your name, contact details, education, experience, projects and skills. By uploading, you confirm that these details should update your profile. GitHub and LinkedIn remain separate.</Text>
        {state.cvFile ? (
          <View style={styles.fileCard}>
            <View style={styles.fileBadge}>
              <Text style={styles.fileBadgeText}>{state.cvFile.type.toUpperCase()}</Text>
            </View>
            <View style={styles.fileCopy}>
              <Text style={styles.fileName}>{state.cvFile.name}</Text>
              <Text style={styles.fileStatus}>{progress?.stage === 'completed' ? 'Profile updated' : 'Selected file'}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Remove CV" onPress={() => dispatch({ type: 'REMOVE_CV' })} hitSlop={8}>
              <Text style={styles.remove}>x</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.hint}>
            <Text style={styles.hintText}>Upload a PDF or DOCX résumé. Convert older DOC files to PDF first.</Text>
          </View>
        )}
        <DocumentProgress status={progress} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  glyph: {
    alignItems: 'center',
    backgroundColor: 'rgba(56,90,70,0.14)',
    borderColor: 'rgba(56,90,70,0.44)',
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    marginBottom: 18,
    width: 48,
  },
  glyphText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    textTransform: 'uppercase',
  },
  title: type.title,
  subhead: {
    ...type.body,
    marginTop: 12,
    marginBottom: 18,
  },
  hint: {
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    padding: 13,
  },
  hintText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
    padding: 14,
  },
  fileCopy: {
    flex: 1,
  },
  fileBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(56,90,70,0.15)',
    borderColor: 'rgba(56,90,70,0.34)',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  fileBadgeText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  fileName: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  fileStatus: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 3,
  },
  remove: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
});
