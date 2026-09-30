import { useEffect, useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthSession } from '../../../models/onboarding';
import { UniversityReference, readUniversityResearch } from '../../../services/api';
import { colors, fonts } from '../../../theme/tokens';
import { getLinkSegments } from './FormattedMessageText';

export function UniversityReferences({ meta, session, text = '' }: { meta?: Record<string, unknown>; session?: AuthSession; text?: string }) {
  const [expanded, setExpanded] = useState(false);
  const raw = meta?.university_references;
  const refs = (Array.isArray(raw) ? raw : []).filter((r): r is UniversityReference => r && typeof r.id === 'string' && typeof r.name === 'string' && typeof r.listed === 'boolean');
  const sources = new Map<string, string>();
  for (const segment of getLinkSegments(text)) {
    if (segment.url && !refs.some(ref => ref.url?.replace(/\/$/, '') === segment.url?.replace(/\/$/, ''))) sources.set(segment.url, segment.text);
  }
  if (!refs.length && !sources.size) return null;
  const count = refs.length + sources.size;
  return <View style={styles.stack}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Official sources used, ${count} ${count === 1 ? 'source' : 'sources'}`}
      accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.toggle}>
      <View style={styles.toggleText}>
        <Text style={styles.name}>Official sources used</Text>
        <Text style={styles.muted}>{count} {count === 1 ? 'source' : 'sources'} · {expanded ? 'Tap to hide' : 'Tap to explore'}</Text>
      </View>
      <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.coral} aria-hidden />
    </Pressable>
    {expanded ? <View style={styles.stack}>{refs.map(ref => <UniversityCard key={ref.id} initial={ref} session={session} />)}
    {[...sources].map(([url, label]) => {
      let host = '';
      try { host = new URL(url).hostname; } catch { return null; }
      const ref = refs.find(item => {
        try { const base = new URL(item.url).hostname.replace(/^www\./, ''); return host === base || host.endsWith('.' + base); } catch { return false; }
      });
      return <View key={url} style={styles.card}>
        <Text style={styles.name}>{ref?.name || host}</Text>
        {ref?.address ? <Text style={styles.muted}>{ref.address}</Text> : null}
        <Pressable accessibilityRole="link" accessibilityLabel={`${label}, ${host}`} onPress={() => void Linking.openURL(url).catch(() => undefined)}>
          <Text style={styles.link}>{label} ↗</Text>
        </Pressable>
        <Text style={styles.muted}>Referenced in this response</Text>
      </View>;
    })}</View> : null}
  </View>;
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
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56, padding: 12, borderWidth: 1, borderColor: '#e0e5dc', borderRadius: 10, backgroundColor: '#f6f8f2' },
  toggleText: { flex: 1, gap: 5 },
  stack: { gap: 8 }, card: { gap: 7, padding: 12, borderWidth: 1, borderColor: '#e0e5dc', borderRadius: 10, backgroundColor: '#f6f8f2' },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, name: { color: colors.offWhite, fontFamily: fonts.bodyMedium, fontSize: 14 },
  muted: { color: colors.muted, fontSize: 12 }, link: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
