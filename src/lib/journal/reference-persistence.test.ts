import { describe, expect, it } from "vitest";
import { referenceGet, referenceSave } from "../../../convex/journals";
import type { MutationCtx } from "../../../convex/_generated/server";

type Row = Record<string, unknown> & { _id: string };
function database() {
  const tables: Record<string, Row[]> = { payments:[{_id:"paid-a",ownerId:"a"},{_id:"paid-b",ownerId:"b"}], journals:[],journalSettings:[],journalEntries:[] };
  let counter=0;
  const db={
    query(table:string) {
      let rows=tables[table];
      return {
        withIndex(_index:string, filter:(q:{eq:(field:string,value:unknown)=>void})=>unknown) { filter({eq:(field,value)=>{rows=rows.filter((r)=>r[field]===value);}});return this; },
        async first(){return rows[0]??null;},async unique(){return rows[0]??null;},async collect(){return rows;},
      };
    },
    async insert(table:string,value:Record<string,unknown>){const _id=`new-${counter++}`;tables[table].push({_id,...value});return _id;},
    async patch(id:string,value:Record<string,unknown>){const row=Object.values(tables).flat().find((r)=>r._id===id)!;Object.assign(row,value);},
    async delete(id:string){for(const table of Object.keys(tables))tables[table]=tables[table].filter((r)=>r._id!==id);},
  };
  return {tables,ctx:(ownerId:string|null)=>({db,auth:{getUserIdentity:async()=>ownerId?{subject:ownerId}:null}} as unknown as MutationCtx)};
}
const read=(referenceGet as unknown as {_handler:(ctx:MutationCtx,args:object)=>Promise<{state:string;revision:number}>})._handler;
const write=(referenceSave as unknown as {_handler:(ctx:MutationCtx,args:{state:string;revision:number;expectedOwner:string})=>Promise<{revision:number}>})._handler;
const empty={tradingCapital:1234,cryptoValue:null,netWorth:null,rules:null,sync:{},trades:[]};

