export type TradingViewChart = { url: string; imageUrl: string | null };

/** Only chart links are allowed; a user URL is never used as an iframe source. */
export function tradingViewChart(input: string): TradingViewChart | null {
  if (!input.trim() || input.length > 2048) return null;
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (url.hostname === "s3.tradingview.com") {
      if (!/^\/snapshots\/[a-zA-Z0-9]\/[a-zA-Z0-9]{6,32}\.png$/.test(url.pathname)) return null;
      return { url: url.origin + url.pathname, imageUrl: url.origin + url.pathname };
    }
    if (!/^(?:www\.|[a-z]{2}\.)?tradingview\.com$/.test(url.hostname)) return null;
    const snapshot = url.pathname.match(/^\/x\/([a-zA-Z0-9]{6,32})\/?$/);
    const idea = url.pathname.match(/^\/chart\/[a-zA-Z0-9:_-]+\/([a-zA-Z0-9]{8})-[a-zA-Z0-9_-]+\/?$/);
    const layout = /^\/chart\/(?:[a-zA-Z0-9]{6,32}\/?)?$/.test(url.pathname);
    if (!snapshot && !idea && !layout) return null;
    const id = snapshot?.[1] ?? idea?.[1];
    url.hash = "";
    return { url: url.href, imageUrl: id ? `https://s3.tradingview.com/snapshots/${id[0].toLowerCase()}/${id}.png` : null };
  } catch { return null; }
}
