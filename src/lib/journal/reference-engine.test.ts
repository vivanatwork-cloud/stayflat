import { readFileSync } from "node:fs";
import { runInNewContext, Script } from "node:vm";
import { describe, expect, it } from "vitest";

const html=readFileSync(new URL("./reference/journal.html",import.meta.url),"utf8");
function extract(name: string) {
  const start=html.indexOf(`  function ${name}(`);
  const next=html.indexOf("\n  function ",start+1);
  return html.slice(start,next<0?undefined:next);
}
function engine() {
  return runInNewContext(`${extract("unformat")}\n${extract("derive")}\n${extract("reconstructTrades")}\n({derive,reconstructTrades})`);
}
describe("integrated prototype engine",()=>{
  it("lets migrated forex trades be edited and saved without accepting HTML market names",()=>{
    const validate=runInNewContext(`${extract("unformat")}\n${extract("validate")}\nvalidate`,{chartLinkIsValid:()=>true});
    const trade={coin:"USD/JPY",entryTime:1000,exitTime:2000,entryPx:"150",exitPx:"151",units:1,strategy:"",reason:"",note:""};
    expect(validate(trade)).toBeNull();
    expect(validate({...trade,coin:'<script>alert(1)</script>'})).toContain("market");
  });
  it("parses every embedded script",()=>{
    for(const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) expect(()=>new Script(match[1])).not.toThrow();
  });
  it("preserves the prototype's net profit and risk multiple",()=>{
    const {derive}=engine();
    expect(derive({entryPx:"100",exitPx:"90",exitTime:2000,entryTime:1000,dir:"Short",sizeUsd:"1000",stopPx:"110",fees:"5"})).toMatchObject({net:95,R:.95,units:10});
  });
  it("reconstructs a partial close as an open position, then one complete trade",()=>{
    const {reconstructTrades}=engine();
    const fills=[{coin:"BTC",t:1000,px:100,sz:2,side:"B",fee:1},{coin:"BTC",t:2000,px:110,sz:1,side:"A",fee:.5}];
    expect(reconstructTrades(fills)).toMatchObject([{open:true,units:1,entryPx:100,fees:1.5}]);
    expect(reconstructTrades([...fills,{coin:"BTC",t:3000,px:120,sz:1,side:"A",fee:.5}])).toMatchObject([{units:2,entryPx:100,exitPx:115,fees:2}]);
  });
  it.each(["Long", "Short"])("uses the remaining entry cost after reducing and adding to a %s",(dir)=>{
    const {reconstructTrades}=engine();
    const entrySide=dir==="Long"?"B":"A",exitSide=dir==="Long"?"A":"B";
    const fill=(t:number,px:number,sz:number,side:string)=>({coin:"HYPE",t,px,sz,side,fee:0});
    const fills=[fill(1000,80,10,entrySide),fill(2000,90,8,exitSide),fill(3000,100,8,entrySide)];
    // Only two of the original ten units remain when eight new units are added.
    expect(reconstructTrades(fills)).toMatchObject([{open:true,dir,units:10,entryPx:96}]);
    expect(reconstructTrades([...fills,fill(4000,110,5,exitSide)])).toMatchObject([{open:true,units:5,entryPx:96}]);
    const closed=reconstructTrades([...fills,fill(4000,110,10,exitSide)])[0];
    expect(closed.entryPx).toBeCloseTo(1600/18);
    expect(closed.exitPx).toBeCloseTo(1820/18);
    expect(closed.units).toBe(18);
    const flipped=reconstructTrades([...fills,fill(4000,110,12,exitSide)]);
    expect(flipped).toHaveLength(2);
    expect(flipped[1]).toMatchObject({open:true,units:2,entryPx:110,dir:dir==="Long"?"Short":"Long"});
  });
  it("closes decimal-sized positions without creating phantom trades or merging later entries",()=>{
    const {reconstructTrades}=engine();
    const fill=(t:number,sz:number,side:string,px=100)=>({coin:"xyz:GOOGL",t,sz,side,px,fee:1});
    const trades=reconstructTrades([
      fill(1000,8.541,"B"),fill(2000,8.371,"A"),fill(3000,.17,"A"),
      fill(4000,17.041,"B"),fill(5000,84.491,"B"),fill(6000,12.153,"B"),
      fill(7000,.59,"B"),fill(8000,9.01,"B"),fill(9000,75.882,"B"),
      fill(10000,62.276,"B"),fill(11000,159.911,"B"),fill(12000,421.354,"A"),
      fill(13000,328.724,"B",330.026),
    ]);
    expect(trades).toHaveLength(3);
    expect(trades[0]).toMatchObject({entryTime:1000,exitTime:3000,units:8.541});
    expect(trades[1]).toMatchObject({entryTime:4000,exitTime:12000});
    expect(trades[2]).toMatchObject({open:true,entryTime:13000,entryPx:330.026,units:328.724});
  });
  it("includes older open positions and closes existing imports outside the selected date window",async()=>{
    const wallet=`0x${"a".repeat(40)}`;
    const state={sync:{hyperliquid:{address:wallet,from:5000}},trades:[] as Record<string,unknown>[]};
    let positions=[{coin:"xyz:GOOGL",dir:"Long",entryTime:1000,entryPx:330,units:2,fees:1,open:true}] as Record<string,unknown>[];
    const sync=runInNewContext(`${extract("resolveTpsl")}\n${extract("syncSuccessor")}\n${extract("repairOrphanedSyncRows")}\n${extract("syncVenue")}\nsyncVenue`,{state,syncWarnings:{},hlPositions:async()=>({}),reconcileHlTrades:(trades:unknown[])=>({trades,reviewed:0,omitted:0}),hlFills:async()=>[],hlOpenOrders:async()=>({}),reconstructTrades:()=>positions,normalizeCoin:(s:string)=>s});
    await sync("hyperliquid");
    expect(state.trades).toHaveLength(1);
    state.trades[0].note="Keep this";
    state.trades[0].chartUrl="https://www.tradingview.com/x/H8Kzryaw/";
    positions=[{coin:"xyz:GOOGL",dir:"Long",entryTime:1000,exitTime:3000,entryPx:330,exitPx:335,units:2,fees:2}];
    await sync("hyperliquid");
    expect(state.trades).toHaveLength(1);
    expect(state.trades[0]).toMatchObject({exitTime:3000,note:"Keep this",chartUrl:"https://www.tradingview.com/x/H8Kzryaw/"});
    positions[0].entryPx=331;
    await sync("hyperliquid");
    expect(state.trades[0]).toMatchObject({entryPx:"331",note:"Keep this"});
    positions=[{coin:"BTC",dir:"Long",entryTime:1000,exitTime:3000,entryPx:100,exitPx:101,units:1,fees:1}];
    await sync("hyperliquid");
    expect(state.trades).toHaveLength(1);
  });
  it("discards a position with missing fills and resumes from the next known flat balance",()=>{
    const {reconstructTrades}=engine();
    const trades=reconstructTrades([
      {coin:"LIT",t:1000,px:2,sz:5,side:"A",fee:1,startPosition:0},
      {coin:"LIT",t:2000,px:2,sz:10,side:"B",fee:1,startPosition:-10},
      {coin:"LIT",t:3000,px:2,sz:4,side:"A",fee:1,startPosition:0},
      {coin:"LIT",t:4000,px:1,sz:4,side:"B",fee:1,startPosition:-4},
    ]);
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({entryTime:3000,exitTime:4000,units:4});
    expect(trades.incompleteHistory).toBe(true);
  });
  it("moves phantom positions to review without deleting notes or changing another wallet",()=>{
    const addr=`0x${"a".repeat(40)}`,other=`0x${"b".repeat(40)}`;
    const trade=(coin:string,wallet=addr)=>({id:`sync-hyperliquid-${wallet}-${coin}-1000-open`,source:"hyperliquid",sourceAddress:wallet,coin,entryTime:1000,exitTime:null,units:10,note:"Keep me"});
    const state={trades:[trade("DYDX"),trade("LIT"),trade("xyz:GOOGL"),trade("DYDX",other)]};
    const reconcile=runInNewContext(`${extract("reconcileHlTrades")}\nreconcileHlTrades`,{state});
    const recon=["DYDX","LIT","xyz:GOOGL"].map(coin=>({coin,entryTime:1000,units:10,dir:"Long",open:true}));
    const result=reconcile(recon,[],{"XYZ:GOOGL":10},addr);
    expect(result.trades.map((x:{coin:string})=>x.coin)).toEqual(["xyz:GOOGL"]);
    expect(state.trades[0]).toMatchObject({syncReview:true,note:"Keep me"});
    expect(state.trades[1]).toMatchObject({syncReview:true,note:"Keep me"});
    expect(state.trades[2]).not.toHaveProperty("syncReview");
    expect(state.trades[3]).not.toHaveProperty("syncReview");
    expect(state.trades).toHaveLength(4);
  });
  it("rejects an open reconstruction with the wrong live size or direction",()=>{
    const reconcile=runInNewContext(`${extract("reconcileHlTrades")}\nreconcileHlTrades`,{state:{trades:[]}});
    const rows=[{coin:"BTC",entryTime:1000,units:10,dir:"Long",open:true}];
    expect(reconcile(rows,[],{BTC:9},"address").trades).toHaveLength(0);
    expect(reconcile(rows,[],{BTC:-10},"address").trades).toHaveLength(0);
  });
  it("checks separate markets and rejects failed or malformed live position responses",async()=>{
    const dexes:string[]=[];
    const read=runInNewContext(`${extract("hlPositions")}\nhlPositions`,{state:{trades:[]},AbortSignal,fetch:async(_url:string,options:{body:string})=>{
      const {dex}=JSON.parse(options.body);dexes.push(dex);
      return {ok:true,json:async()=>({assetPositions:dex==="xyz"?[{position:{coin:"xyz:GOOGL",szi:"10"}}]:[]})};
    }});
    expect(await read("wallet",[{coin:"xyz:GOOGL"}])).toMatchObject({"XYZ:GOOGL":10});
    expect(dexes.sort()).toEqual(["","xyz"]);
    for(const response of [{ok:false},{ok:true,json:async()=>({})},{ok:true,json:async()=>({assetPositions:[{position:{coin:"BTC",szi:"bad"}}]})}]){
      const fail=runInNewContext(`${extract("hlPositions")}\nhlPositions`,{state:{trades:[]},AbortSignal,fetch:async()=>response});
      await expect(fail("wallet",[])).rejects.toThrow();
    }
  });
  it("leaves saved trades untouched when live verification fails",async()=>{
    const state={sync:{hyperliquid:{address:`0x${"a".repeat(40)}`,from:0}},trades:[{id:"keep",note:"Keep me"}]};
    const before=JSON.stringify(state);
    const sync=runInNewContext(`${extract("syncSuccessor")}\n${extract("repairOrphanedSyncRows")}\n${extract("syncVenue")}\nsyncVenue`,{state,syncWarnings:{},hlFills:async()=>[],hlOpenOrders:async()=>({}),hlPositions:async()=>{throw new Error("Unavailable");}});
    await expect(sync("hyperliquid")).rejects.toThrow("Unavailable");
    expect(JSON.stringify(state)).toBe(before);
  });
  it("uses account saving and never restores an unowned browser journal",()=>{
    expect(html).not.toContain('localStorage.getItem(STORE)');
    expect(html).not.toContain('localStorage.setItem(STORE');
    expect(html).toContain('ownerId:boot.ownerId');
    expect(html).toContain('revision:revision');
  });
  it("deduplicates sync and carries notes when an open position closes", async()=>{
    const wallet=`0x${"a".repeat(40)}`;
    const state={sync:{hyperliquid:{address:wallet,from:0}},trades:[] as Record<string,unknown>[]};
    let positions=[{coin:"BTC",dir:"Long",entryTime:1000,entryPx:100,units:2,fees:1,open:true}] as Record<string,unknown>[];
    const syncVenue=runInNewContext(`${extract("resolveTpsl")}\n${extract("syncSuccessor")}\n${extract("repairOrphanedSyncRows")}\n${extract("syncVenue")}\nsyncVenue`,{
      state,syncWarnings:{},hlPositions:async()=>({}),reconcileHlTrades:(trades:unknown[])=>({trades,reviewed:0,omitted:0}),hlFills:async()=>[],hlOpenOrders:async()=>({}),reconstructTrades:()=>positions,normalizeCoin:(s:string)=>s.toUpperCase(),
    });
    await syncVenue("hyperliquid");
    expect(state.trades).toHaveLength(1);
    Object.assign(state.trades[0],{note:"Keep this note",strategy:"Breakout",emo:3});
    await syncVenue("hyperliquid");
    expect(state.trades).toHaveLength(1);
    positions=[{coin:"BTC",dir:"Long",entryTime:1000,exitTime:2000,entryPx:100,exitPx:110,units:2,fees:2}];
    await syncVenue("hyperliquid");
    await syncVenue("hyperliquid");
    expect(state.trades).toHaveLength(1);
    expect(state.trades[0]).toMatchObject({note:"Keep this note",strategy:"Breakout",emo:3,sourceAddress:wallet,exitTime:2000});
    state.sync.hyperliquid.address=`0x${"b".repeat(40)}`;
    await syncVenue("hyperliquid");
    expect(state.trades).toHaveLength(2);
  });
  it("treats an Arcus order failure as unavailable rather than confirmed empty",async()=>{
    const read=runInNewContext(`${extract("arcusOpenOrders")}\narcusOpenOrders`,{fetch:async()=>({ok:false,status:403}),AbortSignal});
    expect(await read(`0x${"a".repeat(40)}`)).toMatchObject({__unavailable:true});
  });
  it("retains an existing stop when the order lookup fails",async()=>{
    const wallet=`0x${"a".repeat(40)}`;
    const state={sync:{hyperliquid:{address:wallet,from:0}},trades:[{id:`sync-hyperliquid-${wallet}-BTC-1000-open`,stopPx:"95",tpPx:"120",note:"Keep"}]};
    const sync=runInNewContext(`${extract("resolveTpsl")}\n${extract("syncSuccessor")}\n${extract("repairOrphanedSyncRows")}\n${extract("syncVenue")}\nsyncVenue`,{state,syncWarnings:{},hlPositions:async()=>({}),reconcileHlTrades:(trades:unknown[])=>({trades,reviewed:0,omitted:0}),hlFills:async()=>[],hlOpenOrders:async()=>({__unavailable:true}),reconstructTrades:()=>[{coin:"BTC",dir:"Long",entryTime:1000,entryPx:100,units:1,fees:1,open:true}],normalizeCoin:(s:string)=>s});
    await sync("hyperliquid");
    expect(state.trades[0]).toMatchObject({stopPx:"95",tpPx:"120",note:"Keep"});
  });
it.each(["hyperliquid", "arcus"])("remembers levels through closure for %s", async (venue) => {
  const wallet = `0x${"a".repeat(40)}`;
  const state = { sync: { [venue]: { address: wallet, from: 0 } }, trades: [] as Record<string, unknown>[] };
  let positions: Record<string, unknown>[] = [{ coin: "BTC", dir: "Long", entryTime: 1000, entryPx: 100, units: 1, fees: 1, open: true }];
  let orders: Record<string, unknown> = { BTC: [{ kind: "sl", lvl: 95 }, { kind: "tp", lvl: 120 }] };
  const sync = runInNewContext(`${extract("resolveTpsl")}\n${extract("syncSuccessor")}\n${extract("repairOrphanedSyncRows")}\n${extract("syncVenue")}\nsyncVenue`, {
    state, syncWarnings: {},
    hlFills: async () => [], arcusFills: async () => [],
    hlOpenOrders: async () => orders, arcusOpenOrders: async () => orders,
    hlPositions: async () => ({}),
    reconcileHlTrades: (trades: unknown[]) => ({ trades, reviewed: 0, omitted: 0 }),
    reconstructTrades: () => positions, normalizeCoin: (s: string) => s,
  });
  await sync(venue);
  state.trades[0].note = "Keep this";
  orders = { BTC: [{ kind: "sl", lvl: 97 }] };
  await sync(venue);
  expect(state.trades[0]).toMatchObject({ stopPx: "97", tpPx: "120" });
  orders = {};
  await sync(venue);
  expect(state.trades[0]).toMatchObject({ stopPx: "97", tpPx: "120" });
  orders = { __unavailable: true };
  await sync(venue);
  expect(state.trades[0]).toMatchObject({ stopPx: "97", tpPx: "120" });
  positions = [{ coin: "BTC", dir: "Long", entryTime: 1000, exitTime: 2000, entryPx: 100, exitPx: 113, units: 1, fees: 2 }];
  orders = {};
  await sync(venue);
  expect(state.trades).toHaveLength(1);
  expect(state.trades[0]).toMatchObject({ stopPx: "97", tpPx: "120", exitPx: "113", note: "Keep this" });
  orders = { BTC: [{ kind: "sl", lvl: 80 }, { kind: "tp", lvl: 140 }] };
  await sync(venue);
  expect(state.trades[0]).toMatchObject({ stopPx: "97", tpPx: "120", exitPx: "113" });
  positions.push({ coin: "BTC", dir: "Long", entryTime: 3000, entryPx: 110, units: 1, fees: 1, open: true });
  await sync(venue);
  expect(state.trades[1]).toMatchObject({ stopPx: "80", tpPx: "140" });
  expect(state.trades[0]).toMatchObject({ stopPx: "97", tpPx: "120" });
  state.trades = [];
  positions = [positions[0]];
  await sync(venue);
  expect(state.trades[0]).toMatchObject({ stopPx: "", tpPx: "", exitPx: "113" });
});
it("syncs every configured wallet sequentially and keeps running after one failure",async()=>{
  const wallets=Array.from({length:5},(_,i)=>({address:`0x${String(i+1).repeat(40)}`,from:0}));
  const state={sync:{hyperliquid:wallets,arcus:wallets},trades:[]};
  const calls:string[]=[],status={textContent:""},fields={disabled:false};
  let running=0,maxRunning=0,saves=0;
  const run=runInNewContext(`${extract("walletConfigs")}\n${extract("shortWallet")}\n${extract("runSync")}\nrunSync`,{
    state,syncRunning:false,syncWarnings:{},$: (id:string)=>id==="syncFields"?fields:status,
    save:()=>saves++,renderAll:()=>{},syncVenue:async(v:string,cfg:{address:string})=>{
      running++;maxRunning=Math.max(running,maxRunning);await Promise.resolve();calls.push(v+cfg.address);running--;
      if(v==="hyperliquid"&&cfg.address===wallets[1].address)throw new Error("Wallet unavailable");return 1;
    },
  });
  await run(status);
  expect(calls).toHaveLength(10);expect(new Set(calls).size).toBe(10);expect(maxRunning).toBe(1);
  expect(status.textContent).toContain("Wallet unavailable");expect(status.textContent).toContain("Arcus");
  expect(saves).toBe(1);expect(fields.disabled).toBe(false);
});
it("keeps identical market trades and SL/TP memory separate across two wallets",async()=>{
  const a={address:`0x${"a".repeat(40)}`,from:0},b={address:`0x${"b".repeat(40)}`,from:0};
  const state={sync:{hyperliquid:[a,b]},trades:[] as Record<string,unknown>[]};
  const sync=runInNewContext(`${extract("resolveTpsl")}\n${extract("syncSuccessor")}\n${extract("repairOrphanedSyncRows")}\n${extract("syncVenue")}\nsyncVenue`,{
    state,syncWarnings:{},hlFills:async()=>[],hlPositions:async()=>({BTC:1}),
    hlOpenOrders:async(address:string)=>({BTC:[{kind:"sl",lvl:address===a.address?95:90}]}),
    reconcileHlTrades:(trades:unknown[])=>({trades,reviewed:0,omitted:0}),normalizeCoin:(s:string)=>s,
    reconstructTrades:()=>[{coin:"BTC",dir:"Long",entryTime:1000,entryPx:100,units:1,fees:1,open:true}],
  });
  await sync("hyperliquid",a);await sync("hyperliquid",b);await sync("hyperliquid",a);
  expect(state.trades).toHaveLength(2);
  expect(state.trades[0]).toMatchObject({sourceAddress:a.address,stopPx:"95"});
  expect(state.trades[1]).toMatchObject({sourceAddress:b.address,stopPx:"90"});
});
it("prefers current wallet names, falls back after removal, and escapes markup",()=>{
  const address=`0x${"a".repeat(40)}`;
  const state={sync:{hyperliquid:[{address,label:"Main <wallet>"}],arcus:[{address,label:"Arcus fund"}]}};
  const helpers=runInNewContext(`${extract("walletConfigs")}\n${extract("shortWallet")}\n${extract("walletName")}\n${extract("escapeText")}\n({walletName,escapeText})`,{state});
  expect(helpers.walletName("hyperliquid",address,"Old name")).toBe("Main <wallet>");
  expect(helpers.walletName("arcus",address)).toBe("Arcus fund");
  expect(helpers.escapeText('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  state.sync.hyperliquid[0].label="";
  expect(helpers.walletName("hyperliquid",address,"Old name")).toBe("0xaaaa…aaaa");
  state.sync.hyperliquid=[];
  expect(helpers.walletName("hyperliquid",address,"Saved name")).toBe("Saved name");
});
it("moves notes from a synced trade re-saved as manual onto its closed trade",()=>{
  const addr="0x0f145834b69d3e7a573bed756b31cc366e22036c",key=`sync-hyperliquid-${addr}-xyz:GOLD-1792678178922`;
  const closed={id:`${key}-1792765738317`,source:"hyperliquid",sourceAddress:addr,coin:"xyz:GOLD",exitTime:1792765738317,tpPx:"4100",stopPx:"",strategy:"",emo:null,emotionScale:"tilt-v1",reason:"",note:""};
  const orphan={id:`${key}-open`,coin:"XYZ:GOLD",exitTime:null,tpPx:"4100",stopPx:"",strategy:"",emo:10,emotionScale:"composure-v1",reason:"Breakout",note:"",chartUrl:"https://www.tradingview.com/x/y3yxMJMG/"};
  const state={trades:[orphan,closed]};
  const repair=runInNewContext(`${extract("syncSuccessor")}\n${extract("repairOrphanedSyncRows")}\nrepairOrphanedSyncRows`,{state});
  repair("hyperliquid",addr);
  expect(state.trades).toEqual([{...closed,emo:10,emotionScale:"composure-v1",reason:"Breakout",chartUrl:orphan.chartUrl}]);
});
it("reattaches a re-saved synced trade to its wallet when it has not closed",()=>{
  const addr="0x0f145834b69d3e7a573bed756b31cc366e22036c";
  const state={trades:[{id:`sync-hyperliquid-${addr}-xyz:GOLD-1792678178922-open`,coin:"XYZ:GOLD",exitTime:null},{id:"t1",coin:"BTC"}]};
  runInNewContext(`${extract("syncSuccessor")}\n${extract("repairOrphanedSyncRows")}\nrepairOrphanedSyncRows`,{state})("hyperliquid",addr);
  expect(state.trades[0]).toMatchObject({source:"hyperliquid",sourceAddress:addr,coin:"xyz:GOLD"});
  expect(state.trades[1]).toEqual({id:"t1",coin:"BTC"});
});
it("saves notes onto the closed trade when sync closes it while the form is open",()=>{
  const key="sync-hyperliquid-0xabc-xyz:GOLD-100",closed={id:`${key}-200`,source:"hyperliquid",strategy:"",emo:null,reason:"",note:""};
  const state={trades:[closed]},err={textContent:""};
  const form={id:`${key}-open`,coin:"XYZ:GOLD",strategy:"Trend",emotionScale:"tilt-v1",emo:4,reason:"Plan",note:"",chartUrl:""};
  const ctx={state,readForm:()=>form,validate:()=>null,$:()=>err,save:()=>{},renderAll:()=>{},closeModal:()=>{}};
  runInNewContext(`${extract("syncSuccessor")}\n${extract("saveTrade")}\nsaveTrade`,ctx)();
  expect(state.trades).toHaveLength(1);
  expect(state.trades[0]).toMatchObject({id:closed.id,source:"hyperliquid",strategy:"Trend",emo:4,reason:"Plan"});
  state.trades=[];
  runInNewContext(`${extract("syncSuccessor")}\n${extract("saveTrade")}\nsaveTrade`,ctx)();
  expect(state.trades).toHaveLength(0);
  expect(err.textContent).toContain("updated by sync");
});
});
