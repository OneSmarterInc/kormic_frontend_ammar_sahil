
export function roleHome(user) {
  if (user.role === "department") return `/university/${user.university_id}/agent-queries?tab=departments`;
  if (user.role !== "university") return "/access-restricted";
  return `/university/${user.university_id}/dashboard`;
}
