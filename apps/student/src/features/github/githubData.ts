import { getRecord, getStringArray } from '../profile/profileValues';

export type GithubRepository = {
  name: string;
  language?: string;
  score?: string;
  reason?: string;
  url?: string;
  stars?: string;
  forks?: string;
  topics: string[];
};

export function getString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function getGithubHandleFromUrl(value: unknown) {
  const url = getString(value);
  if (!url) {
    return undefined;
  }

  return url.replace(/\/$/, '').split('/').filter(Boolean).pop();
}

export function getGithubRepositories(value: unknown): GithubRepository[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const repositories = value
    .map((item) => {
      if (typeof item === 'string') {
        return {
          name: item,
          topics: [],
        };
      }

      const record = getRecord(item);
      if (!record) {
        return undefined;
      }

      const name =
        getString(record.name) ??
        getString(record.repository) ??
        getString(record.repo) ??
        getString(record.title) ??
        getString(record.full_name);

      if (!name) {
        return undefined;
      }

      const score =
        typeof record.score === 'number'
          ? `Score ${record.score}`
          : typeof record.strength_score === 'number'
            ? `Score ${record.strength_score}`
            : typeof record.percent === 'number'
              ? `${record.percent}%`
              : undefined;

      const stars =
        typeof record.stars === 'number'
          ? `${record.stars} stars`
          : typeof record.stargazers_count === 'number'
            ? `${record.stargazers_count} stars`
            : undefined;
      const forks =
        typeof record.forks === 'number'
          ? `${record.forks} forks`
          : typeof record.forks_count === 'number'
            ? `${record.forks_count} forks`
            : undefined;

      return {
        name,
        language: getString(record.language) ?? getString(record.primary_language),
        score,
        reason:
          getString(record.reason) ??
          getString(record.why) ??
          getString(record.strength) ??
          getString(record.description) ??
          getString(record.summary),
        url: getString(record.url) ?? getString(record.html_url) ?? getString(record.github_url),
        stars,
        forks,
        topics:
          getStringArray(record.topics) ??
          getStringArray(record.technologies) ??
          getStringArray(record.frameworks_and_tools) ??
          [],
      };
    })
    .filter(Boolean) as GithubRepository[];

  return repositories.length ? repositories : undefined;
}

export function getGithubItemLabels(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const labels = value
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      const record = getRecord(item);
      if (!record) {
        return '';
      }

      const name =
        getString(record.name) ??
        getString(record.repository) ??
        getString(record.repo) ??
        getString(record.title) ??
        getString(record.package);
      const percent =
        typeof record.percent === 'number'
          ? `${record.percent}%`
          : typeof record.percentage === 'number'
            ? `${record.percentage}%`
            : undefined;
      const level = getString(record.level);
      const score =
        typeof record.score === 'number'
          ? `Score ${record.score}`
          : typeof record.strength_score === 'number'
            ? `Score ${record.strength_score}`
            : undefined;
      const language = getString(record.language) ?? getString(record.primary_language);
      const reason = getString(record.reason) ?? getString(record.why) ?? getString(record.strength);
      const description = getString(record.description) ?? getString(record.summary) ?? reason;

      if (percent || level) {
        return [name, percent, level].filter(Boolean).join(' • ');
      }

      return [name, language, score, description].filter(Boolean).join(' - ');
    })
    .filter(Boolean);

  return labels.length ? labels : undefined;
}
