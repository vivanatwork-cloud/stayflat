import { emptyData, snapshot } from "./engine";
import type { Data, Workspace } from "./types";
export function demoWorkspace(): Workspace {
  const d: Data = emptyData();
  d.goal = "100000000.00";
  d.goalSet = true;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  d.fxDate = date;
  d.accounts = [
    [
      "axis",
      "Axis savings",
      "Axis Bank",
      "Cash",
      "INR",
      "842650.00",
      "Personal",
    ],
    [
      "hdfc",
      "HDFC business",
      "HDFC Bank",
      "Cash",
      "INR",
      "1248000.00",
      "Business",
    ],
    ["zerodha", "Zerodha", "Zerodha", "Indian Stocks", "INR", "0", "Personal"],
    ["vested", "Vested", "Vested", "US Stocks", "USD", "0", "Personal"],
    ["coin", "Coin", "Zerodha Coin", "Mutual Funds", "INR", "0", "Personal"],
    [
      "crypto",
      "Crypto portfolio",
      "CoinGecko",
      "Crypto",
      "USD",
      "0",
      "Personal",
    ],
    ["fd", "Fixed deposits", "SBI", "FDs", "INR", "0", "Personal"],
    ["epf", "Provident fund", "EPFO", "EPF", "INR", "0", "Personal"],
  ].map(([id, name, institution, type, currency, balance, ownership]) => ({
    id,
    name,
    institution,
    type,
    currency,
    balance,
    ownership,
    updatedAt: date,
    archived: false,
  })) as Data["accounts"];
  d.holdings = [
    [
      "h1",
      "zerodha",
      "Reliance Industries",
      "RELIANCE",
      "Indian Stocks",
      "INR",
      "450",
      "1125000",
      "1322100",
    ],
    [
      "h2",
      "zerodha",
      "HDFC Bank",
      "HDFCBANK",
      "Indian Stocks",
      "INR",
      "850",
      "1232500",
      "1487500",
    ],
    [
      "h3",
      "vested",
      "Apple",
      "AAPL",
      "US Stocks",
      "USD",
      "100",
      "18000",
      "22400",
    ],
    [
      "h4",
      "vested",
      "Vanguard S&P 500 ETF",
      "VOO",
      "US Stocks",
      "USD",
      "50",
      "19000",
      "25450",
    ],
    [
      "h5",
      "coin",
      "Parag Parikh Flexi Cap",
      "PPFAS",
      "Mutual Funds",
      "INR",
      "12000",
      "750000",
      "1128000",
    ],
    [
      "h6",
      "coin",
      "UTI Nifty 50 Index",
      "UTI",
      "Mutual Funds",
      "INR",
      "8500",
      "1000000",
      "1385500",
    ],
    [
      "h7",
      "crypto",
      "Bitcoin",
      "BTC",
      "Crypto",
      "USD",
      "0.18",
      "13500",
      "17280",
    ],
    [
      "h8",
      "crypto",
      "USD Coin",
      "USDC",
      "Crypto",
      "USDC",
      "8500",
      "8500",
      "8500",
    ],
    [
      "h9",
      "fd",
      "SBI Fixed deposit",
      "FD",
      "FDs",
      "INR",
      "1",
      "1500000",
      "1500000",
    ],
    [
      "h10",
      "epf",
      "Employee Provident Fund",
      "EPF",
      "EPF",
      "INR",
      "1",
      "920000",
      "920000",
    ],
  ].map(
    ([
      id,
      accountId,
      name,
      symbol,
      type,
      currency,
      quantity,
      invested,
      value,
    ]) => ({
      id,
      accountId,
      name,
      symbol,
      type,
      currency,
      quantity,
      invested,
      value,
      updatedAt: date,
      ...(type === "Mutual Funds"
        ? { sip: "25000", nextSip: date.slice(0, 7) + "-28" }
        : {}),
      ...(type === "FDs" ? { rate: "7.1", maturity: "2027-06-15" } : {}),
    }),
  ) as Data["holdings"];
  const month = date.slice(0, 7);
  d.transactions = [
    ["Arcus", "420000", "Income", "Arcus", "Business", "hdfc", "05"],
    ["YouTube", "68500", "Income", "YouTube content", "Business", "hdfc", "12"],
    ["Monthly rent", "35000", "Expense", "Household", "Personal", "axis", "01"],
    ["Figma", "1500", "Expense", "Subscriptions", "Business", "hdfc", "03"],
    ["Whole Foods", "4800", "Expense", "Food", "Personal", "axis", "08"],
    [
      "Flight to Bengaluru",
      "12400",
      "Expense",
      "Travel",
      "Business",
      "hdfc",
      "10",
    ],
    [
      "Affiliate payout",
      "24500",
      "Income",
      "Affiliate",
      "Business",
      "hdfc",
      "15",
    ],
    ["Gym membership", "3000", "Expense", "Fitness", "Personal", "axis", "18"],
    [
      "Own account transfer",
      "50000",
      "Transfer",
      "Transfer",
      "Personal",
      "axis",
      "20",
    ],
  ].map(
    (
      [merchant, amount, direction, category, ownership, accountId, day],
      i,
    ) => ({
      id: `t${i}`,
      merchant,
      amount,
      direction,
      category,
      ownership,
      accountId,
      currency: "INR",
      date: `${month}-${day}`,
      note: "",
    }),
  ) as Data["transactions"];
  d.events = [
    {
      id: "e1",
      title: "Parag Parikh SIP",
      date: `${month}-28`,
      amount: "25000",
      currency: "INR",
      type: "SIP",
      frequency: "Monthly",
    },
    {
      id: "e2",
      title: "HDFC card payment",
      date: `${month}-28`,
      amount: "32450",
      currency: "INR",
      type: "Card due",
      frequency: "Monthly",
    },
  ];
  d.cards = [
    {
      id: "c1",
      name: "HDFC Regalia",
      limit: "500000",
      available: "467550",
      spend: "32450",
      due: "32450",
      dueDate: `${month}-28`,
      updatedAt: date,
    },
  ];
  const latest = snapshot(d);
  d.snapshots = Array.from({ length: 90 }, (_, i) => {
    const day = new Date(now);
    day.setDate(day.getDate() - 89 + i);
    const factor = 0.86 + i * 0.00157 + Math.sin(i * 0.62) * 0.004;
    return {
      ...latest,
      id: `s${i}`,
      date: day.toISOString(),
      total: (Number(latest.total) * factor).toFixed(2),
      composition: Object.fromEntries(
        Object.entries(latest.composition).map(([k, v]) => [
          k,
          (Number(v) * factor).toFixed(2),
        ]),
      ),
    };
  });
  d.snapshots.push(latest);
  return { version: 1, data: d, audit: [] };
}
