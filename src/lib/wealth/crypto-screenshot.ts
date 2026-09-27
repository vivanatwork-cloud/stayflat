import type { CryptoDraft } from "./crypto-import";
export type ScreenWord = {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};
export type ScreenLine = { text: string; cells: { x: number; text: string }[] };
export type ScreenshotReading = { text: string; lines: ScreenLine[] };

// Preserve horizontal position: OCR often returns each table column as a separate block.
export function screenshotLines(words: ScreenWord[]): ScreenLine[] {
  const groups: ScreenWord[][] = [];
  for (const word of [...words]
    .filter((w) => w.text.trim())
    .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)) {
    const mid = (word.bbox.y0 + word.bbox.y1) / 2;
    const group = groups.find((g) => {
      const a = g[0].bbox;
      return (
        Math.abs((a.y0 + a.y1) / 2 - mid) <
        Math.max(a.y1 - a.y0, word.bbox.y1 - word.bbox.y0) * 0.55
      );
    });
    if (group) group.push(word);
    else groups.push([word]);
  }
  return groups.map((group) => {
    const sorted = group.sort((a, b) => a.bbox.x0 - b.bbox.x0),
      cells: ScreenLine["cells"] = [];
    sorted.forEach((w, i) => {
      const previous = sorted[i - 1];
      if (
        previous &&
        w.bbox.x0 - previous.bbox.x1 <
          Math.max(w.bbox.y1 - w.bbox.y0, previous.bbox.y1 - previous.bbox.y0) *
            1.6
      )
        cells[cells.length - 1].text += " " + w.text;
      else cells.push({ x: w.bbox.x0, text: w.text });
    });
    return { text: cells.map((c) => c.text).join("\t"), cells };
  });
}
const known = [
  ["Bitcoin", "BTC"],
  ["Ethereum", "ETH"],
  ["Solana", "SOL"],
  ["USD Coin", "USDC"],
  ["Tether", "USDT"],
  ["XRP", "XRP"],
  ["Dogecoin", "DOGE"],
  ["Cardano", "ADA"],
  ["BNB", "BNB"],
  ["Avalanche", "AVAX"],
  ["Chainlink", "LINK"],
  ["Litecoin", "LTC"],
  ["Hyperliquid", "HYPE"],
  ["Arbitrum", "ARB"],
  ["Pepe", "PEPE"],
  ["Sui", "SUI"],
  ["Aptos", "APT"],
  ["Polkadot", "DOT"],
  ["TRON", "TRX"],
  ["Shiba Inu", "SHIB"],
  ["Uniswap", "UNI"],
  ["Aave", "AAVE"],
  ["Optimism", "OP"],
  ["NEAR Protocol", "NEAR"],
  ["Polygon", "POL"],
  ["Toncoin", "TON"],
  ["Render", "RENDER"],
  ["Bittensor", "TAO"],
  ["Ondo", "ONDO"],
  ["Injective", "INJ"],
  ["Stellar", "XLM"],
  ["Cosmos", "ATOM"],
  ["Dogwifhat", "WIF"],
  ["Bonk", "BONK"],
  ["1inch", "1INCH"],
] as const;
const ignored = new Set(
  "USD INR EUR GBP AUD CAD BUY SELL SEND RECEIVE TOTAL WALLET SPOT FUNDING EARN ASSET ASSETS COIN COINS TOKEN TOKENS NAME PRICE VALUE QUANTITY QTY BALANCE HOLDINGS AMOUNT COST INVESTED CURRENT MARKET AVAILABLE DEPOSIT WITHDRAW TRADE TRADING PORTFOLIO PNL ROI API NFT ALL US DOLLAR CHANGE TODAY APR APY VIEW DETAILS".split(
    " ",
  ),
);
const number = "(?:\\d{1,3}(?:,\\d{2,3})*,\\d{3}|\\d+)(?:\\.\\d+)?";
function identity(text: string): { name: string; symbol: string } | undefined {
  text = text.trim();
  if (
    !text ||
    /^(?:\d+(?:[.,\s]|$)|[$₹€£+\-])/.test(text) ||
    /^(?:quantity|qty|balance|holdings?|value|price|cost|total|purchase|market|current|available)\b/i.test(
      text,
    )
  )
    return;
  const pair = known.find(
    ([name, symbol]) =>
      new RegExp(`\\b${symbol}\\b`, "i").test(text) ||
      new RegExp(`\\b${name}\\b`, "i").test(text),
  );
  if (pair) return { name: pair[0], symbol: pair[1] };
  const symbols = text
    .match(/\b[A-Z]{2}[A-Za-z0-9]{0,13}\b/g)
    ?.filter((s) => !ignored.has(s.toUpperCase()));
  if (!symbols?.length) return;
  const originalSymbol = symbols[symbols.length - 1];
  const symbol = originalSymbol.toUpperCase();
  const name = text
    .replace(new RegExp(`\\b${originalSymbol}\\b`), "")
    .replace(/[()|:]/g, "")
    .trim();
  return { symbol, name: name && !/\d/.test(name) ? name : symbol };
}
function amount(text: string, fallback: string, allowBare = false) {
  const m = text.match(
    new RegExp(
      `(?:([$₹]|USDT|USDC|USD|INR)\\s*)?(${number})(?:\\s*(USDT|USDC|USD|INR))?`,
      "i",
    ),
  );
  if (!m || (!allowBare && !m[1] && !m[3]) || text.includes("%")) return;
  const unit = (m[1] || m[3] || fallback).toUpperCase();
  return {
    value: m[2].replaceAll(",", ""),
    currency: unit === "$" ? "USD" : unit === "₹" ? "INR" : unit,
  };
}
type Column = "asset" | "quantity" | "value" | "cost" | "ignore";
function column(text: string): Column {
  const t = text.toLowerCase().trim();
  if (/^(asset|coin|token|name|crypto)(\s|$)/.test(t)) return "asset";
  if (/price|change|profit|loss|return|24h|allocation/.test(t)) return "ignore";
  if (/cost|invested/.test(t)) return "cost";
  if (/value|worth/.test(t)) return "value";
  if (/quantity|qty|amount|balance|holding/.test(t)) return "quantity";
  return "ignore";
}
export function screenshotDrafts(
  input: string | ScreenshotReading,
  currency: string,
): CryptoDraft[] {
  const source =
    typeof input === "string" ? input : input.lines.length ? null : input.text;
  const lines =
    source !== null
      ? source
          .split(/\r?\n/)
          .filter((l) => l.trim())
          .map((text) => ({
            text,
            cells: text
              .split(/\t| {3,}/)
              .map((t, i) => ({ x: i * 300, text: t.trim() })),
          }))
      : (input as ScreenshotReading).lines;
  const headerIndex = lines.findIndex(
    (l) =>
      l.cells.some((c) => column(c.text) === "asset") &&
      l.cells.some((c) => ["quantity", "value"].includes(column(c.text))),
  );
  const headers =
    headerIndex >= 0
      ? lines[headerIndex].cells.map((c) => ({ ...c, kind: column(c.text) }))
      : null;
  const columnCurrency = (kind: Column) => {
    const label = headers?.find((h) => h.kind === kind)?.text ?? "";
    const unit = label.match(/USDT|USDC|USD|INR|[$₹]/i)?.[0].toUpperCase();
    return unit === "$" ? "USD" : unit === "₹" ? "INR" : unit;
  };
  const rows: {
    row: CryptoDraft;
    lines: string[];
    fields: Partial<Record<Column, string[]>>;
  }[] = [];
  let current: (typeof rows)[number] | undefined;
  for (const line of lines.slice(headerIndex + 1)) {
    if (
      /^(?:total (?:wallet|portfolio)|wallet (?:balance|value)|portfolio (?:balance|value))/i.test(
        line.text.trim(),
      )
    ) {
      current = undefined;
      continue;
    }
    const fields: Partial<Record<Column, string[]>> = {};
    if (headers)
      for (const cell of line.cells) {
        let index = 0;
        for (let i = 1; i < headers.length; i++)
          if (cell.x >= (headers[i - 1].x + headers[i].x) / 2) index = i;
        (fields[headers[index].kind] ??= []).push(cell.text);
      }
    const asset = headers ? (fields.asset ?? []).join(" ") : line.text;
    const hasNumbers = Object.values(fields).some((parts) =>
      parts?.some((t) => /\d/.test(t)),
    );
    const found =
      identity(asset) ??
      (headers &&
      hasNumbers &&
      /^[a-z]{2,10}$/.test(asset) &&
      !ignored.has(asset.toUpperCase())
        ? { name: asset.toUpperCase(), symbol: asset.toUpperCase() }
        : undefined);
    const anotherValue =
      headers &&
      !found &&
      (fields.value ?? []).some((t) => amount(t, currency, true)) &&
      current?.fields.value?.some((t) => amount(t, currency, true));
    if (anotherValue) {
      current = {
        row: {
          id: crypto.randomUUID(),
          name: asset,
          symbol: "",
          quantity: "",
          value: "",
          invested: "",
          currency,
        },
        lines: [],
        fields: {},
      };
      rows.push(current);
    }
    if (found && found.symbol !== current?.row.symbol) {
      current = {
        row: {
          id: crypto.randomUUID(),
          ...found,
          quantity: "",
          value: "",
          invested: "",
          currency,
        },
        lines: [],
        fields: {},
      };
      rows.push(current);
    }
    if (!current) continue;
    if (
      headers &&
      !found &&
      (current.row.name === current.row.symbol || !current.row.name) &&
      /^[A-Za-z][A-Za-z ]{2,40}$/.test(asset) &&
      !ignored.has(asset.toUpperCase())
    )
      current.row.name = asset;
    current.lines.push(
      headers
        ? [...(fields.asset ?? []), ...(fields.quantity ?? [])].join(" ")
        : line.text,
    );
    for (const key of ["quantity", "value", "cost"] as const)
      (current.fields[key] ??= []).push(...(fields[key] ?? []));
  }
  return rows.map(({ row, lines, fields }) => {
    const block = lines.join("\n");
    const explicit = row.symbol
      ? block.match(new RegExp(`(${number})\\s*${row.symbol}\\b`, "i"))?.[1]
      : undefined;
    const labelled = block.match(
      new RegExp(
        `(?:quantity|qty|amount|balance|holdings?)\\s*:?\\s*(${number})(?![\\d.])`,
        "i",
      ),
    )?.[1];
    const following = row.symbol
      ? block.match(
          new RegExp(`\\b${row.symbol}\\s*:?\\s*(${number})`, "i"),
        )?.[1]
      : undefined;
    const bare = fields.quantity?.find((t) =>
      new RegExp(`^${number}$`).test(t.trim()),
    );
    row.quantity = (explicit || labelled || following || bare || "").replaceAll(
      ",",
      "",
    );
    const valueField = fields.value
      ?.map((t) => amount(t, columnCurrency("value") ?? currency, true))
      .find(Boolean);
    const stacked = fields.quantity
      ?.filter(
        (t) => !new RegExp(`^${number}\\s*${row.symbol}$`, "i").test(t.trim()),
      )
      .map((t) => amount(t, currency))
      .find(Boolean);
    const valueLabel = block.match(
      new RegExp(
        `(?:current value|holding value|total value|value|worth)\\s*:?\\s*((?:[$₹]|USDT|USDC|USD|INR)?\\s*${number}(?:\\s*(?:USDT|USDC|USD|INR))?)`,
        "i",
      ),
    )?.[1];
    const value =
      valueField ||
      stacked ||
      (valueLabel ? amount(valueLabel, currency, true) : undefined);
    if (value) {
      row.value = value.value;
      row.currency = value.currency;
    }
    const costLabel = block.match(
      new RegExp(
        `(?:purchase cost|cost basis|total cost|invested|cost)\\s*:?\\s*((?:[$₹]|USDT|USDC|USD|INR)?\\s*${number}(?:\\s*(?:USDT|USDC|USD|INR))?)`,
        "i",
      ),
    )?.[1];
    const cost =
      fields.cost
        ?.map((t) => amount(t, columnCurrency("cost") ?? row.currency, true))
        .find(Boolean) ||
      (costLabel ? amount(costLabel, row.currency, true) : undefined);
    if (cost && cost.currency === row.currency) row.invested = cost.value;
    return row;
  });
}
