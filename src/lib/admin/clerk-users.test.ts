import { describe, expect, it, vi } from "vitest";
import { loadAllClerkUsers } from "./clerk-users";

describe("loadAllClerkUsers", () => {
  it("loads every Clerk page", async () => {
    const getPage = vi.fn(async ({ offset }: { offset: number }) => offset === 0
      ? { data: [{ id: "1" }, { id: "2" }], totalCount: 3 }
      : { data: [{ id: "3" }], totalCount: 3 });
    await expect(loadAllClerkUsers(getPage, 2)).resolves.toEqual({ users: [{ id: "1" }, { id: "2" }, { id: "3" }], totalCount: 3 });
    expect(getPage).toHaveBeenCalledTimes(2);
  });

  it("fails instead of presenting an incomplete list", async () => {
    await expect(loadAllClerkUsers(async () => ({ data: [], totalCount: 1 }))).rejects.toThrow("incomplete");
  });
});
