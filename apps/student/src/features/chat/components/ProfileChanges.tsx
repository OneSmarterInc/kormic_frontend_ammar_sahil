import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';

type Change = { id: string; kind: string; status: string; before: Record<string, unknown>; after: Record<string, unknown>; assumption_active?: boolean };
type Meta = { change_proposals?: Change[]; pending_changes?: Change[]; conversation_assumptions?: Record<string, unknown> };
const display = (value: unknown): string => value == null || value === '' ? 'Not set' : typeof value === 'object' ? JSON.stringify(value) : String(value);

export function ProfileChanges({ meta, current }: { meta?: Record<string, unknown>; current: Record<string, Change> }) {
  const data = meta as Meta | undefined;
  const changes = [...new Map([...(data?.pending_changes || []), ...(data?.change_proposals || [])].map(row => [row.id, current[row.id] || row])).values()];
  return <View>
    {changes.map(change => {
      const document = change.kind === 'student_document';
      const values = document ? ((change.after.facts || []) as {field: string; value: unknown}[]).map(fact => [fact.field, fact.value] as const) : Object.entries(change.after);
      const before = document ? change.before.profile as Record<string, unknown> : change.before;
      return <View key={change.id} style={styles.card}>
        <Text style={styles.title}>{document ? `${change.after.source_type === 'linkedin' ? 'LinkedIn' : 'Résumé'} update` : 'Profile update'}</Text>
        <Text style={styles.status}>{change.status === 'pending' ? 'Awaiting your confirmation' : change.status === 'applied' ? 'Saved' : change.assumption_active ? 'Saved profile unchanged · using a conversation assumption' : change.status}</Text>
        {document && <Text style={styles.value}>{String(change.after.filename || '')}</Text>}
        {values.map(([field, value]) => <View key={field} style={styles.field}>
          <Text style={styles.label}>{field.replaceAll('_', ' ').replace('preferences.', '')}</Text>
          {Object.hasOwn(before || {}, field) && <Text style={styles.previous}>Saved: {display(before[field])}</Text>}
          <Text style={styles.value}>{display(value)}</Text>
        </View>)}
        {change.status === 'pending' && <Text style={styles.hint}>Reply yes to save, no to decline, or tell me what to revise.</Text>}
      </View>;
    })}
  </View>;
}

export function profileChangeStates(messages: {meta?: Record<string, unknown>}[]) {
  const result: Record<string, Change> = {};
  for (const message of messages) {
    const meta = message.meta as Meta | undefined;
    for (const change of [...(meta?.pending_changes || []), ...(meta?.change_proposals || [])]) result[change.id] = change;
  }
  return result;
}

const styles = StyleSheet.create({
  card: { marginTop: 12, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  title: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  status: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.coral, marginTop: 4 },
  field: { marginTop: 9 }, label: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
  previous: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  value: { fontFamily: fonts.body, fontSize: 14, color: colors.text, marginTop: 2 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 12 },
});
