export async function loadAllClerkUsers<T extends { id: string }>(
  getPage: (options: { limit: number; offset: number; orderBy: "-created_at" }) => Promise<{ data: T[]; totalCount: number }>,
  pageSize = 100,
) {
  const firstPage = await getPage({ limit: pageSize, offset: 0, orderBy: "-created_at" });
  const offsets: number[] = [];
  for (let offset = pageSize; offset < firstPage.totalCount; offset += pageSize) offsets.push(offset);
  const remainingPages = await Promise.all(offsets.map((offset) => getPage({ limit: pageSize, offset, orderBy: "-created_at" })));
  const byId = new Map<string, T>();
  for (const user of [...firstPage.data, ...remainingPages.flatMap((page) => page.data)]) byId.set(user.id, user);
  if (byId.size < firstPage.totalCount) throw new Error("Clerk returned an incomplete user list.");
  return { users: [...byId.values()], totalCount: firstPage.totalCount };
}
