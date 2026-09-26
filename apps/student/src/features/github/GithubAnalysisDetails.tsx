import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GithubAnalysisResponse, GithubHistoryResponse } from '../../services/api';
import { colors, fonts } from '../../theme/tokens';
import { ChipGroup, FieldRow, InfoCard, MiniList } from '../profile/components/ProfileSections';
import { formatDate, getRecord } from '../profile/profileValues';
import {
  getGithubHandleFromUrl,
  getGithubItemLabels,
  getGithubRepositories,
  getString,
  GithubRepository,
} from './githubData';

export function GithubAnalysisDetails({
  loading,
  currentAnalysis,
  history = [],
  onRefresh,
}: {
  loading: boolean;
  currentAnalysis?: GithubAnalysisResponse;
  history?: NonNullable<GithubHistoryResponse['analyses']>;
  onRefresh: () => void;
}) {
  const latestHistory = history[0];
  const result =
    currentAnalysis?.github_result ?? latestHistory?.github_result ?? latestHistory?.result ?? {};
  const resultRecord = getRecord(result) ?? {};
  const username =
    currentAnalysis?.github_username ??
    latestHistory?.github_username ??
    getString(resultRecord.github_username) ??
    getGithubHandleFromUrl(latestHistory?.github_url);
  const languages =
    getGithubItemLabels(resultRecord.languages) ?? getGithubItemLabels(resultRecord.language_breakdown) ?? [];
  const frameworks =
    getGithubItemLabels(resultRecord.frameworks_and_tools) ??
    getGithubItemLabels(resultRecord.frameworks) ??
    getGithubItemLabels(resultRecord.tools) ??
    [];
  const repositories =
    getGithubItemLabels(
      resultRecord.repositories ??
        resultRecord.top_repositories ??
        resultRecord.projects ??
        resultRecord.notable_projects,
    ) ?? [];
  const strongestRepositories =
    getGithubRepositories(
      resultRecord.strongest_repositories ??
        resultRecord.strongest_repos ??
        resultRecord.strongest_projects ??
        resultRecord.top_repositories,
    ) ?? [];
  const summary =
    getString(resultRecord.summary) ??
    getString(resultRecord.profile_summary) ??
    getString(resultRecord.technical_summary) ??
    getString(resultRecord.assessment);

  return (
    <View style={styles.githubDetails}>
      <View style={styles.linkedinHistoryHeader}>
        <View style={styles.linkedinHistoryTitleWrap}>
          <Text style={styles.cardTitle}>GitHub details</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRefresh}
          disabled={loading}
          style={[styles.smallButton, loading && styles.disabledButton]}
        >
          {loading ? (
            <ActivityIndicator color={colors.offWhite} size="small" />
          ) : (
            <Text style={styles.smallButtonText}>Refresh</Text>
          )}
        </Pressable>
      </View>

      {loading && !currentAnalysis && history.length === 0 ? (
        <ActivityIndicator color={colors.coral} />
      ) : null}

      {!loading && !currentAnalysis && history.length === 0 ? (
        <Text style={styles.emptyText}>
          No GitHub analysis found yet. Run Analyze GitHub to fetch details.
        </Text>
      ) : null}

      {currentAnalysis || history.length > 0 ? (
        <InfoCard>
          <FieldRow label="GitHub username" value={username ? `@${username}` : undefined} />
          <FieldRow label="Primary language" value={getString(resultRecord.primary_language)} />
          <FieldRow
            label="Latest run"
            value={latestHistory?.created_at ? formatDate(latestHistory.created_at) : undefined}
          />

          <Text style={styles.extractedSectionTitle}>Languages</Text>
          <ChipGroup items={languages} compact />

          <Text style={styles.extractedSectionTitle}>Frameworks and tools</Text>
          <ChipGroup items={frameworks} compact />

          <GithubRepositoryList repositories={strongestRepositories} />

          <MiniList title="Repositories / projects" items={repositories} />

          {summary ? (
            <View style={styles.githubSummary}>
              <Text style={styles.extractedSectionTitle}>Summary</Text>
              <Text style={styles.bodyText}>{summary}</Text>
            </View>
          ) : null}
        </InfoCard>
      ) : null}
    </View>
  );
}

export function GithubRepositoryList({ repositories }: { repositories: GithubRepository[] }) {
  if (!repositories.length) {
    return null;
  }

  return (
    <View style={styles.githubRepoSection}>
      <Text style={styles.extractedSectionTitle}>Strongest repositories</Text>
      {repositories.map((repository, index) => (
        <GithubRepositoryCard
          key={`${repository.name}-${repository.url ?? index}`}
          repository={repository}
          rank={index + 1}
        />
      ))}
    </View>
  );
}

export function GithubRepositoryCard({ repository, rank }: { repository: GithubRepository; rank: number }) {
  return (
    <View style={styles.githubRepoCard}>
      <View style={styles.githubRepoHeader}>
        <View style={styles.githubRepoRank}>
          <Text style={styles.githubRepoRankText}>{rank}</Text>
        </View>
        <View style={styles.githubRepoTitleWrap}>
          <Text style={styles.githubRepoName}>{repository.name}</Text>
          {repository.url ? <Text style={styles.githubRepoUrl}>{repository.url}</Text> : null}
        </View>
      </View>

      <View style={styles.githubRepoMetaRow}>
        {repository.language ? <Text style={styles.githubRepoPill}>{repository.language}</Text> : null}
        {repository.score ? <Text style={styles.githubRepoPill}>{repository.score}</Text> : null}
        {repository.stars ? <Text style={styles.githubRepoPill}>{repository.stars}</Text> : null}
        {repository.forks ? <Text style={styles.githubRepoPill}>{repository.forks}</Text> : null}
      </View>

      {repository.reason ? <Text style={styles.githubRepoReason}>{repository.reason}</Text> : null}
      {repository.topics.length > 0 ? <ChipGroup items={repository.topics} compact /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  smallButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
  disabledButton: {
    opacity: 0.45,
  },
  githubDetails: {
    gap: 12,
  },
  githubSummary: {
    gap: 6,
    marginTop: 4,
  },
  githubRepoSection: {
    gap: 10,
  },
  githubRepoCard: {
    backgroundColor: 'rgba(56,90,70,0.10)',
    borderColor: 'rgba(56,90,70,0.24)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  githubRepoHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  githubRepoRank: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  githubRepoRankText: {
    color: colors.ink,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  githubRepoTitleWrap: {
    flex: 1,
    gap: 3,
  },
  githubRepoName: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
  },
  githubRepoUrl: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  githubRepoMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  githubRepoPill: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 999,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  githubRepoReason: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 17,
    lineHeight: 23,
    marginBottom: 8,
  },
  bodyText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  emptyText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  linkedinHistoryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  linkedinHistoryTitleWrap: {
    flex: 1,
  },
  extractedSectionTitle: {
    color: '#536149',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
});
