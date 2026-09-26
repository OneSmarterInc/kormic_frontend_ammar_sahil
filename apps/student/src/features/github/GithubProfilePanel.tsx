import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AuthSession } from '../../models/onboarding';
import { getGithubOverview, getGithubRepositories, startGithubSync, GithubOverviewResponse, GithubRepositoryPage } from '../../services/api';
import { colors, fonts } from '../../theme/tokens';
import { getBoldSegments } from '../chat/components/FormattedMessageText';
import { ChipGroup } from '../profile/components/ProfileSections';

export function GithubProfilePanel({ session, onConnect, onProfileChanged, compact = false }: {
  session?: AuthSession;
  onConnect: () => void;
  onProfileChanged?: () => void | Promise<void>;
  compact?: boolean;
}) {
  const [data, setData] = useState<GithubOverviewResponse>();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [repos, setRepos] = useState<GithubRepositoryPage>();
  const [repoError, setRepoError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pollVersion, setPollVersion] = useState(0);
  const [pollDelay, setPollDelay] = useState<number>();
  const failures = useRef(0);
  const alive = useRef(false);
  const generation = useRef(0);
  const completed = useRef<string | undefined>(undefined);
  const onChanged = useRef(onProfileChanged);
  onChanged.current = onProfileChanged;
  const syncing = data?.sync?.status === 'queued' || data?.sync?.status === 'running';

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    if (!session) {
      setError('Please sign in again to view your GitHub profile.');
      setLoading(false);
      return;
    }
    try {
      const next = await getGithubOverview(session);
      if (!alive.current || request !== generation.current) return;
      setData(next);
      setError('');
      failures.current = 0;
      setPollDelay(next.sync?.status === 'queued' || next.sync?.status === 'running' ? 2500 : undefined);
      if (next.sync?.status === 'completed' && next.sync.job_id !== completed.current) {
        completed.current = next.sync.job_id;
        // Profile refresh failure must not hide a successfully saved GitHub sync.
        void Promise.resolve(onChanged.current?.()).catch(() => undefined);
      }
    } catch (e) {
      if (alive.current && request === generation.current) {
        const message = e instanceof Error ? e.message : 'Unable to load GitHub profile.';
        const needsLogin = /sign in|session expired|auth token/i.test(message);
        failures.current += 1;
        setPollDelay(needsLogin ? undefined : Math.min(30000, 2500 * 2 ** Math.min(failures.current, 4)));
        setError(/failed to fetch|network request failed|load failed/i.test(message)
          ? 'Connection interrupted. Retrying automatically…' : message);
      }
    } finally {
      if (alive.current && request === generation.current) {
        setLoading(false);
        // A repeated failure must schedule another attempt even if its text is unchanged.
        setPollVersion(value => value + 1);
      }
    }
  }, [session]);

  useEffect(() => {
    alive.current = true;
    setData(undefined);
    setLoading(true);
    setPage(1);
    setExpanded(false);
    completed.current = undefined;
    failures.current = 0;
    setPollDelay(undefined);
    void refresh();
    return () => { alive.current = false; generation.current += 1; };
  }, [refresh]);

  useEffect(() => {
    if (!session || pollDelay === undefined) return;
    const timer = setTimeout(() => void refresh(), pollDelay);
    return () => clearTimeout(timer);
  }, [session, pollDelay, pollVersion, refresh]);

  const repositoryCount = data?.profile?.statistics.repositories || 0;
  useEffect(() => { setPage((p) => Math.min(p, Math.max(1, Math.ceil(repositoryCount / 10)))); }, [repositoryCount]);

  useEffect(() => {
    if (!session || !expanded) return;
    let active = true;
    setRepos(undefined);
    setRepoError('');
    getGithubRepositories(session, page).then((response) => {
      if (active) setRepos(response);
    }).catch((e: unknown) => {
      if (active) setRepoError(e instanceof Error ? e.message : 'Unable to load repositories.');
    });
    return () => { active = false; };
  }, [session, expanded, page, retry, data?.profile?.synced_at, data?.sync?.status]);

  const sync = async () => {
    if (!session || starting || syncing) return;
    setStarting(true);
    setError('');
    try {
      const job = await startGithubSync(session);
      if (!alive.current) return;
      setData((previous) => ({ connected: true, profile: previous?.profile || null, sync: job }));
      await refresh();
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Unable to start GitHub sync.');
    } finally {
      if (alive.current) setStarting(false);
    }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.coral} /><Text style={styles.muted}>Loading GitHub profile…</Text></View>;
  const profile = data?.profile;
  if (compact) return <View style={styles.card}>
    <Text style={styles.cardTitle}>GitHub</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {data?.connected ? <>
      <Text style={styles.body}>{syncing ? 'Your GitHub profile is processing.' : profile?.synced_at ? `Last synced ${new Date(profile.synced_at).toLocaleString()}` : 'Your GitHub account is connected.'}</Text>
      {syncing ? <View style={styles.notice} accessibilityLiveRegion="polite"><ActivityIndicator color={colors.coral} /><Text style={styles.body}>{data.sync?.progress || 'Analysis is under process…'}</Text></View> : null}
      {data.sync?.status === 'failed' ? <Text accessibilityRole="alert" style={styles.error}>{data.sync.error}</Text> : null}
      <PrimaryButton label={syncing ? 'GitHub processing…' : 'Sync GitHub'} disabled={syncing} loading={starting} onPress={() => void sync()} />
    </> : <PrimaryButton label="Connect GitHub" onPress={onConnect} />}
  </View>;
  return (
    <View style={styles.stack}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}><Text style={styles.eyebrow}>YOUR CONNECTED WORK</Text><Text style={styles.title}>GitHub Profile</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh GitHub profile" onPress={() => void refresh()} style={styles.smallButton}><Text style={styles.buttonText}>Refresh</Text></Pressable>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {data && !data.connected ? (
        <View style={styles.card}><Text style={styles.cardTitle}>Your code, at a glance</Text><Text style={styles.body}>Connect your GitHub account to see an overview of your projects, languages, and source-backed technologies.</Text><PrimaryButton label="Connect GitHub" onPress={onConnect} /></View>
      ) : null}
      {data?.connected ? (
        <>
          <View style={styles.identity}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.identity.login || 'GH').slice(0, 2).toUpperCase()}</Text></View>
            <View style={styles.headingCopy}>
              <Text style={styles.cardTitle}>{profile?.identity.name || profile?.identity.login || 'Your GitHub account'}</Text>
              {profile?.identity.login ? <Text style={styles.muted}>@{profile.identity.login}</Text> : null}
              {profile?.identity.location ? <Text style={styles.muted}>{profile.identity.location}</Text> : null}
            </View>
          </View>
          {profile?.identity.bio ? <Text style={styles.body}>{profile.identity.bio}</Text> : null}
          <PrimaryButton label={syncing ? 'Sync in progress' : profile?.synced_at ? 'Sync GitHub' : 'Create GitHub overview'} onPress={() => void sync()} loading={starting} disabled={syncing} />
          {syncing ? <View accessibilityLiveRegion="polite" style={styles.notice}><ActivityIndicator color={colors.coral} /><Text style={styles.body}>GitHub profile is processing.{'\n'}{data.sync?.progress || 'Collecting your GitHub profile…'}{'\n'}You can leave this tab; extraction continues in the background.</Text></View> : null}
          {data.sync?.status === 'failed' ? <Text accessibilityRole="alert" style={styles.error}>{data.sync.error || 'Sync could not finish. Try syncing again.'}</Text> : null}
          {profile?.synced_at ? (
            <>
              <View style={styles.stats}>
                {[['Repos', repositoryCount], ['Owned', profile.statistics.owned || 0], ['Stars', profile.statistics.stars || 0], ['Followers', profile.identity.followers || 0]].map(([label, count]) => <View key={label} style={styles.stat}><Text style={styles.statNumber}>{count}</Text><Text style={styles.muted}>{label}</Text></View>)}
              </View>
              <View style={styles.card}><Text style={styles.cardTitle}>Overview</Text><OverviewText text={profile.overview} /></View>
              {profile.languages.length ? <View style={styles.card}><Text style={styles.cardTitle}>Languages</Text><ChipGroup items={profile.languages.map((row) => `${row.name} · ${row.repositories}`)} /></View> : null}
              {profile.technologies.length ? <View style={styles.card}><Text style={styles.cardTitle}>Source-backed technologies</Text><ChipGroup items={profile.technologies.map((row) => row.name)} /></View> : null}
              <View style={styles.card}>
                <Pressable accessibilityRole="button" accessibilityLabel="Repos" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={styles.repoToggle}>
                  <Text style={styles.cardTitle}>Repos</Text><Text style={styles.buttonText}>{repositoryCount}  {expanded ? '−' : '+'}</Text>
                </Pressable>
                {expanded ? (
                  <View style={styles.stack}>
                    {repoError ? <><Text accessibilityRole="alert" style={styles.error}>{repoError}</Text><Pressable accessibilityRole="button" onPress={() => setRetry((v) => v+1)}><Text style={styles.buttonText}>Retry repositories</Text></Pressable></> : !repos ? <ActivityIndicator accessibilityLabel="Loading repositories" color={colors.coral} /> : (
                      <>
                        {repos.results.length ? repos.results.map((repo) => <View key={repo.id} style={styles.repoRow}><Text style={styles.repoName}>{repo.name}</Text></View>) : <Text style={styles.muted}>No repositories are available for this account.</Text>}
                        <View style={styles.pagination}>
                          <Pressable accessibilityRole="button" accessibilityState={{ disabled: page === 1 }} disabled={page === 1} onPress={() => setPage((p) => p-1)} style={[styles.smallButton, page === 1 && styles.disabled]}><Text style={styles.buttonText}>Previous</Text></Pressable>
                          <Text accessibilityLiveRegion="polite" style={styles.muted}>Page {repos.page} of {repos.total_pages}</Text>
                          <Pressable accessibilityRole="button" accessibilityState={{ disabled: page >= repos.total_pages }} disabled={page >= repos.total_pages} onPress={() => setPage((p) => p+1)} style={[styles.smallButton, page >= repos.total_pages && styles.disabled]}><Text style={styles.buttonText}>Next</Text></Pressable>
                        </View>
                      </>
                    )}
                  </View>
                ) : null}
              </View>
              {profile.warnings.length ? <View style={styles.notice}><Text style={styles.body}>Some information could not be collected or analyzed. Your available results are saved; sync again to retry.</Text></View> : null}
              {profile.coverage.note ? <Text style={styles.scope}>{profile.coverage.note}</Text> : null}
              <Text style={styles.muted}>Last collected {new Date(profile.synced_at).toLocaleString()}</Text>
            </>
          ) : !syncing ? <Text style={styles.body}>Create your overview to collect your GitHub profile and repositories.</Text> : null}
        </>
      ) : null}
    </View>
  );
}

