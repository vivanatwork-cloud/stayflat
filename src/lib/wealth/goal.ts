import type { Data } from "./types";
// Older workspaces inherited this amount before goals became opt-in.
const previousDefault = 100_000_000;
export function hasWealthGoal(data: Pick<Data, "goal" | "goalSet">) {
  return (
    Number(data.goal) > 0 &&
    (data.goalSet ?? Number(data.goal) !== previousDefault)
  );
}
