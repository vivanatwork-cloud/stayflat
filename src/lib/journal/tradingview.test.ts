import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { tradingViewChart } from "./tradingview";
const html=readFileSync(new URL("./reference/journal.html",import.meta.url),"utf8");
const start=html.indexOf("  function chartLinkIsValid(");
const end=html.indexOf("\n  function ",start+1);
const inForm=runInNewContext(`${html.slice(start,end)};chartLinkIsValid`,{URL}) as (value:string)=>boolean;
describe("TradingView links",()=>{
  it("previews snapshots and published charts without fetching user-provided HTML",()=>{
    for(const link of ["https://www.tradingview.com/x/H8Kzryaw/","https://in.tradingview.com/x/H8Kzryaw/","https://www.tradingview.com/chart/BTCUSD/H8Kzryaw-example/"]) {
      expect(inForm(link)).toBe(true);
      expect(tradingViewChart(link)?.imageUrl).toBe("https://s3.tradingview.com/snapshots/h/H8Kzryaw.png");
    }
  });
  it("keeps layout links without substituting an unrelated chart preview",()=>{
    const link="https://www.tradingview.com/chart/Abcd1234/?symbol=BINANCE%3ABTCUSDT";
    expect(inForm(link)).toBe(true);expect(tradingViewChart(link)).toEqual({url:link,imageUrl:null});
  });
  it("accepts a direct snapshot image",()=>{
    const url="https://s3.tradingview.com/snapshots/h/H8Kzryaw.png";
    expect(inForm(url)).toBe(true);expect(tradingViewChart(url)?.imageUrl).toBe(url);
  });
  it("rejects executable links, lookalike domains, credentials, ports and unrelated pages in both validators",()=>{
    for(const link of ["javascript:alert(1)","http://www.tradingview.com/x/H8Kzryaw/","https://tradingview.com.evil.test/x/H8Kzryaw/","https://evil.test/chart/Abcd1234/","https://user:password@www.tradingview.com/x/H8Kzryaw/","https://www.tradingview.com:8443/x/H8Kzryaw/","https://www.tradingview.com/support/","https://s3.tradingview.com/not-a-chart.png"]) {
      expect(inForm(link)).toBe(false);expect(tradingViewChart(link)).toBeNull();
    }
  });
});
