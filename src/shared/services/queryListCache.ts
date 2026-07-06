export const upsertById = <T extends { id: string }>(items: T[] | undefined, created: T): T[] => {
  const existing = items ?? [];

  return [created, ...existing.filter((item) => item.id !== created.id)];
};
