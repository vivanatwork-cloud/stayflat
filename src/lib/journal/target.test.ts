import { describe, expect, it } from "vitest";
import { parseJournalTarget, targetProgress, type JournalTarget } from "./target";
import type { JournalTrade } from "./types";
const goal: JournalTarget = { amount: 100, startedOn: "2026-09-01", deadline: "2026-09-30", mode: "profit" };
const now = new Date(2026, 8, 21, 12);
function trade(exit: Date, overrides: Partial<JournalTrade> = {}): JournalTrade {
  return { id: "t", entryTime: exit.getTime()-3600000, exitTime: exit.getTime(), coin: "BTC", dir: "Long", entryPx: "100", exitPx: "120", units: "1", sizeUsd: "", sizeMode: "units", fees: "5", strategy: "", stopPx: "", tpPx: "", emo: 5, reason: "", note: "", ...overrides };
}
describe("journal targets", () => {
  it("accepts absent targets and rejects invalid amounts and impossible dates", () => {
    expect(parseJournalTarget(undefined)).toBeNull();
    expect(parseJournalTarget(null)).toBeNull();
    for (const amount of [0, -1, NaN, Infinity, "100"]) expect(() => parseJournalTarget({...goal, amount})).toThrow();
    for (const deadline of ["2026-02-30", "2026-08-31", "bad"]) expect(() => parseJournalTarget({...goal, deadline})).toThrow();
  });
  it("counts new closed profit after fees, including losses, and excludes earlier/open/future trades", () => {
    const trades=[trade(new Date(2026,8,10)), trade(new Date(2026,8,11),{exitPx:"90",fees:"2"}),trade(new Date(2026,7,30)),trade(new Date(2026,8,22)),trade(now,{exitTime:null,exitPx:""})];
    expect(targetProgress(goal,trades,1000,now)).toMatchObject({current:3,remaining:97,days:10,daily:9.7,weekly:67.89999999999999,monthly:97});
  });
  it("uses capital and all closed profits for account-balance targets", () => {
    expect(targetProgress({...goal,mode:"balance",amount:1100},[trade(new Date(2026,7,30))],1000,now)).toMatchObject({current:1015,remaining:85,daily:8.5});
  });
  it("caps a partial week/month at the amount still needed and includes the deadline day", () => {
    expect(targetProgress({...goal,deadline:"2026-09-21"},[],0,now)).toMatchObject({days:1,daily:100,weekly:100,monthly:100});
  });
  it("shows zero pace when reached and no pace when an unfinished target expires", () => {
    expect(targetProgress({...goal,amount:10},[trade(now)],0,now)).toMatchObject({reached:true,remaining:0,daily:0,percent:100});
    expect(targetProgress({...goal,deadline:"2026-09-20"},[],0,now)).toMatchObject({expired:true,days:0,daily:null,weekly:null,monthly:null});
  });
  it("handles leap days and daylight-saving boundaries as calendar days", () => {
    expect(targetProgress({...goal,startedOn:"2024-02-28",deadline:"2024-03-01"},[],0,new Date(2024,1,28,23))).toMatchObject({days:3});
    expect(targetProgress({...goal,startedOn:"2026-03-07",deadline:"2026-03-09"},[],0,new Date(2026,2,7,23))).toMatchObject({days:3});
  });
});
