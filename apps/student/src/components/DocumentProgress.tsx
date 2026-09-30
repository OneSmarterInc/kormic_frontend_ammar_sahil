import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AgentJob } from '../services/agentJobs';
import { colors, fonts } from '../theme/tokens';

export type DocumentStatus = { stage: string; accepted: boolean };
export function documentStatus(job: AgentJob<unknown>): DocumentStatus {
  return { stage: job.status === 'completed' || job.status === 'failed' ? job.status : job.progress?.stage || (job.status === 'queued' ? 'queued' : 'reading'), accepted: Boolean(job.job_id) };
}
const labels: Record<string, string> = {
  uploading: 'Uploading your file…', queued: 'Upload received. Waiting for your document agent…',
  reading: 'Reading your uploaded files…', extracting: 'Extracting your profile details…',
  saving: 'Updating your profile…', completed: 'Your profile is ready.',
  failed: 'Processing could not finish. Please try again.',
};
export function DocumentProgress({ status, filename, onContinue }: { status?: DocumentStatus; filename?: string; onContinue?: () => void }) {
  if (!status) return null;
  const busy = !['completed', 'failed'].includes(status.stage);
  return <View style={styles.card}>
    <View style={styles.row}>
      {busy ? <ActivityIndicator color={colors.coral} /> : <MaterialIcons name={status.stage === 'completed' ? 'check-circle-outline' : 'info-outline'} size={24} color={colors.coral} />}
      <View style={styles.copy}>
        {filename ? <Text style={styles.filename} numberOfLines={2}>{filename}</Text> : null}
        <Text accessibilityLiveRegion="polite" style={styles.label}>{labels[status.stage] || labels.reading}</Text>
      </View>
    </View>
    {busy && status.accepted ? <Text style={styles.hint}>You can continue using the app while your agent works.</Text> : null}
    {busy && status.accepted && onContinue ? <Pressable accessibilityRole="button" onPress={onContinue} style={styles.button}><Text style={styles.link}>Continue in background</Text></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#f0f5ef', borderWidth: 1, borderColor: '#dce5d9', borderRadius: 14, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, copy: { flex: 1, gap: 4 },
  filename: { fontFamily: fonts.bodyMedium, color: colors.text, fontSize: 15 },
  label: { fontFamily: fonts.body, color: colors.text, fontSize: 14, lineHeight: 21 },
  hint: { fontFamily: fonts.body, color: colors.textSoft, fontSize: 13, lineHeight: 20 },
  button: { minHeight: 44, justifyContent: 'center' }, link: { fontFamily: fonts.bodyMedium, color: colors.coral, fontSize: 15 },
});