function OverviewText({ text }: { text: string }) {
  return <View style={styles.stack}>{text.split(/\n\n+/).filter(Boolean).map((block, index) => block.startsWith('## ') ? <Text key={index} style={styles.subheading}>{block.slice(3)}</Text> : <Text key={index} style={styles.body}>{getBoldSegments(block).map((part, i) => <Text key={i} style={part.bold ? styles.bold : undefined}>{part.text}</Text>)}</Text>)}</View>;
}

const styles = StyleSheet.create({
  stack: { gap: 16 }, loading: { alignItems: 'center', padding: 32, gap: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, headingCopy: { flex: 1, gap: 4 },
  eyebrow: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 10, letterSpacing: 1.6 },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 28, lineHeight: 34 },
  cardTitle: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 17, lineHeight: 24 },
  body: { color: colors.textSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23, flexShrink: 1 },
  muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 19 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 20, gap: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 20 },
  smallButton: { borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface },
  buttonText: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 12 },
  notice: { backgroundColor: colors.accentSoft, padding: 16, borderRadius: 10, gap: 12 },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 13, lineHeight: 21 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, stat: { flex: 1, minWidth: 72, padding: 12, borderRadius: 10, backgroundColor: colors.accentSoft, gap: 4 },
  statNumber: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 24 },
  repoToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  repoRow: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 10 },
  repoName: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 21 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, disabled: { opacity: 0.4 },
  scope: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 18 },
  subheading: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 14 }, bold: { fontFamily: fonts.bodyMedium, color: colors.text },
});