describe("reference journal account storage",()=>{
  it("enforces sign-in and payment inside the database functions",async()=>{
    const {ctx}=database();
    await expect(read(ctx(null),{})).rejects.toThrow("Not authenticated");
    await expect(write(ctx("unpaid"),{state:JSON.stringify(empty),revision:0,expectedOwner:"unpaid"})).rejects.toThrow("PAYMENT_REQUIRED");
  });
  it("isolates two accounts and rejects an old tab saving under another account",async()=>{
    const {ctx}=database();
    await write(ctx("a"),{state:JSON.stringify(empty),revision:0,expectedOwner:"a"});
    expect(JSON.parse((await read(ctx("a"),{})).state).tradingCapital).toBe(1234);
    expect(JSON.parse((await read(ctx("b"),{})).state).tradingCapital).toBe(10000);
    await expect(write(ctx("b"),{state:JSON.stringify(empty),revision:0,expectedOwner:"a"})).rejects.toThrow("ACCOUNT_CHANGED");
  });
  it("rejects stale revisions instead of overwriting newer device changes",async()=>{
    const {ctx}=database();
    await write(ctx("a"),{state:JSON.stringify(empty),revision:0,expectedOwner:"a"});
    await expect(write(ctx("a"),{state:JSON.stringify({...empty,tradingCapital:999}),revision:0,expectedOwner:"a"})).rejects.toThrow("JOURNAL_CONFLICT");
    expect(JSON.parse((await read(ctx("a"),{})).state).tradingCapital).toBe(1234);
  });
  it("retains legacy data during the first save and keeps one settings record",async()=>{
    const {ctx,tables}=database();
    tables.journals.push({_id:"old",ownerId:"a",startingCapital:5000,updatedAt:123,trades:[]});
    const initial=await read(ctx("a"),{});
    expect(JSON.parse(initial.state).tradingCapital).toBe(5000);
    await write(ctx("a"),{state:initial.state,revision:initial.revision,expectedOwner:"a"});
    await write(ctx("a"),{state:initial.state,revision:initial.revision+1,expectedOwner:"a"});
    expect(tables.journals[0].startingCapital).toBe(5000);
    expect(tables.journalSettings).toHaveLength(1);
  });
  it("detects a legacy tab changing the journal during first migration",async()=>{
    const {ctx,tables}=database();
    tables.journals.push({_id:"old",ownerId:"a",startingCapital:5000,updatedAt:123,trades:[]});
    const initial=await read(ctx("a"),{});
    tables.journals[0].updatedAt=124;
    await expect(write(ctx("a"),{state:initial.state,revision:initial.revision,expectedOwner:"a"})).rejects.toThrow("JOURNAL_CONFLICT");
  });
it("keeps closed trade protection levels through account reload", async () => {
  const { ctx } = database();
  const trade = {
    id: "closed-protection", coin: "BTC", dir: "Long", entryTime: 1000, exitTime: 2000,
    entryPx: "100", exitPx: "113", units: 1, sizeMode: "units", sizeUsd: "",
    stopPx: "97", tpPx: "120", fees: "2", strategy: "", emo: null,
    reason: "", note: "Keep this", emotionScale: "tilt-v1",
    source: "hyperliquid", sourceAddress: `0x${"a".repeat(40)}`,
  };
  await write(ctx("a"), { state: JSON.stringify({ ...empty, trades: [trade] }), revision: 0, expectedOwner: "a" });
  const loaded = await read(ctx("a"), {});
  expect(JSON.parse(loaded.state).trades[0]).toMatchObject({ stopPx: "97", tpPx: "120", exitPx: "113", note: "Keep this" });
});
it("saves five wallets per exchange and persists wallet removal",async()=>{
  const {ctx}=database();
  const wallets=Array.from({length:5},(_,i)=>({address:`0x${String(i+1).repeat(40)}`,from:1000,connectedAt:2000,lastSync:null}));
  await write(ctx("a"),{state:JSON.stringify({...empty,sync:{hyperliquid:wallets,arcus:wallets}}),revision:0,expectedOwner:"a"});
  const loaded=JSON.parse((await read(ctx("a"),{})).state);
  expect(loaded.sync.hyperliquid).toHaveLength(5);expect(loaded.sync.arcus).toHaveLength(5);
  loaded.sync.hyperliquid=wallets.slice(1);
  await write(ctx("a"),{state:JSON.stringify(loaded),revision:1,expectedOwner:"a"});
  expect(JSON.parse((await read(ctx("a"),{})).state).sync.hyperliquid).toHaveLength(4);
});
  it("round-trips chart links and optional targets without exposing them to another account",async()=>{
    const {ctx}=database();
    const target={amount:500,mode:"profit",startedOn:"2026-09-13",deadline:"2026-10-13"};
    const trade={id:"with-chart",coin:"BTC",dir:"Long",entryTime:1000,exitTime:2000,entryPx:"100",exitPx:"110",units:1,sizeMode:"units",sizeUsd:"",stopPx:"",tpPx:"",fees:"1",strategy:"",emo:null,reason:"",note:"",chartUrl:"https://www.tradingview.com/x/H8Kzryaw/"};
    await write(ctx("a"),{state:JSON.stringify({...empty,target,trades:[trade]}),revision:0,expectedOwner:"a"});
    const saved=JSON.parse((await read(ctx("a"),{})).state);
    expect(saved.target).toEqual(target);expect(saved.trades[0].chartUrl).toBe(trade.chartUrl);
    const other=JSON.parse((await read(ctx("b"),{})).state);expect(other.target).toBeUndefined();expect(other.trades).toEqual([]);
    await write(ctx("a"),{state:JSON.stringify({...saved,target:null}),revision:1,expectedOwner:"a"});
    expect(JSON.parse((await read(ctx("a"),{})).state).target).toBeNull();
  });

});
