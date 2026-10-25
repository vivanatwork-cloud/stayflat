import { describe, expect, it } from "vitest";
import { migrateLegacyJournal, parseReferenceState, referenceToLegacy } from "./reference-state";
import { serializeJournalBootstrap } from "./reference-document";
import type { JournalState } from "./types";

const legacy: JournalState = { startingCapital: 10000, updatedAt: 1, trades: [{ id:"trade-1",entryTime:1000,exitTime:2000,coin:"BTC",dir:"Long",entryPx:"100",exitPx:"110",sizeMode:"units",sizeUsd:"",units:"2",stopPx:"95",tpPx:"",fees:"1",strategy:"Breakout",emo:2,reason:"Plan",note:"Keep this" }] };
describe("reference journal migration and validation", () => {
  it("opens older forex journals and preserves slash-separated markets through saving", () => {
    const journal = { ...legacy, trades: [{ ...legacy.trades[0], coin: "USD/JPY" }] };
    const before = JSON.stringify(journal);
    const migrated = migrateLegacyJournal(journal);
    expect(migrated.trades[0].coin).toBe("USD/JPY");
    expect(parseReferenceState(JSON.parse(JSON.stringify(migrated))).trades[0].coin).toBe("USD/JPY");
    expect(referenceToLegacy(migrated, journal.updatedAt)).toMatchObject(journal);
    expect(JSON.stringify(journal)).toBe(before);
  });
  it("retains existing scores and their original meaning", () => {
    const state = migrateLegacyJournal(legacy);
    expect(state.trades[0]).toMatchObject({ units:2,emo:2,emotionScale:"composure-v1",note:"Keep this" });
    expect(referenceToLegacy(state, 1).trades[0].emo).toBe(2);
    expect(state.tradingCapital).toBe(10000);
  });
  it("accepts unrated synced trades without manufacturing a score", () => {
    const state = migrateLegacyJournal(legacy);
    state.trades[0] = { ...state.trades[0], emo:null, source:"hyperliquid",sourceAddress:`0x${"a".repeat(40)}` };
    expect(parseReferenceState(state).trades[0].emo).toBeNull();
    expect(referenceToLegacy(state, 1).trades[0].emo).toBe(0);
  });
  it("adapts new tilt scores for the existing composure analytics without changing stored scores", () => {
    const state = migrateLegacyJournal(legacy);
    state.trades[0].emotionScale="tilt-v1";
    expect(referenceToLegacy(state,1).trades[0].emo).toBe(9);
    expect(state.trades[0].emo).toBe(2);
  });
  it("rejects duplicate IDs, invalid source wallets, and executable market names", () => {
    const state=migrateLegacyJournal(legacy);
    expect(()=>parseReferenceState({...state,trades:[state.trades[0],state.trades[0]]})).toThrow("unique");
    expect(()=>parseReferenceState({...state,trades:[{...state.trades[0],source:"arcus"}]})).toThrow("source wallet");
    expect(()=>parseReferenceState({...state,trades:[{...state.trades[0],coin:'<img src=x onerror=alert(1)>'}]})).toThrow("market");
  });
  it("rejects invalid rules and dates without discarding the original", () => {
    const state=migrateLegacyJournal(legacy);
    expect(()=>parseReferenceState({...state,tradingCapital:NaN})).toThrow("capital");
    expect(()=>parseReferenceState({...state,rules:{}})).toThrow("rules");
    expect(()=>parseReferenceState({...state,trades:[{...state.trades[0],exitTime:500}]})).toThrow("dates");
    expect(legacy.trades[0].note).toBe("Keep this");
  });
  it("keeps review records and notes in storage but excludes them from extended analytics",()=>{
    const state=migrateLegacyJournal(legacy);
    state.trades[0].syncReview=true;
    const saved=parseReferenceState(state);
    expect(saved.trades[0]).toMatchObject({syncReview:true,note:"Keep this"});
    expect(referenceToLegacy(saved,1).trades).toHaveLength(0);
    expect(()=>parseReferenceState({...state,trades:[{...state.trades[0],syncReview:"yes"}]})).toThrow("review status");
  });
  it("escapes embedded script closing tags without changing the notes", () => {
    const note = '</script><script>alert("x")</script>';
    const encoded=serializeJournalBootstrap({note});
    expect(encoded).not.toContain("<");
    expect(JSON.parse(encoded).note).toBe(note);
  });
  it("upgrades single-wallet settings and enforces five unique wallets per exchange",()=>{
    const state=migrateLegacyJournal(legacy);
    const cfg={address:`0x${"A".repeat(40)}`,from:1000,connectedAt:2000,lastSync:3000};
    const migrated=parseReferenceState({...state,sync:{hyperliquid:cfg}});
    expect(migrated.sync.hyperliquid).toEqual([{...cfg,address:cfg.address.toLowerCase()}]);
    const wallets=Array.from({length:5},(_,i)=>({...cfg,address:`0x${String(i+1).repeat(40)}`}));
    expect(parseReferenceState({...state,sync:{hyperliquid:wallets,arcus:wallets}}).sync.arcus).toHaveLength(5);
    expect(()=>parseReferenceState({...state,sync:{hyperliquid:[...wallets,{...cfg,address:`0x${"6".repeat(40)}`}]}})).toThrow("five wallets");
    expect(()=>parseReferenceState({...state,sync:{arcus:[cfg,{...cfg,address:cfg.address.toLowerCase()}]}})).toThrow("already connected");
    expect(parseReferenceState({...state,sync:{hyperliquid:[]}}).sync.hyperliquid).toEqual([]);
  });
  it("saves optional wallet names and retained trade labels with a 40-character limit",()=>{
    const state=migrateLegacyJournal(legacy);
    const cfg={address:`0x${"a".repeat(40)}`,label:"  Main wallet  ",from:0,connectedAt:1,lastSync:null};
    const parsed=parseReferenceState({...state,sync:{hyperliquid:[cfg]},trades:[{...state.trades[0],sourceLabel:"  Main wallet  "}]});
    expect(parsed.sync.hyperliquid?.[0].label).toBe("Main wallet");expect(parsed.trades[0].sourceLabel).toBe("Main wallet");
    expect(()=>parseReferenceState({...state,sync:{arcus:[{...cfg,label:"x".repeat(41)}]}})).toThrow("40 characters");
    expect(()=>parseReferenceState({...state,trades:[{...state.trades[0],sourceLabel:123}]})).toThrow("40 characters");
  });
});
