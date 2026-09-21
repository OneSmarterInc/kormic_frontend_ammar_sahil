// The 4 fixed knowledge groups the backend lazily bootstraps per university.
// Slugs must match /api/university-admin/knowledge-groups/ exactly.
export const KNOWLEDGE_GROUPS = [
  { slug: "money", label: "Money", tone: "success" },
  { slug: "admissions", label: "Admissions", tone: "brand" },
  { slug: "international", label: "International", tone: "warning" },
  { slug: "campus_life", label: "Campus Life", tone: "neutral" },
];

export function knowledgeGroupLabel(slug) {
  return KNOWLEDGE_GROUPS.find((g) => g.slug === slug)?.label || slug;
}

export function knowledgeGroupTone(slug) {
  return KNOWLEDGE_GROUPS.find((g) => g.slug === slug)?.tone || "neutral";
}
