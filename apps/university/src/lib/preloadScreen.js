// Vite splits these imports into the same chunks used by the lazy routes.
// Fetch code on navigation intent without fetching private data or starting jobs.
const screens = {
  dashboard: () => import('../pages/university/DashboardPage'),
  'settings/profile': () => import('../pages/university/SettingsProfilePage'),
  information: () => import('../pages/university/UniversityInformationPage'),
  'settings/sources': () => import('../pages/university/ScrapeSourcesPage'),
  'settings/knowledge-base': () => import('../pages/university/KnowledgeBasePage'),
  'settings/knowledge-groups': () => import('../pages/university/KnowledgeGroupsPage'),
  'settings/agent-preview': () => import('../pages/university/AgentPreviewPage'),
  profiles: () => import('../pages/university/ProfilesListPage'),
  'agent-queries': () => import('../pages/university/AgentQueriesPage'),
  knowledge: () => import('../pages/university/KnowledgePage'),
};

export function preloadScreen(path) {
  const relativePath = path.split('/').slice(3).join('/');
  screens[relativePath]?.().catch(() => {});
}
