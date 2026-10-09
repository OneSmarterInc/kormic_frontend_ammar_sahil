import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthSession } from '../../models/onboarding';
import { getGithubRepositories, refreshGithubRepositories, GithubRepositoryPage } from '../../services/api';
import { colors, fonts } from '../../theme/tokens';

const LIMIT = 5;

export function GithubRepositoryPicker({ session, selected, onChange, onReadyChange, disabled = false }: {
  session: AuthSession;
  selected: number[];
  onChange: (ids: number[]) => void;
  onReadyChange: (ready: boolean) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<GithubRepositoryPage>();
  const [names, setNames] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const initialized = useRef(false);
  const callbacks = useRef({ onChange, onReadyChange });
  callbacks.current = { onChange, onReadyChange };
  const collecting = data?.sync?.mode === 'inventory' && ['queued', 'running'].includes(data.sync.status || '');

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    initialized.current = false;
    setRefreshing(true);
    setData(undefined);
    callbacks.current.onChange([]);
    refreshGithubRepositories(session).then(() => {
      if (active) setRevision(value => value + 1);
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'Unable to collect repository names.');
    }).finally(() => { if (active) setRefreshing(false); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (refreshing) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    getGithubRepositories(session, page, query).then(response => {
      if (!active) return;
      setData(response);
      setError('');
      setNames(previous => Object.fromEntries([
        ...Object.entries(previous),
        ...[...response.results, ...(response.selected_repositories || [])].map(row => [row.id, row.name]),
      ]));
      if (!initialized.current) {
        callbacks.current.onChange((response.selected_repositories || []).slice(0, LIMIT).map(row => row.id));
        initialized.current = true;
      }
      if (response.sync?.mode === 'inventory' && ['queued', 'running'].includes(response.sync.status || '')) {
        timer = setTimeout(() => setRevision(value => value + 1), 2000);
      } else if (response.sync?.mode === 'inventory' && response.sync.status === 'failed') {
        setError(response.sync.error || 'Repository collection failed. Please retry.');
      }
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'Unable to load repositories.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [session, page, query, revision, refreshing]);

  useEffect(() => {
    callbacks.current.onReadyChange(Boolean(data) && !refreshing && !collecting && !error);
    return () => callbacks.current.onReadyChange(false);
  }, [data, refreshing, collecting, error]);

  const retry = async () => {
    setRefreshing(true);
    setError('');
    try { await refreshGithubRepositories(session); setRevision(value => value + 1); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to refresh repository names.'); }
    finally { setRefreshing(false); }
  };
  const toggle = (id: number) => {
    if (disabled) return;
    if (selected.includes(id)) onChange(selected.filter(value => value !== id));
    else if (selected.length < LIMIT) onChange([...selected, id]);
  };

  return <View style={styles.card}>
    <View style={styles.heading}>
      <Text style={styles.title}>Choose your repositories</Text>
      <Text accessibilityLiveRegion="polite" style={styles.count}>{selected.length} / {LIMIT} selected</Text>
    </View>
    <Text style={styles.body}>Select up to 5 repositories that best represent your work. Only the repositories you select will be analysed.</Text>
    <TextInput accessibilityLabel="Search repositories" placeholder="Search repository names…" placeholderTextColor={colors.muted}
      value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} style={styles.search} />
    {selected.length ? <View style={styles.chips}>{selected.map(id => <Pressable key={id} accessibilityRole="button"
      accessibilityLabel={`Remove ${names[id] || 'repository'} from selection`} disabled={disabled} onPress={() => toggle(id)} style={styles.chip}>
      <Text style={styles.chipText}>{names[id] || `Repository ${id}`} ×</Text>
    </Pressable>)}</View> : null}
    {selected.length === LIMIT ? <Text accessibilityLiveRegion="polite" style={styles.body}>Maximum 5 selected. Deselect one to choose another.</Text> : null}
    {collecting || refreshing ? <View style={styles.heading}><ActivityIndicator color={colors.coral} /><Text style={styles.body}>Collecting repository names…</Text></View> : null}
    {error ? <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" disabled={refreshing || disabled} onPress={() => void retry()} style={styles.button}><Text style={styles.buttonText}>Retry loading repositories</Text></Pressable></View> : null}
    {loading && !data ? <ActivityIndicator accessibilityLabel="Loading repositories" color={colors.coral} /> : null}
    {data?.results.map(repo => {
      const checked = selected.includes(repo.id);
      const unavailable = disabled || (!checked && selected.length >= LIMIT);
      return <View key={repo.id} style={[styles.row, checked && styles.selectedRow]}>
        <Text style={styles.name}>{repo.name}</Text>
        <Pressable accessibilityRole="checkbox" accessibilityLabel={`Select ${repo.name}`}
          accessibilityState={{ checked, disabled: unavailable }} disabled={unavailable} onPress={() => toggle(repo.id)}
          style={[styles.button, checked && styles.selectedButton, unavailable && !checked && styles.disabled]}>
          <Text style={[styles.buttonText, checked && styles.selectedText]}>{checked ? 'Selected ✓' : 'Select'}</Text>
        </Pressable>
      </View>;
    })}
    {data && !data.results.length && !loading && !collecting ? <Text style={styles.body}>{query ? 'No repositories match your search.' : 'No repositories are available for this GitHub account.'}</Text> : null}
    {data && data.total_pages > 1 ? <View style={styles.heading}>
      <Pressable accessibilityRole="button" disabled={page <= 1 || loading} onPress={() => setPage(value => value - 1)} style={[styles.button, page <= 1 && styles.disabled]}><Text style={styles.buttonText}>Previous</Text></Pressable>
      <Text style={styles.body}>Page {data.page} of {data.total_pages}</Text>
      <Pressable accessibilityRole="button" disabled={page >= data.total_pages || loading} onPress={() => setPage(value => value + 1)} style={[styles.button, page >= data.total_pages && styles.disabled]}><Text style={styles.buttonText}>Next</Text></Pressable>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16, gap: 12, backgroundColor: colors.surface },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  title: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 17 },
  count: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 12 },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 21 },
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.text, fontFamily: fonts.body, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12 },
  selectedRow: { borderColor: colors.coral, backgroundColor: colors.accentSoft },
  name: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 20 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 12 },
  selectedButton: { backgroundColor: colors.coral, borderColor: colors.coral },
  selectedText: { color: '#fff' }, disabled: { opacity: 0.4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, padding: 8, backgroundColor: colors.accentSoft, borderRadius: 8 },
  chipText: { color: colors.coral, fontFamily: fonts.body, fontSize: 12 },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 13 },
});
