
export function roleHome(user) {
  if (user.role !== "university") return "/access-restricted";
  return `/university/${user.university_id}/dashboard`;
}
