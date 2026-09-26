import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthSession } from '../../../models/onboarding';
import { UniversityReference, readUniversityResearch } from '../../../services/api';
import { colors, fonts } from '../../../theme/tokens';

export function UniversityReferences({ meta, session }: { meta?: Record<string, unknown>; session?: AuthSession }) {
  const raw = meta?.university_references;
  if (!Array.isArray(raw)) return null;
  const refs = raw.filter((r): r is UniversityReference => r && typeof r.id === 'string' && typeof r.name === 'string' && typeof r.listed === 'boolean');
  return <View style={styles.stack}>{refs.map(ref => <UniversityCard key={ref.id} initial={ref} session={session} />)}</View>;
}

function UniversityCard({ initial, session }: { initial: UniversityReference; session?: AuthSession }) {
  const researchId = initial.research_id || (initial.id.startsWith('public:') ? initial.id : '');
  const [ref, setRef] = useState(initial);
  useEffect(() => { setRef(initial); }, [initial]);
  useEffect(() => {
    if (!session || !researchId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await readUniversityResearch(session, researchId);
        if (!active) return;
        setRef(next);
        if (next.processing) timer = setTimeout(() => void poll(), 5000);
      } catch { /* Keep the saved source date visible when a status poll fails. */ }
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [session, researchId]);
  return <View style={styles.card}>
    <View style={styles.row}>
      <Text style={styles.name}>{ref.name}</Text>
    </View>
    {ref.address ? <Text style={styles.muted}>{ref.address}</Text> : null}
    {ref.url && /^https?:\/\//i.test(ref.url) ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(ref.url)}><Text style={styles.link}>Official university website ↗</Text></Pressable> : null}
    {researchId ? <>
      <Text style={styles.muted}>{ref.updated_at ? `Sources collected ${new Date(ref.updated_at).toLocaleDateString()}${ref.stale ? ' · May be outdated' : ''}` : 'Official website research pending'}</Text>
      {ref.processing ? <View accessibilityLiveRegion="polite" style={styles.row}><ActivityIndicator size="small" color={colors.coral} /><Text style={styles.muted}>{ref.progress || 'Information is being processed…'}</Text></View> : null}
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: 8 }, card: { gap: 7, padding: 12, borderWidth: 1, borderColor: '#e0e5dc', borderRadius: 10, backgroundColor: '#f6f8f2' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, name: { color: colors.offWhite, fontFamily: fonts.bodyMedium, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 12 }, link: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
