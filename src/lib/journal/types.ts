export type TradeDirection = "Long" | "Short";
export type TradeSizeMode = "usd" | "units";

export type JournalTrade = {
  id: string;
  entryTime: number;
  coin: string;
  strategy: string;
  dir: TradeDirection;
  entryPx: string;
  sizeMode: TradeSizeMode;
  sizeUsd: string;
  units: string;
  stopPx: string;
  tpPx: string;
  exitPx: string;
  exitTime: number | null;
  fees: string;
  emo: number;
  reason: string;
  note: string;
};

export type JournalState = {
  startingCapital: number;
  trades: JournalTrade[];
  updatedAt: number;
};

export type StoredJournal = {
  version: 2;
  state: JournalState;
  pendingSync: boolean;
};

export const EMPTY_JOURNAL: JournalState = {
  startingCapital: 10_000,
  trades: [],
  updatedAt: 0,
};
