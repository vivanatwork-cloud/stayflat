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
import { FlatlineMark } from "@/components/brand/flatline-mark";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { AccountMenu } from "@/components/brand/account-menu";
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
import { WealthOnboarding } from "./onboarding";
import { shouldShowSetup, updateSetup } from "@/lib/wealth/onboarding";
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
          <FlatlineMark />
          <span>
            StayFlat<span className="brand-os">.</span>
          </span>
        </button>
        <div className="workspace-name">
          <Wallet size={18} />
          <div>
            <b>Wealth</b>
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
                    <span>{name === "AI" ? "Ask your records" : name}</span>
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
            {mode === "demo" ? "Sample workspace" : "Private account storage"}
          </span>
          <button onClick={switchMode} title="Switch workspace">
            <ArrowLeftRight size={14} />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function WealthApp({ ownerId }: { ownerId: string }) {
  const store = useWorkspace(ownerId);
  const { workspace, mode, ready, error } = store;
  const [page, setPage] = useState("Overview");
  const [owner, setOwner] = useState<"All" | Ownership>("All");
  const [hidden, setHidden] = useState(false);
  const [entry, setEntry] = useState<{
    kind: EntryKind;
    initial?: any;
    defaults?: Record<string, string>;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [holdingsImportOpen, setHoldingsImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState(false);
  const data = workspace.data;
  const money = (v: bigint | string, currency = "INR", compact = false) =>
    formatMoney(v, currency, hidden, compact);
  const commit = (
    action: string,
    change: (d: Data) => void,
    options?: { snapshot?: boolean },
  ) => {
    return store.commit(action, change, options);
  };
  const guided = mode === "local" && shouldShowSetup(store.confirmedData);
  async function resumeSetup() {
    try {
      await commit(
        "Opened guided setup",
        (d) =>
          updateSetup(
            d,
            d.onboarding?.completedAt
              ? "cash"
              : (d.onboarding?.step ?? "welcome"),
          ),
        { snapshot: false },
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  const edit = (
    kind: EntryKind,
    initial?: any,
    defaults?: Record<string, string>,
  ) => {
    if (hidden) {
      toast.info("Show amounts before editing financial records.");
      return;
    }
    if (
      kind === "holding" &&
      !initial &&
      !defaults &&
      ["Indian Stocks", "US Stocks", "Mutual Funds", "Crypto"].includes(page)
    ) {
      const a = data.accounts.find((a) => a.type === page && !a.archived);
      if (!a) {
        toast.info(`Add a ${page} account first.`);
        setEntry({
          kind: "account",
          defaults: {
            type: page,
            currency: page === "US Stocks" ? "USD" : "INR",
          },
        });
        return;
      }
      defaults = { type: page, accountId: a.id, currency: a.currency };
    }
    if (
      kind === "holding" &&
      defaults?.type === "EPF" &&
      !data.accounts.some((a) => a.type === "EPF" && !a.archived)
    ) {
      toast.info("Add your provident fund account first, then its balance.");
      setEntry({ kind: "account", defaults: { type: "EPF" } });
      return;
    }
    if (
      kind === "holding" &&
      page !== "FDs / EPF" &&
      initial?.type !== "FDs" &&
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
    setEntry({
      kind,
      initial,
      defaults:
        defaults ??
        (kind === "holding" && !initial && page === "FDs / EPF"
          ? { type: "FDs", accountId: "", invested: "", currency: "INR" }
          : undefined),
    });
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
    Overview: "Your accounts, investments and cash, together.",
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
            <b>{page === "AI" ? "Ask your records" : page}</b>
          </div>
          <div className="topbar-actions">
            <a className="stayflat-back" href="/report">
              Wallet analytics ↗
            </a>
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
            <ThemeToggle />
            {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
              <AccountMenu accessConfirmed showFeedbackPrompt={false} />
            ) : null}
          </div>
        </header>
        <div className="workspace-body">
          <div className="page-heading">
            <div>
              <div className="page-eyebrow">
                {page === "Overview"
                  ? "STAYFLAT / WEALTH"
                  : "STAYFLAT / WEALTH"}
              </div>
              <h1>
                {page === "Overview" && guided && !hidden
                  ? "Your Wealth setup"
                  : page === "AI"
                    ? "Ask your records"
                    : page}
              </h1>
              <p>
                {labels[page] ??
                  "Your latest balances and the details behind them."}
              </p>
            </div>
            <div
              className="page-actions"
              style={{
                display:
                  guided && page === "Overview" && !hidden ? "none" : undefined,
              }}
            >
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
                  if (hidden) {
                    toast.info(
                      "Show amounts before importing financial records.",
                    );
                    return;
                  }
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
                : store.status === "saving"
                  ? "Saving to your account…"
                  : store.status === "error"
                    ? "Changes not saved"
                    : store.status === "loading"
                      ? "Opening your account…"
                      : "Saved to your StayFlat account"}
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
              {error}{" "}
              <Button variant="outline" onClick={store.retry}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => setPage("Data Sources")}>
                Export backup
              </Button>
            </div>
          ) : null}
          {store.legacy ? (
            <div className="workspace-banner migration-notice">
              <span>An older copy of your records exists in this browser.</span>
              <Button onClick={store.migrate}>Move to my account</Button>
            </div>
          ) : null}
          {!ready ? (
            <div className="loading-state">Opening your workspace…</div>
          ) : page === "Overview" && guided && !hidden ? (
            <WealthOnboarding
              data={data}
              confirmedData={store.confirmedData}
              status={store.status}
              commit={commit}
            />
          ) : page === "Overview" ? (
            <>
              {mode === "local" ? (
                <div className="setup-resume">
                  <div>
                    <strong>
                      {store.confirmedData.onboarding?.completedAt
                        ? "Your setup, at your pace."
                        : "Build your money picture, one step at a time."}
                    </strong>
                    <p>
                      {store.confirmedData.onboarding?.paused
                        ? "Your progress is saved. Pick up where you left off."
                        : "A guided check of your accounts, investments, payments and goals."}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={store.status !== "saved" || hidden}
                    onClick={resumeSetup}
                  >
                    {store.confirmedData.onboarding?.completedAt
                      ? "Review setup"
                      : store.confirmedData.onboarding?.paused
                        ? "Resume setup"
                        : "Start guided setup"}
                  </Button>
                </div>
              ) : null}
              <Overview
                data={data}
                owner={owner}
                hidden={hidden}
                money={money}
                navigate={navigate}
                add={() => edit("account")}
              />
            </>
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
              openImport={() =>
                hidden
                  ? toast.info("Show amounts before importing.")
                  : setImportOpen(true)
              }
              restore={store.restore}
              undo={() => {
                try {
                  store.undo();
                } catch (e) {
                  toast.error((e as Error).message);
                }
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
                importHoldings={() =>
                  hidden
                    ? toast.info("Show amounts before importing.")
                    : setHoldingsImportOpen(true)
                }
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
              StayFlat <span>·</span> Know where you stand.
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
          Your records are saved privately to your StayFlat account. Sign in on
          another device to pick up where you left off. Example records are
          never saved to your account.
        </p>
        <Button
          onClick={() => {
            try {
              store.switchMode(mode === "demo" ? "local" : "demo");
            } catch (e) {
              toast.error((e as Error).message);
              return;
            }
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
        title="Your records, in your account"
        description="Available wherever you sign in to StayFlat."
      >
        <p>
          Your financial records are stored in StayFlat’s database, linked to
          your signed-in account. Other members cannot read them. Clearing
          browser data does not delete saved records.
        </p>
        <p>
          Wait for “Saved to your StayFlat account” before leaving. Undo is
          available for changes made in this session. You can export your
          records and original statements from Data sources.
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
          defaults={entry.defaults}
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
