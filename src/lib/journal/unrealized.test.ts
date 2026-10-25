import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
const html=readFileSync(new URL('./reference/journal.html',import.meta.url),'utf8');
const extract=(name:string)=>{const start=html.indexOf(`  function ${name}(`);return html.slice(start,html.indexOf('\n  function ',start+1));};
const section=html.slice(html.indexOf('  // Live open-position estimates'),html.indexOf('  // End live open-position estimates'));
const trade={id:'a',coin:'BTC',source:'hyperliquid',entryPx:'100',units:2,dir:'Long',exitPx:'',exitTime:null,fees:'99'};
function engine(fetch:(...args:unknown[])=>Promise<{ok:boolean;json:()=>Promise<unknown>}>=async()=>({ok:true,json:async()=>[]})){
  const state={trades:[{...trade}]};
  const api=runInNewContext(`${extract('unformat')}\n${extract('derive')}\n${section}\npaintOpenPnl=function(){};({priceMarket,parseMarkPrices,openEstimate,refreshOpenPrices,setBook:(key,value)=>priceBooks[key]=value,books:()=>priceBooks})`,{Intl,Date,Map,AbortSignal,fetch,state,document:{hidden:false},normalizeCoin:(s:string)=>s.toUpperCase().replace(/-USD$/,'')});
  return {api,state};
}
describe('unrealized journal estimates',()=>{
  it('calculates signed remaining-size P/L without mixing fees or closed results',()=>{
    const {api}=engine();api.setBook('hyperliquid:',{prices:{BTC:110},at:1000});
    expect(api.openEstimate(trade,1000)).toMatchObject({pnl:20,status:'ok'});
    expect(api.openEstimate({...trade,dir:'Short',units:.5},1000).pnl).toBe(-5);
    expect(api.openEstimate({...trade,units:null,sizeUsd:'1000'},1000).pnl).toBe(100);
    expect(api.openEstimate({...trade,exitPx:'110',exitTime:1000},1000)).toBeNull();
    expect(api.openEstimate({...trade,syncReview:true},1000)).toBeNull();
  });
  it('keeps venues and prefixed markets separate and labels manual reference prices',()=>{
    const {api}=engine();api.setBook('hyperliquid:',{prices:{BTC:100},at:1000});api.setBook('arcus:',{prices:{BTC:120},at:1000});
    expect(api.openEstimate(trade,1000).pnl).toBe(0);
    expect(api.openEstimate({...trade,source:'arcus',coin:'BTC-USD'},1000).pnl).toBe(40);
    expect(api.openEstimate({...trade,source:undefined},1000).reference).toBe(true);
    expect(api.priceMarket({...trade,coin:'XYZ:BTC'})).toMatchObject({group:'hyperliquid:xyz',coin:'XYZ:BTC',dex:'xyz'});
    expect(api.openEstimate({...trade,source:'unknown'},1000).status).toBe('unsupported');
  });
  it('rejects stale, future, missing and invalid prices while retaining a labeled recent failed quote',()=>{
    const {api}=engine();expect(api.openEstimate(trade,1000).status).toBe('loading');
    for(const price of [0,-1,NaN,Infinity]){api.setBook('hyperliquid:',{prices:{BTC:price},at:1000});expect(api.openEstimate(trade,1000).pnl).toBeUndefined();}
    api.setBook('hyperliquid:',{prices:{BTC:110},at:1000,failed:true});
    expect(api.openEstimate(trade,2000)).toMatchObject({status:'delayed',pnl:20});
    expect(api.openEstimate(trade,92000).pnl).toBeUndefined();expect(api.openEstimate(trade,999).pnl).toBeUndefined();
    expect(api.openEstimate({...trade,coin:'UNKNOWN'},2000).pnl).toBeUndefined();
  });
  it('validates market data and excludes delisted or non-perpetual markets',()=>{
    const {api}=engine();
    expect(api.parseMarkPrices([{universe:[{name:'BTC'},{name:'ETH',isDelisted:true}]},[{markPx:'110'},{markPx:'120'}]],{venue:'hyperliquid',dex:'xyz'},1000).prices).toEqual({'XYZ:BTC':110});
    expect(()=>api.parseMarkPrices([{universe:[{}]},[]],{venue:'hyperliquid'},1000)).toThrow();
    const market={baseAsset:'BTC',quoteAsset:'USD',markPrice:'111',status:'ONLINE',type:'PERPETUAL'};
    expect(api.parseMarkPrices({markets:[market,{...market,baseAsset:'ETH',type:'SPOT'},{...market,baseAsset:'SOL',status:'OFFLINE'}]},{venue:'arcus'},1000).prices).toEqual({BTC:111});
  });
  it('batches per venue, isolates failures, and never modifies saved trade state',async()=>{
    const calls:string[]=[];
    const {api,state}=engine(async (...args:unknown[])=>{const url=String(args[0]);calls.push(url);if(url.includes('arcus'))throw new Error('offline');return {ok:true,json:async()=>[{universe:[{name:'BTC'}]},[{markPx:'110'}]]};});
    state.trades.push({...trade,id:'b'},{...trade,id:'c',source:'arcus'});
    const before=JSON.stringify(state);await api.refreshOpenPrices(true);
    expect(calls).toHaveLength(2);expect(JSON.stringify(state)).toBe(before);
    expect(api.openEstimate(trade,Date.now()).pnl).toBe(20);expect(api.openEstimate(state.trades[2],Date.now()).pnl).toBeUndefined();
    await api.refreshOpenPrices(false);expect(calls).toHaveLength(2);
  });
});
