export function proposeConnection(evidences) {
  const e = evidences[0];
  if (!e || !e.member_name) return null;
  return {
    member_name: e.member_name,
    reason: "Matched on similar concern and tags",
    tags: e.tags
  };
}
