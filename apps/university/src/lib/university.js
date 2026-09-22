
export const SETUP_STEPS = [
  {
    key: "has_description",
    label: "Add a program description",
    hint: "Tell Aria what this program is and who it's for.",
    to: "settings/profile",
    done: (profile) => Boolean(profile.setup_status?.has_description),
  },
  {
    key: "has_contacts",
    label: "Add contact details",
    hint: "Admissions email, phone, and office address.",
    to: "settings/profile",
    done: (profile) => Boolean(profile.setup_status?.has_contacts),
  },
  {
    key: "has_eligibility_criteria",
    label: "Add eligibility criteria",
    hint: "GPA minimums, test scores, prerequisites.",
    to: "settings/profile",
    done: (profile) => Boolean(profile.setup_status?.has_eligibility_criteria),
  },
  {
    key: "has_scrape_urls",
    label: "Add official website URLs",
    hint: "Let the agent learn from your admissions pages.",
    to: "settings/sources",
    done: (profile) => Boolean(profile.setup_status?.has_scrape_urls),
  },
  {
    key: "has_knowledge_facts",
    label: "Add at least one knowledge fact",
    hint: "Deadlines, funding, or anything scraping might miss.",
    to: "settings/knowledge-base",
    done: (profile) => Boolean(profile.setup_status?.has_knowledge_facts),
  },
  {
    key: "has_persona",
    label: "Set your AI's tone & persona",
    hint: "Tone descriptors, best/not-best fit, communication style, and what to never do.",
    to: "settings/profile",
    done: (profile) =>
      Boolean(
        profile.tone_descriptors?.length &&
          profile.best_fit_notes &&
          profile.not_best_fit_notes &&
          profile.communication_style_notes &&
          profile.never_do_notes
      ),
  },
];

export function setupPercent(profile) {
  if (!profile) return 0;
  const done = SETUP_STEPS.filter((step) => step.done(profile)).length;
  return Math.round((done / SETUP_STEPS.length) * 100);
}
