"use client";
import { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  Landmark,
  TrendingUp,
  Globe2,
  Layers,
  Bitcoin,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  CalendarDays,
  Target,
  Sparkles,
  Database,
  Eye,
  EyeOff,
  Plus,
  Upload,
  ChevronRight,
  ArrowLeftRight,
  LockKeyhole,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/wealth/ui-kit/sidebar";
import { Toaster } from "@/components/wealth/ui-kit/sonner";
import { toast } from "sonner";
import { useWorkspace } from "@/lib/wealth/store";
import { formatMoney } from "@/lib/wealth/engine";
import type { Data, Ownership } from "@/lib/wealth/types";
import { Button, Choice, Modal } from "./ui";
import { Overview } from "./overview";
import { EntryForm, ImportForm, type EntryKind } from "./forms";
import {
  AllocationSettings,
  CalendarView,
  CardsView,
  GoalView,
  Records,
  SourcesView,
} from "./records";
import { Insights } from "./insights";
import { HoldingsImport } from "./holdings-import";
const groups = [
  {
    label: "WORKSPACE",
    items: [
      ["Overview", LayoutDashboard],
      ["Assets", Wallet],
    ],
  },
  {
    label: "YOUR MONEY",
    items: [
      ["Cash", Landmark],
      ["Indian Stocks", TrendingUp],
      ["US Stocks", Globe2],
      ["Mutual Funds", Layers],
      ["Crypto", Bitcoin],
      ["FDs / EPF", ShieldCheck],
    ],
  },
  {
    label: "ACTIVITY",
    items: [
      ["Income", ArrowDownLeft],
      ["Expenses", ArrowUpRight],
      ["Credit Cards", CreditCard],
      ["Calendar", CalendarDays],
    ],
  },
  {
    label: "LOOK AHEAD",
    items: [
      ["Goal", Target],
      ["AI", Sparkles],
    ],
  },
] as const;
function Navigation({
  page,
  navigate,
  mode,
  switchMode,
}: {
  page: string;
  navigate: (p: string) => void;
  mode: string;
  switchMode: () => void;
}) {
  const sidebar = useSidebar();
  const go = (p: string) => {
    navigate(p);
    sidebar.setOpenMobile(false);
  };
  return (
    <Sidebar className="wealth-sidebar">
      <SidebarHeader>
        <button className="brand" onClick={() => go("Overview")}>
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          <span>
            wealth<span className="brand-os">OS</span>
          </span>
        </button>
        <div className="workspace-name">
          <span className="avatar">V</span>
          <div>
            <b>My workspace</b>
            <small>Personal & business</small>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarMenu>
              {g.items.map(([name, Icon]) => (
                <SidebarMenuItem key={name}>
                  <SidebarMenuButton
                    isActive={page === name}
                    onClick={() => go(name)}
                  >
                    <Icon size={17} />
                    <span>{name === "AI" ? "Ask WealthOS" : name}</span>
                    {name === "AI" ? <span className="nav-new">✧</span> : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={page === "Data Sources"}
              onClick={() => go("Data Sources")}
            >
              <Database size={17} />
              <span>Data sources</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="sidebar-foot">
          <span>
            <LockKeyhole size={12} />
            {mode === "demo" ? "Sample workspace" : "Saved in this browser"}
          </span>
          <button onClick={switchMode} title="Switch workspace">
            <ArrowLeftRight size={14} />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function WealthApp({ownerId}:{ownerId:string}) {
  const store = useWorkspace(ownerId);
  const { workspace, mode, ready, error } = store;
  const [page, setPage] = useState("Overview");
  const [owner, setOwner] = useState<"All" | Ownership>("All");
  const [hidden, setHidden] = useState(false);
  const [entry, setEntry] = useState<{ kind: EntryKind; initial?: any } | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [holdingsImportOpen, setHoldingsImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState(false);
  const data = workspace.data;
  const money = (v: bigint | string, currency = "INR", compact = false) =>
    formatMoney(v, currency, hidden, compact);
  const commit = (action: string, change: (d: Data) => void) => {
    store.commit(action, change);
    toast.success(action);
  };
  const edit = (kind: EntryKind, initial?: any) => {
    if (hidden) {
      toast.info("Show amounts before editing financial records.");
      return;
    }
    if (
      kind === "holding" &&
      !data.accounts.some((a) => a.type !== "Cash" && !a.archived)
    ) {
      toast.info("Add an investment account first.");
      setEntry({ kind: "account" });
      return;
    }
    if (kind === "transaction" && !data.accounts.length) {
      toast.info("Add an account first.");
      setEntry({ kind: "account" });
      return;
    }
    setEntry({ kind, initial });
  };
  const navigate = (p: string) => {
    setPage(p);
    window.scrollTo({ top: 0 });
  };
  const stale = data.accounts.filter(
    (a) =>
      !a.archived &&
      Date.now() - new Date(a.updatedAt).getTime() > data.staleDays * 86400000,
  ).length;
  const labels: Record<string, string> = {
    Overview: "Your wealth, in perspective.",
    Assets: "Every holding. One clear picture.",
    Cash: "Know what is available.",
    Income: "See what your work brings in.",
    Expenses: "Understand where your money goes.",
    AI: "A little more clarity.",
    Goal: "Build towards what matters.",
    "Data Sources": "A clear trail behind every number.",
  };
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "224px" } as React.CSSProperties}
    >
      <Navigation
        page={page}
        navigate={navigate}
        mode={mode}
        switchMode={() => setSwitchOpen(true)}
      />
      <main className={`workspace-main ${hidden ? "privacy-active" : ""}`}>
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-menu" />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{page === "AI" ? "Ask WealthOS" : page}</b>
          </div>
          <div className="topbar-actions">
              <a className="stayflat-back" href="/admin">StayFlat ↗</a>
            <span className="today">
              {new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label={hidden ? "Show amounts" : "Hide amounts"}
              onClick={() => setHidden((v) => !v)}
            >
              {hidden ? <EyeOff size={17} /> : <Eye size={17} />}
            </Button>
            <span className="avatar small-avatar">V</span>
          </div>
        </header>
        <div className="workspace-body">
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                {page === "Overview"
                  ? "THE BIG PICTURE"
                  : "YOUR FINANCIAL WORKSPACE"}
              </div>
              <h1>{page === "AI" ? "Ask WealthOS" : page}</h1>
              <p>
                {labels[page] ??
                  "Your latest balances and the details behind them."}
              </p>
            </div>
            <div className="page-actions">
              {page === "Overview" || page === "Assets" ? (
                <Choice
                  value={owner}
                  onChange={(v) => setOwner(v as typeof owner)}
                  label="Ownership"
                  options={[
                    { value: "All", label: "Personal + business" },
                    "Personal",
                    "Business",
                  ]}
                />
              ) : null}
              <Button
                variant="outline"
                onClick={() => {
                  if (hidden) { toast.info("Show amounts before importing financial records."); return; }
                  if (!data.accounts.some((a) => a.type === "Cash")) {
                    toast.info("Create a cash account before importing.");
                    edit("account");
                  } else setImportOpen(true);
                }}
              >
                <Upload size={15} />
                Import
              </Button>
              <Button
                onClick={() => {
                  if (hidden)
                    toast.info("Show amounts before adding financial records.");
                  else setAddOpen(true);
                }}
              >
                <Plus size={16} />
                Add new
              </Button>
            </div>
          </div>
          <div
            className={`workspace-banner ${mode === "demo" ? "demo-banner" : ""}`}
          >
            <span>
              <span className="status-dot" />
              {mode === "demo"
                ? "Demo workspace · all figures are examples"
                : "Local workspace · data stays in this browser"}
              {stale
                ? ` · ${stale} source${stale > 1 ? "s" : ""} need an update`
                : ""}
            </span>
            <button
              onClick={() =>
                mode === "demo" ? setSwitchOpen(true) : setPrivacyNotice(true)
              }
            >
              {mode === "demo" ? "Start with my data" : "About storage"}
              <ArrowUpRight size={13} />
            </button>
          </div>
          {error ? (
            <div className="error" role="alert">
              {error}
            </div>
          ) : null}
          {!ready ? (
            <div className="loading-state">Opening your workspace…</div>
          ) : page === "Overview" ? (
            <Overview
              data={data}
              owner={owner}
              hidden={hidden}
              money={money}
              navigate={navigate}
              add={() => edit("account")}
            />
          ) : page === "Calendar" ? (
            <CalendarView data={data} money={money} edit={edit} />
          ) : page === "Credit Cards" ? (
            <CardsView data={data} money={money} edit={edit} />
          ) : page === "Goal" ? (
            <GoalView data={data} money={money} commit={commit} />
          ) : page === "Data Sources" ? (
            <SourcesView
              workspace={workspace}
              money={money}
              commit={commit}
              openImport={() => hidden ? toast.info("Show amounts before importing.") : setImportOpen(true)}
              restore={store.restore}
              undo={() => {
                store.undo();
                toast.success("Latest change undone");
              }}
            />
          ) : page === "AI" ? (
            <Insights
              key={String(hidden)}
              data={data}
              money={money}
              commit={commit}
            />
          ) : (
            <>
              <Records
                importHoldings={() => hidden ? toast.info("Show amounts before importing.") : setHoldingsImportOpen(true)}
                key={page}
                page={page}
                data={data}
                money={money}
                owner={owner}
                edit={edit}
                commit={commit}
              />
              {page === "Assets" ? (
                <AllocationSettings data={data} commit={commit} />
              ) : null}
            </>
          )}
          <footer className="workspace-footer">
            <span>
              WealthOS <span>·</span> A clearer view of your money.
            </span>
            <span>
              {mode === "demo"
                ? "Illustrative data"
                : data.fxDate
                  ? `Exchange rate updated ${data.fxDate}`
                  : "Set your reporting exchange rate"}{" "}
              <span>·</span> INR / USD
            </span>
          </footer>
        </div>
      </main>
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="What would you like to add?"
        description="Start with an account, then add its balances and activity."
      >
        <div className="add-options">
          {[
            ["account", "Account", "Bank, broker, crypto, FD or EPF"],
            [
              "holding",
              "Holding or balance",
              "Investment, fixed deposit or EPF",
            ],
            [
              "transaction",
              "Income or expense",
              "A payment, refund or transfer",
            ],
            ["card", "Credit card", "Limit, statement amount and due date"],
            ["event", "Calendar event", "Rent, SIP, subscription or reminder"],
          ].map(([kind, label, desc]) => (
            <button
              key={kind}
              onClick={() => {
                setAddOpen(false);
                edit(kind as EntryKind);
              }}
            >
              <span>
                <b>{label}</b>
                <small>{desc}</small>
              </span>
              <Plus size={17} />
            </button>
          ))}
        </div>
      </Modal>
      <Modal
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        title={
          mode === "demo"
            ? "Start your own workspace"
            : "Explore the example workspace"
        }
        description={
          mode === "demo"
            ? "Your real workspace starts empty. Example balances and history are never copied into it."
            : "Your saved records stay separate from the example data."
        }
      >
        <p className="muted">
          Records are currently saved in this browser. Export regular backups
          from Data sources. You are signed in through StayFlat. Financial records remain in this browser.
        </p>
        <Button
          onClick={() => {
            store.switchMode(mode === "demo" ? "local" : "demo");
            setSwitchOpen(false);
            setPage("Overview");
          }}
        >
          {mode === "demo" ? "Open my workspace" : "Open example workspace"}
        </Button>
      </Modal>
      <Modal
        open={privacyNotice}
        onClose={() => setPrivacyNotice(false)}
        title="About your local workspace"
        description="Your records are saved on this device."
      >
        <p>
          Browser storage is not a cloud backup. Clearing browser data removes
          the local copy. Use Data sources → Full backup to keep a copy of your
          records.
        </p>
        <p>
          StayFlat sign-in protects this page. Financial records stay in this browser; cloud sync is not enabled.
        </p>
      </Modal>
      {holdingsImportOpen ? (
        <HoldingsImport
          data={data}
          commit={commit}
          onClose={() => setHoldingsImportOpen(false)}
        />
      ) : null}
      {entry ? (
        <EntryForm
          key={entry.kind + entry.initial?.id}
          kind={entry.kind}
          initial={entry.initial}
          data={data}
          onClose={() => setEntry(null)}
          commit={commit}
        />
      ) : null}
      {importOpen ? (
        <ImportForm
          data={data}
          onClose={() => setImportOpen(false)}
          commit={commit}
        />
      ) : null}
      <Toaster theme="dark" position="bottom-right" />
    </SidebarProvider>
  );
}
