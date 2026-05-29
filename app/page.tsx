"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { withViewTransition } from "@/lib/view-transition";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  LayoutDashboard,
  CreditCard,
  Receipt,
  Users,
  ArrowLeftRight,
  Banknote,
  Plus,
  X,
  Check,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { cn, stripUndefined } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useAppData } from "@/lib/use-app-data";
import { useAndroidBack } from "@/lib/use-android-back";
import { LandingPage } from "@/components/landing-page";
import { useTheme } from "next-themes";
import { ref as dbRef, set as dbSet, get as dbGet } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  LogOut,
  Loader2,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  CloudUpload,
  Info,
  FileSpreadsheet,
  Menu,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════════════════

const PKR = (n: number) => `Rs. ${Number(Math.abs(n) || 0).toLocaleString("en-PK")}`;
const today = () => new Date().toISOString().split("T")[0];
const mStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const mLabel = (m: string) =>
  new Date(m + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
const inits = (n = "") =>
  n
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

const EXP_CATS = [
  "Food & Dining",
  "Transport",
  "Shopping",
  "Utilities",
  "Health",
  "Entertainment",
  "Education",
  "Rent",
  "Investment",
  "Loan Repayment",
  "Other",
];
const INC_CATS = [
  "Salary",
  "Freelance",
  "Business",
  "Gift",
  "Investment Return",
  "Loan Repayment",
  "Other",
];

const CAT_ICONS: Record<string, string> = {
  "Food & Dining": "🍔",
  Transport: "🚗",
  Shopping: "🛍️",
  Utilities: "⚡",
  Health: "💊",
  Entertainment: "🎬",
  Education: "📚",
  Rent: "🏠",
  Investment: "📈",
  Salary: "💼",
  Freelance: "💻",
  Business: "🏢",
  Gift: "🎁",
  "Investment Return": "📊",
  "Loan Repayment": "🔁",
  Other: "📌",
};

const PAL = [
  "#E9A825",
  "#00C896",
  "#7C6EFF",
  "#FF6B9D",
  "#00BCD4",
  "#FF6B6B",
  "#66BB6A",
  "#FFA726",
  "#42A5F5",
  "#AB47BC",
];

const SPLIT_TYPES = [
  { id: "equal", label: "Equal", icon: "⚖️", desc: "Split equally among everyone" },
  { id: "percent", label: "Percentage", icon: "%", desc: "Each pays a percentage of the total" },
  { id: "custom", label: "Custom", icon: "₨", desc: "Enter exact amount for each person" },
  { id: "shares", label: "By Shares", icon: "⅟", desc: "Weighted splits by share count" },
];

// Types
interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
}

interface Transaction {
  id: string;
  accountId: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  desc: string;
  date: string;
  paidBy?: string;
  settled?: boolean;
  splitId?: string;
  kind?: string;
  relatedFriendId?: string;
}

interface Friend {
  id: string;
  name: string;
  color: string;
  phone?: string;
}

interface Participant {
  id: string;
  share: number;
  settled: boolean;
}

interface Split {
  id: string;
  title: string;
  desc: string;
  date: string;
  total: number;
  paidBy: string;
  splitType: string;
  participants: Participant[];
}

interface Loan {
  id: string;
  friendId: string;
  direction: "lent" | "borrowed";
  amount: number;
  desc: string;
  date: string;
  accountId: string;
  settled: boolean;
  settlementTxId?: string;
}

interface AppData {
  accounts: Account[];
  transactions: Transaction[];
  friends: Friend[];
  splits: Split[];
  loans: Loan[];
}

// ═══════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════

const SEED: AppData = {
  accounts: [
    { id: "a1", name: "Meezan Bank", type: "Bank", balance: 150000, color: "#00c896" },
    { id: "a2", name: "Jazz Cash", type: "Wallet", balance: 25000, color: "#7c6eff" },
    { id: "a3", name: "Cash in Hand", type: "Cash", balance: 8500, color: "#e9a825" },
  ],
  transactions: [
    { id: "t1", accountId: "a1", type: "income", amount: 80000, category: "Salary", desc: "Monthly salary – May", date: "2026-05-01" },
    { id: "t2", accountId: "a1", type: "expense", amount: 15000, category: "Rent", desc: "Monthly rent", date: "2026-05-01" },
    { id: "t3", accountId: "a1", type: "expense", amount: 2500, category: "Food & Dining", desc: "Lunch at Burns Road", date: "2026-05-07" },
    { id: "t4", accountId: "a1", type: "expense", amount: 1200, category: "Transport", desc: "Uber rides", date: "2026-05-06" },
    { id: "t5", accountId: "a2", type: "expense", amount: 5000, category: "Shopping", desc: "Clothes from Zara", date: "2026-05-05" },
    { id: "t6", accountId: "a3", type: "expense", amount: 800, category: "Food & Dining", desc: "Street food", date: "2026-05-04" },
    { id: "t7", accountId: "a1", type: "expense", amount: 3500, category: "Utilities", desc: "Electricity & Internet", date: "2026-05-03" },
    { id: "t8", accountId: "a2", type: "income", amount: 12000, category: "Freelance", desc: "Web project payment", date: "2026-04-28" },
    { id: "t9", accountId: "a1", type: "expense", amount: 4200, category: "Health", desc: "Pharmacy & lab tests", date: "2026-04-22" },
    { id: "t10", accountId: "a1", type: "expense", amount: 1800, category: "Food & Dining", desc: "Team lunch (Sara paid)", date: "2026-05-08", paidBy: "f2", settled: false },
  ],
  friends: [
    { id: "f1", name: "Ali Hassan", color: "#7c6eff", phone: "0300-1234567" },
    { id: "f2", name: "Sara Ahmed", color: "#ff6b9d", phone: "0321-9876543" },
    { id: "f3", name: "Bilal Raza", color: "#00c896", phone: "0333-4567890" },
  ],
  splits: [
    {
      id: "s1",
      title: "Dinner at Kolachi",
      desc: "Group outing",
      date: "2026-05-03",
      total: 12000,
      paidBy: "me",
      splitType: "equal",
      participants: [
        { id: "me", share: 3000, settled: true },
        { id: "f1", share: 3000, settled: false },
        { id: "f2", share: 3000, settled: true },
        { id: "f3", share: 3000, settled: false },
      ],
    },
    {
      id: "s2",
      title: "Trip to Murree",
      desc: "Hotel + fuel",
      date: "2026-04-20",
      total: 40000,
      paidBy: "f1",
      splitType: "shares",
      participants: [
        { id: "me", share: 10000, settled: false },
        { id: "f1", share: 10000, settled: true },
        { id: "f2", share: 10000, settled: true },
        { id: "f3", share: 10000, settled: false },
      ],
    },
  ],
  loans: [
    { id: "l1", friendId: "f3", direction: "lent", amount: 7000, desc: "Emergency cash", date: "2026-05-02", accountId: "a1", settled: false },
    { id: "l2", friendId: "f1", direction: "borrowed", amount: 5000, desc: "Covered my phone bill", date: "2026-04-25", accountId: "a2", settled: false },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// COMPUTE SHARES HELPER
// ═══════════════════════════════════════════════════════════════════

function distributeFair(ideals: number[], total: number): number[] {
  if (!ideals.length) return [];
  const floors = ideals.map((v) => Math.floor(v));
  const sum = floors.reduce((s, x) => s + x, 0);
  let leftover = total - sum;
  const result = floors.slice();
  if (leftover === 0) return result;
  const order = ideals
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) =>
      leftover > 0 ? b.frac - a.frac || a.i - b.i : a.frac - b.frac || a.i - b.i
    );
  const sign = leftover > 0 ? 1 : -1;
  const steps = Math.abs(leftover);
  for (let k = 0; k < steps; k++) result[order[k % order.length].i] += sign;
  return result;
}

function computeShares(
  total: number,
  type: string,
  parts: string[],
  cfg: Record<string, { amount?: number; pct?: number; shares?: number }>
): Record<string, number> {
  const n = parts.length;
  if (!n) return {};
  if (!total) return Object.fromEntries(parts.map((id) => [id, 0]));

  if (type === "custom") {
    return Object.fromEntries(
      parts.map((id) => [id, Math.round(+(cfg[id]?.amount || 0))])
    );
  }

  let ideals: number[];
  if (type === "equal") {
    ideals = parts.map(() => total / n);
  } else if (type === "percent") {
    ideals = parts.map((id) => (total * +(cfg[id]?.pct || 0)) / 100);
  } else if (type === "shares") {
    const totalShares = parts.reduce((s, id) => s + +(cfg[id]?.shares || 1), 0);
    if (!totalShares) return Object.fromEntries(parts.map((id) => [id, 0]));
    ideals = parts.map((id) => (total * +(cfg[id]?.shares || 1)) / totalShares);
  } else {
    return Object.fromEntries(parts.map((id) => [id, 0]));
  }
  const amounts = distributeFair(ideals, total);
  return Object.fromEntries(parts.map((id, i) => [id, amounts[i]]));
}

// ═══════════════════════════════════════════════════════════════════
// BALANCE-IMPACT HELPERS
// ═══════════════════════════════════════════════════════════════════

function txAccountDelta(t: Transaction): number {
  if (t.type === "income") return +t.amount;
  const paidByMe = !t.paidBy || t.paidBy === "me";
  if (paidByMe) return -t.amount;
  return t.settled ? -t.amount : 0;
}

function loanAccountDelta(ln: Loan): number {
  if (ln.settled && !ln.settlementTxId) return 0;
  return ln.direction === "lent" ? -ln.amount : +ln.amount;
}

function isSettlement(t: Transaction): boolean {
  return t.kind === "settlement" || t.category === "Loan Repayment";
}

function txCanDelete(tx: Transaction, splitsList: Split[]): { ok: boolean; reason?: string } {
  if (isSettlement(tx)) return { ok: true };
  if (tx.paidBy && tx.paidBy !== "me" && !tx.settled) {
    return { ok: false, reason: "Settle this transaction with the payer before deleting." };
  }
  if (tx.splitId) {
    const sp = splitsList.find((s) => s.id === tx.splitId);
    if (sp && sp.participants.some((p) => !p.settled)) {
      return { ok: false, reason: "This split has unsettled participants. Settle everyone before deleting." };
    }
  }
  return { ok: true };
}

function friendCanDelete(friendId: string, fDebts: Record<string, number>): { ok: boolean; reason?: string } {
  if (Math.abs(fDebts[friendId] || 0) > 0) {
    return { ok: false, reason: "This friend has an outstanding balance. Settle it before removing them." };
  }
  return { ok: true };
}

function splitCanDelete(sp: Split): { ok: boolean; reason?: string } {
  if (sp.participants.some((p) => !p.settled)) {
    return { ok: false, reason: "This split has unsettled participants. Settle everyone before deleting." };
  }
  return { ok: true };
}

function loanCanDelete(ln: Loan): { ok: boolean; reason?: string } {
  if (!ln.settled) {
    return { ok: false, reason: "This loan is unsettled. Settle it before deleting." };
  }
  return { ok: true };
}

function myShareOf(tx: Transaction, splitsList: Split[]): number {
  if (!tx.splitId) return tx.amount;
  const sp = splitsList.find((s) => s.id === tx.splitId);
  if (!sp) return tx.amount;
  const mine = sp.participants.find((p) => p.id === "me");
  return mine ? mine.share : 0;
}

// ═══════════════════════════════════════════════════════════════════
// RESPONSIVE HOOK
// ═══════════════════════════════════════════════════════════════════

function useIsMobile(breakpoint = 768) {
  const query = `(max-width:${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return isMobile;
}

// ═══════════════════════════════════════════════════════════════════
// SECTION LABEL
// ═══════════════════════════════════════════════════════════════════

function SectionLabel({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 mb-2 px-1", className)}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-4 w-1 rounded-full bg-primary flex-shrink-0" />
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground truncate">
          {children}
        </h2>
      </div>
      {action}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="relative">
          <span aria-hidden="true" className="anim-logo-orbit absolute inset-0 -m-3 rounded-3xl border-2 border-primary/30 border-t-primary" />
          <img src="/logo.png" alt="Rupiyaa" className="anim-logo-loader w-16 h-16 rounded-2xl object-cover relative" />
        </div>
      </div>
    );
  }
  if (!user) {
    return <LandingPage />;
  }
  return <AuthedApp />;
}

function AuthedApp() {
  const { user, logout } = useAuth();
  const { data, setData, loaded, sync } = useAppData(SEED);

  // ── State ────────────────────────────────────────────────────────
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState<string | null>(null);
  const [month, setMonth] = useState(mStr());
  const [selFriend, setSelFriend] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [splitOn, setSplitOn] = useState(false);
  const [sParts, setSParts] = useState<string[]>(["me"]);
  const [sType, setSType] = useState("equal");
  const [sCfg, setSCfg] = useState<Record<string, any>>({});
  const [hideSettled, setHideSettled] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [expandedSplits, setExpandedSplits] = useState<Set<string>>(new Set());
  const [friendOpenSection, setFriendOpenSection] = useState<"splits" | "loans" | "paid" | null>(null);
  const isMobile = useIsMobile();

  const toggleSplitExpanded = (id: string) => {
    setExpandedSplits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Smooth view-to-view transition using the browser's View Transitions API,
  // falling back to an instant swap (the section-stagger CSS still animates).
  const switchView = useCallback(
    (id: string) => {
      if (id === view) return;
      withViewTransition(() => {
        setView(id);
        setSelFriend(null);
        setDrawerOpen(false);
      });
    },
    [view],
  );

  // Android hardware back button: drawer → modal → friend detail → dashboard → exit
  useAndroidBack([
    () => { if (drawerOpen) { setDrawerOpen(false); return true; } return false; },
    () => { if (modal) { setModal(null); return true; } return false; },
    () => { if (selFriend) { setSelFriend(null); return true; } return false; },
    () => { if (view !== "dashboard") { switchView("dashboard"); return true; } return false; },
  ]);

  const { accounts, transactions, friends, splits } = data;
  const loans = data.loans || [];
  const upd = <K extends keyof AppData>(k: K, v: AppData[K]) => setData((p) => ({ ...p, [k]: v }));

  const openModal = (name: string, f: Record<string, any> = {}) => {
    setForm(f);
    setModal(name);
    setSplitOn(false);
    setSParts(["me"]);
    setSType("equal");
    setSCfg({});
  };
  const closeModal = () => {
    setModal(null);
    setForm({});
    setSplitOn(false);
    setSParts(["me"]);
    setSType("equal");
    setSCfg({});
  };
  const setF = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // ── Computed ─────────────────────────────────────────────────────
  const totalBal = useMemo(() => accounts.reduce((s, a) => s + a.balance, 0), [accounts]);
  const monthTxs = useMemo(
    () => transactions.filter((t) => (t.date || "").slice(0, 7) === month),
    [transactions, month]
  );
  const monthIn = useMemo(
    () => monthTxs.filter((t) => t.type === "income" && !isSettlement(t)).reduce((s, t) => s + t.amount, 0),
    [monthTxs]
  );
  const monthOut = useMemo(
    () => monthTxs.filter((t) => t.type === "expense" && !isSettlement(t)).reduce((s, t) => s + myShareOf(t, splits), 0),
    [monthTxs, splits]
  );
  const catData = useMemo(() => {
    const m: Record<string, number> = {};
    monthTxs
      .filter((t) => t.type === "expense" && !isSettlement(t))
      .forEach((t) => {
        const share = myShareOf(t, splits);
        if (share > 0) m[t.category] = (m[t.category] || 0) + share;
      });
    return Object.entries(m)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTxs, splits]);

  const monthHistory = useMemo(() => {
    const now = new Date();
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = mStr(d);
      const txs = transactions.filter((t) => (t.date || "").slice(0, 7) === m);
      const income = txs.filter((t) => t.type === "income" && !isSettlement(t)).reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter((t) => t.type === "expense" && !isSettlement(t)).reduce((s, t) => s + myShareOf(t, splits), 0);
      arr.push({
        m,
        label: d.toLocaleDateString("en-US", { month: "short" }),
        fullLabel: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        income,
        expense,
        net: income - expense,
        count: txs.length,
      });
    }
    return arr;
  }, [transactions, splits]);

  const fDebts = useMemo(() => {
    const d: Record<string, number> = {};
    friends.forEach((f) => (d[f.id] = 0));
    splits.forEach((sp) => {
      sp.participants.forEach((p) => {
        if (p.settled) return;
        if (sp.paidBy === "me" && p.id !== "me") d[p.id] = (d[p.id] || 0) + p.share;
        if (sp.paidBy !== "me" && p.id === "me") d[sp.paidBy] = (d[sp.paidBy] || 0) - p.share;
      });
    });
    loans.forEach((ln) => {
      if (ln.settled || !(ln.friendId in d)) return;
      if (ln.direction === "lent") d[ln.friendId] += ln.amount;
      else d[ln.friendId] -= ln.amount;
    });
    transactions.forEach((t) => {
      if (t.type === "expense" && t.paidBy && t.paidBy !== "me" && !t.settled && !t.splitId && t.paidBy in d)
        d[t.paidBy] -= t.amount;
    });
    return d;
  }, [splits, friends, loans, transactions]);

  const owedToMe = useMemo(
    () => Object.values(fDebts).filter((v) => v > 0).reduce((s, v) => s + v, 0),
    [fDebts]
  );
  const iOwe = useMemo(
    () => Math.abs(Object.values(fDebts).filter((v) => v < 0).reduce((s, v) => s + v, 0)),
    [fDebts]
  );
  const netPocket = useMemo(() => totalBal + owedToMe - iOwe, [totalBal, owedToMe, iOwe]);
  const loanCollect = useMemo(
    () => loans.filter((l) => l.direction === "lent" && !l.settled).reduce((s, l) => s + l.amount, 0),
    [loans]
  );
  const loanPay = useMemo(
    () => loans.filter((l) => l.direction === "borrowed" && !l.settled).reduce((s, l) => s + l.amount, 0),
    [loans]
  );
  const splitTotals = useMemo(() => {
    let collect = 0, pay = 0;
    splits.forEach((sp) => {
      sp.participants.forEach((p) => {
        if (p.settled) return;
        if (sp.paidBy === "me" && p.id !== "me") collect += p.share;
        if (sp.paidBy !== "me" && p.id === "me") pay += p.share;
      });
    });
    return { collect, pay };
  }, [splits]);

  // ── Split helpers ─────────────────────────────────────────────────
  const getShares = (amt: number) => computeShares(+(amt || 0), sType, sParts, sCfg);
  const updCfg = (id: string, field: string, val: any) =>
    setSCfg((p) => ({ ...p, [id]: { ...(p[id] || {}), [field]: val } }));
  const gName = (id: string) =>
    id === "me" ? "You" : friends.find((f) => f.id === id)?.name || "Unknown";
  const gColor = (id: string) =>
    id === "me" ? "#E9A825" : friends.find((f) => f.id === id)?.color || "#888";

  // Month nav
  const prevM = () => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() - 1);
    setMonth(mStr(d));
  };
  const nextM = () => {
    const d = new Date(month + "-01");
    d.setMonth(d.getMonth() + 1);
    setMonth(mStr(d));
  };

  // ── Handlers ─────────────────────────────────────────────────────

  const doAddAccount = () => {
    if (!form.name || form.balance === undefined || form.balance === "") return;
    if (form.id) {
      upd(
        "accounts",
        accounts.map((a) =>
          a.id !== form.id ? a : { ...a, name: form.name, type: form.aType || "Bank", balance: +form.balance || 0 }
        )
      );
      closeModal();
      return;
    }
    const a: Account = {
      id: "a" + Date.now(),
      name: form.name,
      type: form.aType || "Bank",
      balance: +form.balance || 0,
      color: PAL[accounts.length % PAL.length],
    };
    upd("accounts", [...accounts, a]);
    closeModal();
  };

  const editAccount = (a: Account) =>
    openModal("addAccount", { id: a.id, name: a.name, aType: a.type, balance: String(a.balance) });

  const doDelAccount = (id: string) => {
    setData((p) => ({
      ...p,
      accounts: p.accounts.filter((a) => a.id !== id),
      transactions: p.transactions.filter((t) => t.accountId !== id),
    }));
  };

  const doAddTx = () => {
    if (!form.amount || !form.category || !form.accountId) return;
    const amt = +form.amount;
    const type = form.txType || "expense";
    const paidBy = type === "expense" ? form.paidBy || "me" : "me";

    if (form.id) {
      const oldTx = transactions.find((t) => t.id === form.id);
      if (!oldTx) return;
      const newTx: Transaction = {
        ...oldTx,
        accountId: form.accountId,
        type,
        amount: amt,
        category: form.category,
        desc: form.desc || "",
        date: form.date || today(),
        paidBy,
      };
      setData((p) => {
        const oldD = txAccountDelta(oldTx);
        const newD = txAccountDelta(newTx);
        let accs = p.accounts.map((a) =>
          a.id !== oldTx.accountId ? a : { ...a, balance: a.balance - oldD }
        );
        accs = accs.map((a) =>
          a.id !== newTx.accountId ? a : { ...a, balance: a.balance + newD }
        );
        return {
          ...p,
          accounts: accs,
          transactions: p.transactions.map((t) => (t.id === form.id ? newTx : t)),
        };
      });
      closeModal();
      return;
    }

    const scope = form.scope || (splitOn ? "group" : "personal");
    const minParts = scope === "others" ? 1 : 2;
    const makeSplit = splitOn && type === "expense" && sParts.length >= minParts;

    if (makeSplit) {
      if (sType === "percent") {
        const tot = sParts.reduce((s, id) => s + +(sCfg[id]?.pct || 0), 0);
        if (Math.abs(tot - 100) > 0.5) {
          alert(`Percentages must add up to 100%. Current total: ${tot.toFixed(1)}%`);
          return;
        }
      }
      if (sType === "custom") {
        const tot = sParts.reduce((s, id) => s + +(sCfg[id]?.amount || 0), 0);
        if (Math.abs(tot - amt) > Math.max(1, Math.round(amt * 0.01))) {
          alert(`Custom amounts (${PKR(tot)}) must equal transaction total (${PKR(amt)})`);
          return;
        }
      }
    }

    const splitId = makeSplit ? "s" + Date.now() : undefined;
    const tx: Transaction = {
      id: "t" + Date.now(),
      accountId: form.accountId,
      type,
      amount: amt,
      category: form.category,
      desc: form.desc || "",
      date: form.date || today(),
      paidBy,
      settled: false,
      splitId,
    };

    const delta = txAccountDelta(tx);
    const newAccounts = accounts.map((a) =>
      a.id !== form.accountId ? a : { ...a, balance: a.balance + delta }
    );
    const newSplits = [...splits];

    if (makeSplit) {
      const shares = getShares(amt);
      newSplits.unshift({
        id: splitId!,
        title: tx.desc || tx.category,
        desc: "Created from transaction",
        date: tx.date,
        total: amt,
        paidBy,
        splitType: sType,
        participants: sParts.map((id) => ({
          id,
          share: shares[id] || 0,
          settled: id === paidBy,
        })),
      });
    }

    setData((p) => ({
      ...p,
      transactions: [tx, ...p.transactions],
      accounts: newAccounts,
      splits: newSplits,
    }));
    closeModal();
  };

  const editTx = (tx: Transaction) => {
    if (tx.splitId) {
      const sp = splits.find((s) => s.id === tx.splitId);
      if (sp) return editSplit(sp);
    }
    return openModal("addTx", {
      id: tx.id,
      txType: tx.type,
      amount: String(tx.amount),
      category: tx.category,
      accountId: tx.accountId,
      desc: tx.desc || "",
      date: tx.date,
      paidBy: tx.paidBy || "me",
      linkedSplit: !!tx.splitId,
    });
  };

  const doDelTx = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    const delta = txAccountDelta(tx);
    const newAccounts = accounts.map((a) =>
      a.id !== tx.accountId ? a : { ...a, balance: a.balance - delta }
    );
    setData((p) => ({
      ...p,
      transactions: p.transactions.filter((t) => t.id !== id),
      accounts: newAccounts,
      splits: tx.splitId ? p.splits.filter((s) => s.id !== tx.splitId) : p.splits,
    }));
  };

  const toggleTxSettled = (id: string, chosenAccountId?: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    if (!tx.settled && !chosenAccountId) {
      return openSettlePrompt({ kind: "tx", id });
    }
    const updated = {
      ...tx,
      settled: !tx.settled,
      ...(chosenAccountId ? { accountId: chosenAccountId } : {}),
    };
    setData((p) => {
      const oldD = txAccountDelta(tx);
      const newD = txAccountDelta(updated);
      let accs = p.accounts.map((a) =>
        a.id !== tx.accountId ? a : { ...a, balance: a.balance - oldD }
      );
      accs = accs.map((a) =>
        a.id !== updated.accountId ? a : { ...a, balance: a.balance + newD }
      );
      return {
        ...p,
        transactions: p.transactions.map((t) => (t.id !== id ? t : updated)),
        accounts: accs,
      };
    });
  };

  const doAddFriend = () => {
    if (!form.name) return;
    if (form.id) {
      upd(
        "friends",
        friends.map((f) =>
          f.id !== form.id ? f : { ...f, name: form.name, phone: form.phone || "" }
        )
      );
      closeModal();
      return;
    }
    const f: Friend = {
      id: "f" + Date.now(),
      name: form.name,
      phone: form.phone || "",
      color: PAL[friends.length % PAL.length],
    };
    upd("friends", [...friends, f]);
    closeModal();
  };

  const editFriend = (f: Friend) =>
    openModal("addFriend", { id: f.id, name: f.name, phone: f.phone || "" });

  const doDelFriend = (id: string) => {
    setData((p) => ({
      ...p,
      friends: p.friends.filter((f) => f.id !== id),
      splits: p.splits.map((sp) => ({
        ...sp,
        participants: sp.participants.filter((p2) => p2.id !== id),
      })),
      loans: (p.loans || []).filter((l) => l.friendId !== id),
    }));
    if (selFriend === id) setSelFriend(null);
  };

  const doAddSplit = () => {
    if (!form.title || !form.total || !form.accountId || sParts.length < 2) return;
    const amt = +form.total;

    if (sType === "percent") {
      const tot = sParts.reduce((s, id) => s + +(sCfg[id]?.pct || 0), 0);
      if (Math.abs(tot - 100) > 0.5) {
        alert(`Percentages must total 100%. Current: ${tot.toFixed(1)}%`);
        return;
      }
    }
    if (sType === "custom") {
      const tot = sParts.reduce((s, id) => s + +(sCfg[id]?.amount || 0), 0);
      if (Math.abs(tot - amt) > Math.max(1, Math.round(amt * 0.01))) {
        alert(`Custom amounts (${PKR(tot)}) must equal total (${PKR(amt)})`);
        return;
      }
    }

    const shares = getShares(amt);
    const paidBy = form.paidBy || "me";
    const category = form.category || "Other";

    if (form.id) {
      const old = splits.find((s) => s.id === form.id);
      if (!old) return;
      const updated: Split = {
        ...old,
        title: form.title,
        desc: form.desc || "",
        date: form.date || today(),
        total: amt,
        paidBy,
        splitType: sType,
        participants: sParts.map((id) => {
          const prev = old?.participants.find((p) => p.id === id);
          return { id, share: shares[id] || 0, settled: prev ? prev.settled : id === paidBy };
        }),
      };
      setData((p) => {
        const newSplits = p.splits.map((s) => (s.id === form.id ? updated : s));
        const linkedTx = p.transactions.find((t) => t.splitId === form.id);
        if (!linkedTx) return { ...p, splits: newSplits };
        const newTx = {
          ...linkedTx,
          accountId: form.accountId,
          amount: amt,
          date: form.date || today(),
          paidBy,
          desc: form.title,
          category,
        };
        const oldD = txAccountDelta(linkedTx);
        const newD = txAccountDelta(newTx);
        let accs = p.accounts.map((a) =>
          a.id !== linkedTx.accountId ? a : { ...a, balance: a.balance - oldD }
        );
        accs = accs.map((a) =>
          a.id !== newTx.accountId ? a : { ...a, balance: a.balance + newD }
        );
        return {
          ...p,
          splits: newSplits,
          accounts: accs,
          transactions: p.transactions.map((t) => (t.id === linkedTx.id ? newTx : t)),
        };
      });
      closeModal();
      return;
    }

    const splitId = "s" + Date.now();
    const sp: Split = {
      id: splitId,
      title: form.title,
      desc: form.desc || "",
      date: form.date || today(),
      total: amt,
      paidBy,
      splitType: sType,
      participants: sParts.map((id) => ({
        id,
        share: shares[id] || 0,
        settled: id === paidBy,
      })),
    };
    const tx: Transaction = {
      id: "t" + Date.now(),
      accountId: form.accountId,
      type: "expense",
      amount: amt,
      category,
      desc: form.title,
      date: form.date || today(),
      paidBy,
      settled: false,
      splitId,
    };
    const delta = txAccountDelta(tx);
    const newAccounts = accounts.map((a) =>
      a.id !== form.accountId ? a : { ...a, balance: a.balance + delta }
    );
    setData((p) => ({
      ...p,
      splits: [sp, ...p.splits],
      transactions: [tx, ...p.transactions],
      accounts: newAccounts,
    }));
    closeModal();
  };

  const editSplit = (sp: Split) => {
    const linkedTx = transactions.find((t) => t.splitId === sp.id);
    openModal("addSplit", {
      id: sp.id,
      title: sp.title,
      desc: sp.desc,
      total: String(sp.total),
      date: sp.date,
      paidBy: sp.paidBy,
      category: linkedTx?.category || "Other",
      accountId: linkedTx?.accountId || accounts[0]?.id || "",
    });
    setSParts(sp.participants.map((p) => p.id));
    setSType(sp.splitType);
    const cfg: Record<string, any> = {};
    sp.participants.forEach((p) => {
      if (sp.splitType === "percent") cfg[p.id] = { pct: ((p.share / sp.total) * 100).toFixed(1) };
      else if (sp.splitType === "custom") cfg[p.id] = { amount: p.share };
      else if (sp.splitType === "shares") cfg[p.id] = { shares: 1 };
    });
    setSCfg(cfg);
  };

  const doDelSplit = (id: string) => {
    setData((p) => {
      const linkedTx = p.transactions.find((t) => t.splitId === id);
      let accs = p.accounts;
      if (linkedTx) {
        const delta = txAccountDelta(linkedTx);
        accs = accs.map((a) =>
          a.id !== linkedTx.accountId ? a : { ...a, balance: a.balance - delta }
        );
      }
      return {
        ...p,
        splits: p.splits.filter((s) => s.id !== id),
        transactions: p.transactions.filter((t) => t.splitId !== id),
        accounts: accs,
      };
    });
  };

  const toggleSettled = (splitId: string, partId: string, chosenAccountId?: string) => {
    const sp = splits.find((s) => s.id === splitId);
    if (!sp) return;
    const part = sp.participants.find((p) => p.id === partId);
    if (!part) return;
    const incoming = sp.paidBy === "me" && partId !== "me";
    if (!part.settled && !chosenAccountId) {
      const friendName = gName(incoming ? partId : sp.paidBy);
      return openModal("settleAction", {
        kind: "split",
        splitId,
        partId,
        friendName,
        amount: part.share,
        incoming,
        accountId: "",
      });
    }
    setData((p) => {
      const newSplits = p.splits.map((s) => {
        if (s.id !== splitId) return s;
        return {
          ...s,
          participants: s.participants.map((pa) =>
            pa.id !== partId ? pa : { ...pa, settled: !pa.settled }
          ),
        };
      });
      const friendId = incoming ? partId : sp.paidBy;
      const friendName = gName(friendId);
      let newTxs = p.transactions;
      let newAccs = p.accounts;
      if (chosenAccountId && !part.settled) {
        const stx: Transaction = {
          id: "st" + Date.now(),
          accountId: chosenAccountId,
          type: incoming ? "income" : "expense",
          amount: part.share,
          category: "Loan Repayment",
          desc: `${incoming ? "Repayment from" : "Repayment to"} ${friendName} (${sp.title})`,
          date: today(),
          kind: "settlement",
          relatedFriendId: friendId,
        };
        newTxs = [stx, ...newTxs];
        const delta = incoming ? part.share : -part.share;
        newAccs = newAccs.map((a) =>
          a.id !== chosenAccountId ? a : { ...a, balance: a.balance + delta }
        );
      }
      return { ...p, splits: newSplits, transactions: newTxs, accounts: newAccs };
    });
    closeModal();
  };

  const doAddLoan = (dir?: string) => {
    const direction = dir || form.direction || "lent";
    if (!form.amount || !form.friendId || !form.accountId) return;
    const amt = +form.amount;

    if (form.id) {
      const old = loans.find((l) => l.id === form.id);
      if (!old) return;
      const updated: Loan = {
        ...old,
        friendId: form.friendId,
        direction: direction as "lent" | "borrowed",
        amount: amt,
        desc: form.desc || "",
        date: form.date || today(),
        accountId: form.accountId,
      };
      setData((p) => {
        const oldD = loanAccountDelta(old);
        const newD = loanAccountDelta(updated);
        let accs = p.accounts.map((a) =>
          a.id !== old.accountId ? a : { ...a, balance: a.balance - oldD }
        );
        accs = accs.map((a) =>
          a.id !== updated.accountId ? a : { ...a, balance: a.balance + newD }
        );
        return { ...p, loans: p.loans.map((l) => (l.id === form.id ? updated : l)), accounts: accs };
      });
      closeModal();
      return;
    }

    const ln: Loan = {
      id: "l" + Date.now(),
      friendId: form.friendId,
      direction: direction as "lent" | "borrowed",
      amount: amt,
      desc: form.desc || "",
      date: form.date || today(),
      accountId: form.accountId,
      settled: false,
    };
    const delta = loanAccountDelta(ln);
    const newAccs = accounts.map((a) =>
      a.id !== form.accountId ? a : { ...a, balance: a.balance + delta }
    );
    setData((p) => ({ ...p, loans: [ln, ...p.loans], accounts: newAccs }));
    closeModal();
  };

  const editLoan = (ln: Loan) =>
    openModal("addLoan", {
      id: ln.id,
      friendId: ln.friendId,
      direction: ln.direction,
      amount: String(ln.amount),
      desc: ln.desc,
      date: ln.date,
      accountId: ln.accountId,
    });

  const doDelLoan = (id: string) => {
    const ln = loans.find((l) => l.id === id);
    if (!ln) return;
    const delta = loanAccountDelta(ln);
    setData((p) => ({
      ...p,
      loans: p.loans.filter((l) => l.id !== id),
      accounts: p.accounts.map((a) =>
        a.id !== ln.accountId ? a : { ...a, balance: a.balance - delta }
      ),
      transactions: ln.settlementTxId
        ? p.transactions.filter((t) => t.id !== ln.settlementTxId)
        : p.transactions,
    }));
  };

  const toggleLoanSettled = (id: string, chosenAccountId?: string) => {
    const ln = loans.find((l) => l.id === id);
    if (!ln) return;
    const incoming = ln.direction === "lent";
    if (!ln.settled && !chosenAccountId) {
      const friendName = friends.find((f) => f.id === ln.friendId)?.name || "Friend";
      return openModal("settleAction", {
        kind: "loan",
        id,
        friendName,
        amount: ln.amount,
        incoming,
        accountId: "",
      });
    }
    setData((p) => {
      const friendName = p.friends.find((f) => f.id === ln.friendId)?.name || "Friend";
      let newTxs = p.transactions;
      let newAccs = p.accounts;
      let settlementTxId = ln.settlementTxId;
      if (chosenAccountId && !ln.settled) {
        const stx: Transaction = {
          id: "st" + Date.now(),
          accountId: chosenAccountId,
          type: incoming ? "income" : "expense",
          amount: ln.amount,
          category: "Loan Repayment",
          desc: `${incoming ? "Repayment from" : "Repayment to"} ${friendName}`,
          date: today(),
          kind: "settlement",
          relatedFriendId: ln.friendId,
        };
        newTxs = [stx, ...newTxs];
        settlementTxId = stx.id;
        const delta = incoming ? ln.amount : -ln.amount;
        newAccs = newAccs.map((a) =>
          a.id !== chosenAccountId ? a : { ...a, balance: a.balance + delta }
        );
      } else if (ln.settled && ln.settlementTxId) {
        const stx = p.transactions.find((t) => t.id === ln.settlementTxId);
        if (stx) {
          const delta = stx.type === "income" ? -stx.amount : stx.amount;
          newAccs = newAccs.map((a) =>
            a.id !== stx.accountId ? a : { ...a, balance: a.balance + delta }
          );
        }
        newTxs = newTxs.filter((t) => t.id !== ln.settlementTxId);
        settlementTxId = undefined;
      }
      return {
        ...p,
        loans: p.loans.map((l) =>
          l.id !== id ? l : { ...l, settled: !l.settled, settlementTxId }
        ),
        transactions: newTxs,
        accounts: newAccs,
      };
    });
    closeModal();
  };

  const openSettlePrompt = (payload: Record<string, any>) => {
    const { kind, id, splitId, partId } = payload;
    let friendName = "Friend";
    let amount = 0;
    let incoming = true;

    if (kind === "loan") {
      const ln = loans.find((l) => l.id === id);
      if (ln) {
        friendName = friends.find((f) => f.id === ln.friendId)?.name || "Friend";
        amount = ln.amount;
        incoming = ln.direction === "lent";
      }
    } else if (kind === "tx") {
      const tx = transactions.find((t) => t.id === id);
      if (tx) {
        friendName = friends.find((f) => f.id === tx.paidBy)?.name || "Friend";
        amount = tx.amount;
        incoming = false;
      }
    } else if (kind === "split") {
      const sp = splits.find((s) => s.id === splitId);
      if (sp) {
        const part = sp.participants.find((p) => p.id === partId);
        incoming = sp.paidBy === "me" && partId !== "me";
        friendName = gName(incoming ? partId : sp.paidBy);
        amount = part?.share || 0;
      }
    }

    openModal("settleAction", { ...payload, friendName, amount, incoming, accountId: "" });
  };

  // ═══════════════════════════════════════════════════════════════════
  // NAV ITEMS
  // ═══════════════════════════════════════════════════════════════════

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "accounts", label: "Accounts", icon: CreditCard },
    { id: "history", label: "Transactions", icon: Receipt },
    { id: "splits", label: "Bill Splits", icon: ArrowLeftRight },
    { id: "loans", label: "Loans", icon: Banknote },
    { id: "friends", label: "Friends", icon: Users },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  const viewTitle = (v: string) => {
    switch (v) {
      case "dashboard": return "Home";
      case "accounts": return "Accounts";
      case "history": return "Transactions";
      case "splits": return "Bill Splits";
      case "loans": return "Loans";
      case "friends": return "Friends";
      case "settings": return "Settings";
      default: return "Rupiyaa";
    }
  };

  const fabHidden = view === "settings";

  const fabAction = () => {
    if (view === "accounts") return openModal("addAccount");
    if (view === "splits") return openModal("addSplit", { date: today(), paidBy: "me" });
    if (view === "loans") return openModal("addLoan", { direction: "lent", date: today() });
    if (view === "friends") return openModal("addFriend");
    return openModal("addTx", { txType: "expense", date: today(), paidBy: "me" });
  };

  // ═══════════════════════════════════════════════════════════════════
  // VIEWS
  // ═══════════════════════════════════════════════════════════════════

  const DashboardView = () => (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your financial overview</p>
        </div>
        <div className="flex items-center gap-1 lg:gap-2 bg-secondary/50 rounded-full p-1 lg:bg-transparent lg:p-0 lg:rounded-none">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full lg:h-9 lg:w-9" onClick={prevM}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[100px] lg:min-w-[120px] text-center">{mLabel(month)}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full lg:h-9 lg:w-9" onClick={nextM}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* OVERVIEW */}
      <section className="flex flex-col gap-3 lg:gap-4">
        <SectionLabel>Overview</SectionLabel>

        {/* Hero Net Pocket */}
        <Card className="bg-gradient-to-br from-primary/25 via-primary/10 to-primary/5 border-primary/30 overflow-hidden relative">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
          <CardHeader className="pb-2 relative">
            <CardDescription className="text-primary/90 text-xs uppercase tracking-wider font-semibold">Net Pocket</CardDescription>
            <CardTitle className="text-3xl lg:text-4xl font-bold text-primary tracking-tight">
              {PKR(netPocket)}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-xs text-muted-foreground">After settling all debts</p>
          </CardContent>
        </Card>

        {/* Compact 3-stat row on mobile, full cards on desktop */}
        <div className="grid grid-cols-3 gap-2 lg:gap-4 lg:grid-cols-3">
        <Card className="lg:bg-card">
          <CardHeader className="p-3 lg:p-6 pb-1 lg:pb-2">
            <CardDescription className="flex items-center gap-1 lg:gap-2 text-[10px] lg:text-sm">
              <Wallet className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden xs:inline lg:inline">Total</span>
              <span className="hidden lg:inline">Balance</span>
            </CardDescription>
            <CardTitle className="text-sm lg:text-2xl font-bold leading-tight">{PKR(totalBal)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground">{accounts.length} accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 lg:p-6 pb-1 lg:pb-2">
            <CardDescription className="flex items-center gap-1 lg:gap-2 text-accent text-[10px] lg:text-sm">
              <TrendingUp className="h-3 w-3 lg:h-4 lg:w-4" />
              <span>To Collect</span>
            </CardDescription>
            <CardTitle className="text-sm lg:text-2xl font-bold text-accent leading-tight">{PKR(owedToMe)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground">Owed to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 lg:p-6 pb-1 lg:pb-2">
            <CardDescription className="flex items-center gap-1 lg:gap-2 text-destructive text-[10px] lg:text-sm">
              <TrendingDown className="h-3 w-3 lg:h-4 lg:w-4" />
              <span>To Pay</span>
            </CardDescription>
            <CardTitle className="text-sm lg:text-2xl font-bold text-destructive leading-tight">{PKR(iOwe)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-6 pt-0 lg:pt-0">
            <p className="text-[10px] lg:text-xs text-muted-foreground">You owe</p>
          </CardContent>
        </Card>
        </div>
      </section>

      {/* THIS MONTH */}
      <section className="flex flex-col gap-3 lg:gap-4">
        <SectionLabel>This Month</SectionLabel>

        {/* Monthly Summary */}
        <div className="grid grid-cols-3 gap-2 lg:gap-4">
          <Card>
            <CardHeader className="p-3 lg:p-6 pb-1 lg:pb-2">
              <CardDescription className="text-[10px] lg:text-sm">Income</CardDescription>
              <CardTitle className="text-sm lg:text-xl text-accent flex items-center gap-1 lg:gap-2 leading-tight">
                <ArrowDownLeft className="h-3 w-3 lg:h-5 lg:w-5 flex-shrink-0" />
                <span className="truncate">{PKR(monthIn)}</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 lg:p-6 pb-1 lg:pb-2">
              <CardDescription className="text-[10px] lg:text-sm">Expenses</CardDescription>
              <CardTitle className="text-sm lg:text-xl text-destructive flex items-center gap-1 lg:gap-2 leading-tight">
                <ArrowUpRight className="h-3 w-3 lg:h-5 lg:w-5 flex-shrink-0" />
                <span className="truncate">{PKR(monthOut)}</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="p-3 lg:p-6 pb-1 lg:pb-2">
              <CardDescription className="text-[10px] lg:text-sm">Savings</CardDescription>
              <CardTitle className={cn("text-sm lg:text-xl flex items-center gap-1 truncate leading-tight", monthIn - monthOut >= 0 ? "text-accent" : "text-destructive")}>
                {PKR(monthIn - monthOut)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {catData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No expenses this month
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catData.slice(0, 6)} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-sm font-medium">{payload[0].payload.name}</p>
                              <p className="text-sm text-muted-foreground">{PKR(payload[0].value as number)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {catData.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PAL[index % PAL.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">6-Month Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthHistory}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C896" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-medium mb-1">{label}</p>
                            <p className="text-xs text-accent">Income: {PKR(payload[0].value as number)}</p>
                            <p className="text-xs text-destructive">Expense: {PKR(payload[1].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#00C896" fill="url(#incomeGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" stroke="#FF6B6B" fill="url(#expenseGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        </div>
      </section>

      {/* RECENT ACTIVITY */}
      <section className="flex flex-col gap-3 lg:gap-4">
        <SectionLabel
          action={
            <Button variant="ghost" size="sm" className="h-7 text-xs -mr-2" onClick={() => switchView("history")}>
              View All
            </Button>
          }
        >
          Recent Activity
        </SectionLabel>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between sr-only">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => switchView("history")}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthTxs.slice(0, 5).map((tx) => {
              const acc = accounts.find((a) => a.id === tx.accountId);
              const isIncome = tx.type === "income";
              return (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                      {CAT_ICONS[tx.category] || "📌"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.desc || tx.category}</p>
                      <p className="text-xs text-muted-foreground">{tx.date} · {acc?.name}</p>
                    </div>
                  </div>
                  <span className={cn("font-mono font-semibold", isIncome ? "text-accent" : "text-destructive")}>
                    {isIncome ? "+" : "-"}{PKR(tx.amount)}
                  </span>
                </div>
              );
            })}
            {monthTxs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No transactions this month</p>
            )}
          </div>
        </CardContent>
      </Card>
      </section>
    </div>
  );

  const AccountsView = () => (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex items-center justify-between gap-2">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground">Manage your financial accounts</p>
        </div>
        <Button size="sm" className="ml-auto lg:size-default" onClick={() => openModal("addAccount")}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Account
        </Button>
      </div>

      {/* SUMMARY */}
      <section className="flex flex-col gap-3 lg:gap-4">
        <SectionLabel>Summary</SectionLabel>
        <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/20 overflow-hidden relative">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
          <CardHeader className="pb-2 relative">
            <CardDescription className="text-primary/90 text-xs uppercase tracking-wider font-semibold">Total Balance</CardDescription>
            <CardTitle className="text-2xl lg:text-3xl font-bold tracking-tight">{PKR(totalBal)}</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-xs text-muted-foreground">
              Across {accounts.length} account{accounts.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* YOUR ACCOUNTS */}
      <section className="flex flex-col gap-3 lg:gap-4">
        <SectionLabel>Your Accounts</SectionLabel>

      {/* Mobile: list rows */}
      <div className="lg:hidden space-y-2">
        {accounts.map((a) => (
          <Card key={a.id} className="group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: a.color }} />
            <CardContent className="p-3 pl-4 flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full grid place-items-center flex-shrink-0"
                style={{ backgroundColor: `${a.color}22`, color: a.color }}
              >
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{a.name}</p>
                <p className="text-[11px] text-muted-foreground">{a.type}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-semibold text-sm" style={{ color: a.color }}>
                  {PKR(a.balance)}
                </p>
              </div>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editAccount(a)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => window.confirm(`Delete ${a.name}?`) && doDelAccount(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center text-sm">No accounts yet. Tap + to add one.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: cards */}
      <div className="hidden lg:grid gap-4 lg:grid-cols-3">
        {accounts.map((a) => (
          <Card key={a.id} className="group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: a.color }} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">{a.type}</Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editAccount(a)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => window.confirm(`Delete ${a.name}?`) && doDelAccount(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="text-lg">{a.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono" style={{ color: a.color }}>{PKR(a.balance)}</p>
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No accounts yet. Add your first account!</p>
            </CardContent>
          </Card>
        )}
      </div>
      </section>
    </div>
  );

  const HistoryView = () => (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="flex items-center justify-between gap-2">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">{mLabel(month)}</p>
        </div>
        <div className="flex items-center gap-1 lg:gap-2 bg-secondary/50 rounded-full p-1 lg:bg-transparent lg:p-0 lg:rounded-none">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full lg:h-9 lg:w-9" onClick={prevM}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[100px] text-center lg:hidden">{mLabel(month)}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full lg:h-9 lg:w-9" onClick={nextM}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" className="hidden lg:inline-flex" onClick={() => openModal("addTx", { txType: "expense", date: today(), paidBy: "me" })}>
          <Plus className="h-4 w-4 mr-2" /> Add Transaction
        </Button>
      </div>

      {/* THIS MONTH */}
      <section className="flex flex-col gap-3 lg:gap-4">
        <SectionLabel>This Month</SectionLabel>
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          <Card className="bg-accent/10 border-accent/20">
            <CardContent className="p-3 lg:p-4">
              <p className="text-[10px] lg:text-sm text-muted-foreground">Income</p>
              <p className="text-sm lg:text-xl font-bold text-accent leading-tight truncate">{PKR(monthIn)}</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-3 lg:p-4">
              <p className="text-[10px] lg:text-sm text-muted-foreground">Expenses</p>
              <p className="text-sm lg:text-xl font-bold text-destructive leading-tight truncate">{PKR(monthOut)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 lg:p-4">
              <p className="text-[10px] lg:text-sm text-muted-foreground">Net</p>
              <p className={cn("text-sm lg:text-xl font-bold leading-tight truncate", monthIn - monthOut >= 0 ? "text-accent" : "text-destructive")}>
                {PKR(monthIn - monthOut)}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ACTIVITY */}
      <section className="flex flex-col gap-3 lg:gap-4">
        <SectionLabel>Activity</SectionLabel>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={txSearch}
          onChange={(e) => setTxSearch(e.target.value)}
          placeholder="Search by description, category, or amount…"
          className="pl-9 h-11 rounded-full"
        />
        {txSearch && (
          <button
            type="button"
            onClick={() => setTxSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full grid place-items-center text-muted-foreground hover:bg-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] lg:h-[600px]">
            {(() => {
              const q = txSearch.trim().toLowerCase();
              const filtered = q
                ? monthTxs.filter((t) =>
                    [t.desc, t.category, String(t.amount), accounts.find((a) => a.id === t.accountId)?.name]
                      .filter(Boolean)
                      .some((s) => String(s).toLowerCase().includes(q))
                  )
                : monthTxs;

              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {q ? `No transactions match "${txSearch}"` : "No transactions this month"}
                    </p>
                  </div>
                );
              }

              const todayKey = new Date().toISOString().slice(0, 10);
              const yKey = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
              const dateLabel = (d: string) => {
                if (d === todayKey) return "Today";
                if (d === yKey) return "Yesterday";
                const dt = new Date(d + "T00:00:00");
                if (isNaN(dt.getTime())) return d;
                return dt.toLocaleDateString("en-PK", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
              };

              const groupMap: Record<string, Transaction[]> = {};
              filtered.forEach((tx) => {
                const k = tx.date || "—";
                (groupMap[k] = groupMap[k] || []).push(tx);
              });
              const ordered = Object.keys(groupMap).sort().reverse();

              return ordered.map((dateKey) => {
                const dayTxs = groupMap[dateKey];
                const dayTotalIn = dayTxs
                  .filter((t) => t.type === "income" && !isSettlement(t))
                  .reduce((s, t) => s + t.amount, 0);
                const dayTotalOut = dayTxs
                  .filter((t) => t.type === "expense" && !isSettlement(t))
                  .reduce((s, t) => s + myShareOf(t, splits), 0);
                const dayNet = dayTotalIn - dayTotalOut;

                return (
                  <div key={dateKey} className="w-full min-w-0">
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2 bg-secondary/80 backdrop-blur border-b border-border w-full min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">{dateLabel(dateKey)}</span>
                      <span className={cn("text-xs font-mono whitespace-nowrap flex-shrink-0", dayNet >= 0 ? "text-accent" : "text-destructive")}>
                        {dayNet >= 0 ? "+" : "−"}{PKR(dayNet)}
                      </span>
                    </div>
                    <div className="divide-y divide-border">
                      {dayTxs.map((tx) => {
                        const acc = accounts.find((a) => a.id === tx.accountId);
                        const isIncome = tx.type === "income";
                        const payer = tx.paidBy && tx.paidBy !== "me" ? friends.find((f) => f.id === tx.paidBy) : null;
                        return (
                          <div
                            key={tx.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => editTx(tx)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); editTx(tx); } }}
                            className="flex items-center gap-2.5 p-3 lg:p-4 hover:bg-secondary/50 transition-colors group cursor-pointer w-full min-w-0"
                          >
                            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-secondary flex items-center justify-center text-base lg:text-lg flex-shrink-0">
                              {CAT_ICONS[tx.category] || "📌"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="font-medium truncate text-sm">{tx.desc || tx.category}</p>
                                {tx.splitId && <Badge variant="secondary" className="text-[9px] px-1.5 py-0 flex-shrink-0">Split</Badge>}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {acc?.name} · {tx.category}
                                {payer && ` · ${payer.name} paid`}
                              </p>
                            </div>
                            <p className={cn("font-mono font-semibold text-sm flex-shrink-0 whitespace-nowrap", isIncome ? "text-accent" : "text-destructive")}>
                              {isIncome ? "+" : "−"}{PKR(tx.amount)}
                            </p>
                            <div className="hidden lg:flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); editTx(tx); }}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              {(() => {
                                const can = txCanDelete(tx, splits);
                                return (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    disabled={!can.ok}
                                    title={can.ok ? "Delete" : can.reason}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!can.ok) { alert(can.reason); return; }
                                      if (window.confirm("Delete this transaction?")) doDelTx(tx.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </ScrollArea>
        </CardContent>
      </Card>
      </section>
    </div>
  );

  const SplitsView = () => {
    const settledCount = splits.filter((sp) => sp.participants.every((p) => p.settled)).length;
    const visible = hideSettled ? splits.filter((sp) => !sp.participants.every((p) => p.settled)) : splits;

    return (
      <div className="flex flex-col gap-6 lg:gap-8">
        <div className="flex items-center justify-between gap-2">
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold">Bill Splits</h1>
          </div>
          <Button size="sm" className="ml-auto hidden lg:inline-flex" onClick={() => { openModal("addSplit", { paidBy: "me", date: today() }); setSParts(["me"]); }}>
            <Plus className="h-4 w-4 mr-2" /> New Split
          </Button>
        </div>

        {/* OUTSTANDING */}
        <section className="flex flex-col gap-3 lg:gap-4">
          <SectionLabel>Outstanding</SectionLabel>
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-3 lg:p-4">
                <p className="text-[10px] lg:text-xs uppercase tracking-wider text-accent/80 font-semibold">To Collect</p>
                <p className="text-base lg:text-2xl font-bold text-accent font-mono leading-tight truncate">{PKR(splitTotals.collect)}</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="p-3 lg:p-4">
                <p className="text-[10px] lg:text-xs uppercase tracking-wider text-destructive/80 font-semibold">To Pay</p>
                <p className="text-base lg:text-2xl font-bold text-destructive font-mono leading-tight truncate">{PKR(splitTotals.pay)}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* YOUR SPLITS */}
        <section className="flex flex-col gap-3 lg:gap-4">
          <SectionLabel
            action={
              settledCount > 0 ? (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox id="hideSettled" checked={hideSettled} onCheckedChange={(c) => setHideSettled(!!c)} />
                  <span>Hide settled ({settledCount})</span>
                </label>
              ) : undefined
            }
          >
            Your Splits
          </SectionLabel>

        <div className="space-y-3 lg:space-y-4">
          {visible.map((sp) => {
            const unsettled = sp.participants.filter((p) => !p.settled);
            const pendingAmt = unsettled.reduce((s, p) => s + p.share, 0);
            const allDone = unsettled.length === 0;
            const stInfo = SPLIT_TYPES.find((s) => s.id === sp.splitType);

            const isExpanded = expandedSplits.has(sp.id);
            return (
              <Card key={sp.id} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSplitExpanded(sp.id)}
                  aria-expanded={isExpanded}
                  className="w-full text-left p-3 lg:p-4 hover:bg-secondary/30 transition-colors flex items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm lg:text-base truncate">{sp.title}</p>
                      {allDone && <Badge className="bg-accent/20 text-accent border-accent/30 text-[9px] px-1.5 py-0 flex-shrink-0">Settled</Badge>}
                    </div>
                    <p className="text-[11px] lg:text-xs text-muted-foreground truncate">
                      {sp.date} · Paid by {gName(sp.paidBy)} · {sp.participants.length} people
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm lg:text-base font-bold font-mono text-primary leading-tight whitespace-nowrap">{PKR(sp.total)}</p>
                    {!allDone && <p className="text-[10px] text-destructive whitespace-nowrap">{PKR(pendingAmt)} due</p>}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200", isExpanded && "rotate-180")} />
                </button>
                {isExpanded && (
                <CardContent className="border-t border-border bg-secondary/20 pt-3 pb-3 lg:pt-4 lg:pb-4">
                  {stInfo && (
                    <div className="mb-3">
                      <Badge variant="secondary" className="text-[10px]">{stInfo.icon} {stInfo.label} split</Badge>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {sp.participants.map((p) => {
                      const showPayRecv =
                        !p.settled &&
                        ((sp.paidBy === "me" && p.id !== "me") || (sp.paidBy !== "me" && p.id === "me"));
                      const incoming = sp.paidBy === "me";

                      return (
                        <div key={p.id} className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-lg",
                          p.settled ? "bg-accent/5 border border-accent/10" : "bg-background"
                        )}>
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback style={{ backgroundColor: gColor(p.id) }} className="text-white text-[10px]">
                              {inits(gName(p.id))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs lg:text-sm truncate">
                              {gName(p.id)}
                              {p.id === sp.paidBy && <span className="ml-1.5 text-[9px] uppercase tracking-wider text-muted-foreground">paid</span>}
                            </p>
                          </div>
                          <p className="font-mono font-semibold text-xs lg:text-sm flex-shrink-0">{PKR(p.share)}</p>
                          {p.settled ? (
                            <Badge className="bg-accent/20 text-accent text-[9px] px-1.5 py-0 flex-shrink-0">✓</Badge>
                          ) : showPayRecv ? (
                            <Button
                              size="sm"
                              variant={incoming ? "default" : "destructive"}
                              className="text-[10px] h-6 px-2 flex-shrink-0"
                              onClick={() => toggleSettled(sp.id, p.id)}
                            >
                              {incoming ? "Receive" : "Pay"}
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-1 mt-3">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => editSplit(sp)}>
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    {(() => {
                      const can = splitCanDelete(sp);
                      return (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive"
                          disabled={!can.ok}
                          title={can.ok ? "Delete split" : can.reason}
                          onClick={() => {
                            if (!can.ok) { alert(can.reason); return; }
                            if (window.confirm("Delete this split?")) doDelSplit(sp.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      );
                    })()}
                  </div>
                </CardContent>
                )}
              </Card>
            );
          })}

          {splits.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No splits yet. Create one to track shared expenses!</p>
              </CardContent>
            </Card>
          )}

          {visible.length === 0 && splits.length > 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Check className="h-12 w-12 text-accent mb-4" />
                <p className="text-muted-foreground">Everything settled!</p>
              </CardContent>
            </Card>
          )}
        </div>
        </section>
      </div>
    );
  };

  const LoansView = () => {
    const settledCount = loans.filter((l) => l.settled).length;
    const visible = hideSettled ? loans.filter((l) => !l.settled) : loans;

    return (
      <div className="flex flex-col gap-6 lg:gap-8">
        <div className="flex items-center justify-between gap-2">
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold">Loans</h1>
          </div>
          <Button size="sm" className="ml-auto hidden lg:inline-flex" onClick={() => openModal("addLoan", { direction: "lent", date: today() })}>
            <Plus className="h-4 w-4 mr-2" /> Record Loan
          </Button>
        </div>

        {/* OUTSTANDING */}
        <section className="flex flex-col gap-3 lg:gap-4">
          <SectionLabel>Outstanding</SectionLabel>
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-3 lg:p-4">
                <p className="text-[10px] lg:text-xs uppercase tracking-wider text-accent/80 font-semibold">To Collect</p>
                <p className="text-base lg:text-2xl font-bold text-accent font-mono leading-tight truncate">{PKR(loanCollect)}</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="p-3 lg:p-4">
                <p className="text-[10px] lg:text-xs uppercase tracking-wider text-destructive/80 font-semibold">To Pay</p>
                <p className="text-base lg:text-2xl font-bold text-destructive font-mono leading-tight truncate">{PKR(loanPay)}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* YOUR LOANS */}
        <section className="flex flex-col gap-3 lg:gap-4">
          <SectionLabel
            action={
              settledCount > 0 ? (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox id="hideSettledLoans" checked={hideSettled} onCheckedChange={(c) => setHideSettled(!!c)} />
                  <span>Hide settled ({settledCount})</span>
                </label>
              ) : undefined
            }
          >
            Your Loans
          </SectionLabel>

        <div className="space-y-2 lg:space-y-3">
          {visible.map((ln) => {
            const friend = friends.find((f) => f.id === ln.friendId);
            const isLent = ln.direction === "lent";

            return (
              <Card key={ln.id} className="group">
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <Avatar className="h-10 w-10 lg:h-12 lg:w-12 flex-shrink-0">
                      <AvatarFallback style={{ backgroundColor: friend?.color || "#888" }} className="text-white text-sm">
                        {inits(friend?.name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-semibold truncate">{friend?.name || "Unknown"}</p>
                        {ln.settled && <Badge className="bg-accent/20 text-accent text-[10px] py-0">Settled</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant={isLent ? "default" : "destructive"} className="text-[10px] py-0">
                          {isLent ? "Lent" : "Borrowed"}
                        </Badge>
                        <p className="text-xs text-muted-foreground truncate">{ln.date}{ln.desc ? ` · ${ln.desc}` : ""}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn("text-base lg:text-xl font-bold font-mono leading-tight", isLent ? "text-accent" : "text-destructive")}>
                        {PKR(ln.amount)}
                      </p>
                      {!ln.settled && (
                        <Button
                          size="sm"
                          variant={isLent ? "default" : "destructive"}
                          className="mt-1.5 text-xs h-7 px-2"
                          onClick={() => toggleLoanSettled(ln.id)}
                        >
                          {isLent ? "Receive" : "Pay"}
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editLoan(ln)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {(() => {
                        const can = loanCanDelete(ln);
                        return (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            disabled={!can.ok}
                            title={can.ok ? "Delete loan" : can.reason}
                            onClick={() => {
                              if (!can.ok) { alert(can.reason); return; }
                              if (window.confirm("Delete this loan?")) doDelLoan(ln.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {loans.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Banknote className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No loans recorded yet.</p>
              </CardContent>
            </Card>
          )}

          {visible.length === 0 && loans.length > 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Check className="h-12 w-12 text-accent mb-4" />
                <p className="text-muted-foreground">All loans settled!</p>
              </CardContent>
            </Card>
          )}
        </div>
        </section>
      </div>
    );
  };

  const FriendsView = () => {
    if (selFriend) {
      const f = friends.find((fr) => fr.id === selFriend);
      if (!f) return null;
      const debt = fDebts[f.id] || 0;
      const fSplits = splits.filter((sp) => sp.participants.some((p) => p.id === f.id));
      const fLoans = loans.filter((l) => l.friendId === f.id);
      const fPaid = transactions.filter(
        (t) => t.type === "expense" && t.paidBy === f.id && !t.splitId
      );

      return (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelFriend(null)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-14 w-14">
              <AvatarFallback style={{ backgroundColor: f.color }} className="text-white text-xl font-bold">
                {inits(f.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{f.name}</h1>
              <p className="text-sm text-muted-foreground">{f.phone || "No phone"}</p>
            </div>
          </div>

          <Card className={cn(
            "border-2",
            debt > 0 ? "border-accent/30 bg-accent/5" : debt < 0 ? "border-destructive/30 bg-destructive/5" : "border-border"
          )}>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {debt > 0 ? "Owes you" : debt < 0 ? "You owe" : "All settled"}
              </p>
              <p className={cn(
                "text-3xl font-bold font-mono",
                debt > 0 ? "text-accent" : debt < 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {debt !== 0 ? PKR(debt) : "Rs. 0"}
              </p>
            </CardContent>
          </Card>

          {/* Collapsible activity sections — only one open at a time */}
          {(fSplits.length > 0 || fLoans.length > 0 || fPaid.length > 0) ? (
            <div className="flex flex-col gap-2">
              {/* SHARED BILLS */}
              {fSplits.length > 0 && (
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFriendOpenSection(friendOpenSection === "splits" ? null : "splits")}
                    aria-expanded={friendOpenSection === "splits"}
                    className="w-full p-3 lg:p-4 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Shared Bills</p>
                      <p className="text-[11px] text-muted-foreground">{fSplits.length} bill{fSplits.length !== 1 ? "s" : ""}</p>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", friendOpenSection === "splits" && "rotate-180")} />
                  </button>
                  {friendOpenSection === "splits" && (
                    <div className="border-t border-border bg-secondary/20 p-2 lg:p-3 space-y-1.5">
                      {fSplits.slice(0, 10).map((sp) => {
                        // Determine which participant we'd be settling for this friend.
                        // - If user paid: settle the friend's share → toggleSettled(sp.id, f.id)
                        // - If friend paid: settle the user's share → toggleSettled(sp.id, "me")
                        const userPaid = sp.paidBy === "me";
                        const friendPaid = sp.paidBy === f.id;
                        const partId = userPaid ? f.id : friendPaid ? "me" : null;
                        const part = partId ? sp.participants.find((p) => p.id === partId) : null;
                        const canSettle = !!part && !part.settled && (userPaid || friendPaid);
                        const incoming = userPaid;
                        return (
                          <div key={sp.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-background">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs lg:text-sm truncate">{sp.title}</p>
                              <p className="text-[10px] text-muted-foreground">{sp.date}</p>
                            </div>
                            <p className="font-mono font-semibold text-xs lg:text-sm flex-shrink-0">
                              {PKR(part?.share || 0)}
                            </p>
                            {part?.settled ? (
                              <Badge className="bg-accent/20 text-accent text-[9px] px-1.5 py-0 flex-shrink-0">✓</Badge>
                            ) : canSettle ? (
                              <Button
                                size="sm"
                                variant={incoming ? "default" : "destructive"}
                                className="text-[10px] h-6 px-2 flex-shrink-0"
                                onClick={() => partId && toggleSettled(sp.id, partId)}
                              >
                                {incoming ? "Receive" : "Pay"}
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 flex-shrink-0">•</Badge>
                            )}
                          </div>
                        );
                      })}
                      {fSplits.length > 10 && (
                        <p className="text-[11px] text-center text-muted-foreground py-1">+{fSplits.length - 10} more</p>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {/* LOANS */}
              {fLoans.length > 0 && (
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFriendOpenSection(friendOpenSection === "loans" ? null : "loans")}
                    aria-expanded={friendOpenSection === "loans"}
                    className="w-full p-3 lg:p-4 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Loans</p>
                      <p className="text-[11px] text-muted-foreground">{fLoans.length} loan{fLoans.length !== 1 ? "s" : ""}</p>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", friendOpenSection === "loans" && "rotate-180")} />
                  </button>
                  {friendOpenSection === "loans" && (
                    <div className="border-t border-border bg-secondary/20 p-2 lg:p-3 space-y-1.5">
                      {fLoans.map((ln) => {
                        const incoming = ln.direction === "lent";
                        return (
                          <div key={ln.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-background">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Badge variant={incoming ? "default" : "destructive"} className="text-[9px] px-1.5 py-0">
                                  {incoming ? "Lent" : "Borrowed"}
                                </Badge>
                                {ln.settled && <Badge className="bg-accent/20 text-accent text-[9px] px-1.5 py-0">✓</Badge>}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{ln.date}{ln.desc ? ` · ${ln.desc}` : ""}</p>
                            </div>
                            <p className={cn("font-mono font-semibold text-xs lg:text-sm flex-shrink-0", incoming ? "text-accent" : "text-destructive")}>{PKR(ln.amount)}</p>
                            {!ln.settled && (
                              <Button
                                size="sm"
                                variant={incoming ? "default" : "destructive"}
                                className="text-[10px] h-6 px-2 flex-shrink-0"
                                onClick={() => toggleLoanSettled(ln.id)}
                              >
                                {incoming ? "Receive" : "Pay"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              )}

              {/* BILLS PAID FOR YOU */}
              {fPaid.length > 0 && (
                <Card className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFriendOpenSection(friendOpenSection === "paid" ? null : "paid")}
                    aria-expanded={friendOpenSection === "paid"}
                    className="w-full p-3 lg:p-4 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{f.name.split(" ")[0]} Paid For You</p>
                      <p className="text-[11px] text-muted-foreground">{fPaid.length} bill{fPaid.length !== 1 ? "s" : ""}</p>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", friendOpenSection === "paid" && "rotate-180")} />
                  </button>
                  {friendOpenSection === "paid" && (
                    <div className="border-t border-border bg-secondary/20 p-2 lg:p-3 space-y-1.5">
                      {fPaid.map((tx) => (
                        <div key={tx.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-background">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs lg:text-sm truncate">{tx.desc || tx.category}</p>
                            <p className="text-[10px] text-muted-foreground">{tx.date}</p>
                          </div>
                          <p className={cn("font-mono font-semibold text-xs lg:text-sm flex-shrink-0", tx.settled ? "text-accent" : "text-destructive")}>
                            {PKR(tx.amount)}
                          </p>
                          {tx.settled ? (
                            <Badge className="bg-accent/20 text-accent text-[9px] px-1.5 py-0 flex-shrink-0">✓</Badge>
                          ) : (
                            <Button size="sm" variant="destructive" className="text-[10px] h-6 px-2 flex-shrink-0" onClick={() => toggleTxSettled(tx.id)}>
                              Pay
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No shared activity with {f.name.split(" ")[0]} yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 lg:gap-8">
        <div className="flex items-center justify-between gap-2">
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold">Friends</h1>
            <p className="text-sm text-muted-foreground">Track shared expenses and splits</p>
          </div>
          <Button size="sm" className="ml-auto lg:size-default" onClick={() => openModal("addFriend")}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Friend
          </Button>
        </div>

        {/* OVERVIEW */}
        <section className="flex flex-col gap-3 lg:gap-4">
          <SectionLabel>Overview</SectionLabel>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <Card>
              <CardContent className="p-3 lg:p-4">
                <p className="text-[10px] lg:text-xs uppercase tracking-wider text-muted-foreground font-semibold">Friends</p>
                <p className="text-base lg:text-2xl font-bold leading-tight">{friends.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-3 lg:p-4">
                <p className="text-[10px] lg:text-xs uppercase tracking-wider text-accent/80 font-semibold">Owe You</p>
                <p className="text-base lg:text-2xl font-bold text-accent font-mono leading-tight truncate">{PKR(owedToMe)}</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="p-3 lg:p-4">
                <p className="text-[10px] lg:text-xs uppercase tracking-wider text-destructive/80 font-semibold">You Owe</p>
                <p className="text-base lg:text-2xl font-bold text-destructive font-mono leading-tight truncate">{PKR(iOwe)}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* YOUR FRIENDS */}
        <section className="flex flex-col gap-3 lg:gap-4">
          <SectionLabel>Your Friends</SectionLabel>

        <div className="space-y-2 lg:space-y-3">
          {friends.map((f) => {
            const debt = fDebts[f.id] || 0;
            const fCount = splits.filter((sp) => sp.participants.some((p) => p.id === f.id)).length;

            return (
              <Card key={f.id} className="group cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setSelFriend(f.id)}>
                <CardContent className="p-3 lg:p-4">
                  <div className="flex items-center gap-3 lg:gap-4">
                    <Avatar className="h-10 w-10 lg:h-12 lg:w-12 flex-shrink-0">
                      <AvatarFallback style={{ backgroundColor: f.color }} className="text-white font-bold text-sm">
                        {inits(f.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{f.name}</p>
                      <p className="text-xs lg:text-sm text-muted-foreground truncate">
                        {f.phone ? `${f.phone} · ` : ""}{fCount} bill{fCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {debt !== 0 ? (
                        <>
                          <p className="text-[10px] lg:text-xs text-muted-foreground">{debt > 0 ? "Owes you" : "You owe"}</p>
                          <p className={cn("font-mono font-semibold text-sm lg:text-base", debt > 0 ? "text-accent" : "text-destructive")}>
                            {PKR(debt)}
                          </p>
                        </>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] lg:text-xs">Settled</Badge>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); editFriend(f); }}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {(() => {
                        const can = friendCanDelete(f.id, fDebts);
                        return (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            disabled={!can.ok}
                            title={can.ok ? "Remove friend" : can.reason}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!can.ok) { alert(can.reason); return; }
                              if (window.confirm(`Remove ${f.name}?`)) doDelFriend(f.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {friends.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Add friends to track shared expenses and splits.</p>
              </CardContent>
            </Card>
          )}
        </div>
        </section>
      </div>
    );
  };

  const SettingsView = () => {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [lastBackup, setLastBackup] = useState<number | null>(null);
    const [exportMonth, setExportMonth] = useState<string>(month);
    useEffect(() => setMounted(true), []);
    const current = mounted ? (theme === "system" ? "system" : resolvedTheme || theme || "dark") : "dark";

    useEffect(() => {
      if (!user) return;
      dbGet(dbRef(rtdb, `users/${user.uid}/backups`))
        .then((snap) => {
          const all = snap.val() as Record<string, { at?: number }> | null;
          if (!all) return;
          const latest = Object.values(all).reduce((m, b) => Math.max(m, b?.at || 0), 0);
          if (latest) setLastBackup(latest);
        })
        .catch(() => {});
    }, []);

    const backupNow = async () => {
      if (!user) return;
      setBackingUp(true);
      try {
        const now = Date.now();
        const key = new Date(now).toISOString().replace(/[:.]/g, "-");
        const clean = stripUndefined(data);
        await Promise.all([
          dbSet(dbRef(rtdb, `users/${user.uid}/data`), clean),
          dbSet(dbRef(rtdb, `users/${user.uid}/backups/${key}`), { at: now, data: clean }),
        ]);
        setLastBackup(now);
        alert("Backup saved to Firebase.");
      } catch (e: any) {
        alert("Backup failed: " + (e?.message || "unknown error"));
      } finally {
        setBackingUp(false);
      }
    };

    const exportMonths = (() => {
      const set = new Set<string>();
      transactions.forEach((t) => {
        const m = (t.date || "").slice(0, 7);
        if (m) set.add(m);
      });
      set.add(mStr());
      return Array.from(set).sort().reverse();
    })();

    const exportMonthCSV = () => {
      const txs = transactions
        .filter((t) => (t.date || "").slice(0, 7) === exportMonth)
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      if (!txs.length) {
        alert(`No transactions for ${mLabel(exportMonth)}.`);
        return;
      }
      const headers = [
        "Date",
        "Type",
        "Category",
        "Description",
        "Account",
        "Paid By",
        "Amount (Rs.)",
        "Settled",
      ];
      const esc = (v: unknown) => {
        const s = String(v ?? "");
        return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const rows = txs.map((t) => [
        t.date,
        t.type,
        t.category,
        t.desc || "",
        accounts.find((a) => a.id === t.accountId)?.name || "",
        !t.paidBy || t.paidBy === "me"
          ? "You"
          : friends.find((f) => f.id === t.paidBy)?.name || "?",
        t.amount,
        t.settled === undefined ? "" : t.settled ? "Yes" : "No",
      ]);
      const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rupiyaa-transactions-${exportMonth}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const wipeData = () => {
      if (!window.confirm("Delete ALL your data from the cloud? This cannot be undone.")) return;
      if (!window.confirm("Really sure? Your accounts, transactions, splits, loans and friends will all be erased.")) return;
      setData({ accounts: [], transactions: [], friends: [], splits: [], loans: [] });
    };

    const themes: { id: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
      { id: "light", label: "Light", icon: Sun },
      { id: "dark", label: "Dark", icon: Moon },
      { id: "system", label: "System", icon: Monitor },
    ];

    const lastBackupLabel = lastBackup
      ? new Date(lastBackup).toLocaleString("en-PK", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return (
      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile, appearance, and data</p>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Your sign-in identity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary grid place-items-center text-xl font-bold flex-shrink-0">
                {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user?.displayName || "Rupiyaa user"}</p>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {sync === "saving" ? "Saving changes…" : sync === "synced" ? "All changes synced" : sync === "loading" ? "Loading from cloud…" : sync === "offline" ? "Offline — saved locally" : "Local only"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Choose how Rupiyaa looks on this device</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => {
                const Icon = t.icon;
                const active = (theme || "system") === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-colors",
                      active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
            {mounted && (
              <p className="text-xs text-muted-foreground mt-3">
                Currently using <span className="font-medium text-foreground capitalize">{current}</span> mode.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backup</CardTitle>
            <CardDescription>
              Save a timestamped snapshot of your data to Firebase. Your data also auto-syncs as you make changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={backupNow} disabled={backingUp} className="w-full justify-start h-auto py-3">
              {backingUp ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4 mr-2" />
              )}
              <div className="text-left">
                <div className="font-medium">{backingUp ? "Backing up…" : "Backup to cloud"}</div>
                <div className="text-xs opacity-80">
                  {lastBackupLabel ? `Last backup: ${lastBackupLabel}` : "No backup taken yet"}
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Export transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export transactions</CardTitle>
            <CardDescription>Download a single month as a CSV (opens in Excel, Google Sheets, etc.)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={exportMonth} onValueChange={(v) => setExportMonth(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {exportMonths.map((m) => (
                    <SelectItem key={m} value={m}>{mLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportMonthCSV} className="w-full justify-start h-auto py-3">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="font-medium">Download CSV</div>
                <div className="text-xs text-muted-foreground">{mLabel(exportMonth)}</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={wipeData} className="w-full justify-start h-auto py-3 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              <div className="text-left">
                <div className="font-medium">Erase all data</div>
                <div className="text-xs text-muted-foreground">Permanently delete everything from the cloud</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Manage your session</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => logout()} className="w-full justify-start">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" /> About
            </CardTitle>
            <CardDescription>Rupiyaa — Personal finance manager</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Version 0.1.0</p>
            <p>Data syncs to your Firebase account automatically.</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  const renderView = () => {
    switch (view) {
      case "dashboard": return <DashboardView />;
      case "accounts": return <AccountsView />;
      case "history": return <HistoryView />;
      case "splits": return <SplitsView />;
      case "loans": return <LoansView />;
      case "friends": return <FriendsView />;
      case "settings": return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
        <img src="/logo.png" alt="Rupiyaa" className="w-10 h-10 rounded-xl object-cover" />
        <div className="leading-tight">
          <h1 className="text-xl font-bold text-primary">Rupiyaa</h1>
          <p className="text-xs text-muted-foreground">Personal Finance</p>
        </div>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto min-h-0">
        <ul className="space-y-1">
          {NAV.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => switchView(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  view === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <Button className="w-full" onClick={() => openModal("addTx", { txType: "expense", date: today(), paidBy: "me" })}>
          <Plus className="h-4 w-4 mr-2" /> Add Transaction
        </Button>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-semibold">
            {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.displayName || user?.email || "Signed in"}</p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {sync === "saving" ? "Saving…" : sync === "synced" ? "Synced" : sync === "loading" ? "Loading…" : sync === "offline" ? "Offline" : "Local"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => logout()} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Skeleton top app bar */}
        <div
          className="lg:hidden fixed top-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-b border-border"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="h-14 px-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-secondary/60 animate-pulse" />
            <div className="w-9 h-9 rounded-xl bg-secondary/60 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 bg-secondary/60 rounded animate-pulse" />
              <div className="h-2.5 w-16 bg-secondary/40 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Skeleton content */}
        <main className="max-w-6xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-24 lg:px-8 lg:pt-8 space-y-4 lg:space-y-6">
          {/* Hero skeleton */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 h-32 animate-pulse" />
          {/* 3 stat cards skeleton */}
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-24 animate-pulse" />
            ))}
          </div>
          {/* Monthly summary skeleton */}
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card h-20 animate-pulse" />
            ))}
          </div>
          {/* List skeleton */}
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-full bg-secondary/60 animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-1/2 bg-secondary/60 rounded animate-pulse" />
                  <div className="h-2.5 w-1/3 bg-secondary/40 rounded animate-pulse" />
                </div>
                <div className="h-3.5 w-16 bg-secondary/60 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </main>

        {/* Skeleton bottom nav */}
        <div
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-5 h-16 px-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-1">
                <div className="h-7 w-7 rounded-full bg-secondary/40 animate-pulse" />
                <div className="h-2 w-10 bg-secondary/40 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Centered loader hint */}
        <div className="fixed inset-0 grid place-items-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 px-5 py-4 rounded-2xl bg-background/85 backdrop-blur border border-border shadow-xl">
            <div className="relative">
              <span aria-hidden="true" className="anim-logo-orbit absolute inset-0 -m-2 rounded-2xl border-2 border-primary/30 border-t-primary" />
              <img src="/logo.png" alt="Rupiyaa" className="anim-logo-loader w-12 h-12 rounded-xl object-cover relative" />
            </div>
            <span className="text-xs text-muted-foreground">Loading your data…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar — locked to viewport, never scrolls with content */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen self-start flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Top App Bar */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-b border-border"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-14 px-3 flex items-center gap-3">
          <img src="/logo.png" alt="Rupiyaa" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0 leading-tight">
            <h1 className="text-lg font-bold text-primary leading-tight">Rupiyaa</h1>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
              {viewTitle(view)}
              {sync === "saving" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
              {sync === "synced" && <Check className="h-2.5 w-2.5 text-accent" />}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 -mr-1"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto lg:p-8">
        <div className="max-w-6xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+4.5rem)] pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:px-0 lg:pt-0 lg:pb-0">
          <div key={view} className="anim-view-enter">
            {renderView()}
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {/* Add Account Modal */}
      <Dialog open={modal === "addAccount"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Account" : "Add Account"}</DialogTitle>
            <DialogDescription>Add a new account to track your finances</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input placeholder="e.g. HBL Savings" value={form.name || ""} onChange={(e) => setF("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={form.aType || "Bank"} onValueChange={(v) => setF("aType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Wallet">Wallet</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Balance (Rs.)</Label>
              <Input type="number" placeholder="0" value={form.balance || ""} onChange={(e) => setF("balance", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={doAddAccount}>{form.id ? "Update" : "Add Account"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Modal */}
      <Dialog open={modal === "addTx"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
            <DialogDescription>Record an income or expense against one of your accounts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!form.id && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "expense", l: "Expense", icon: "↓", c: "destructive" as const },
                  { v: "income", l: "Income", icon: "↑", c: "default" as const },
                ].map((o) => (
                  <Button
                    key={o.v}
                    variant={(form.txType || "expense") === o.v ? o.c : "outline"}
                    className="h-auto py-3"
                    onClick={() => setF("txType", o.v)}
                  >
                    <span className="mr-2">{o.icon}</span> {o.l}
                  </Button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Amount (Rs.)</Label>
              <Input type="number" placeholder="0" value={form.amount || ""} onChange={(e) => setF("amount", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category || ""} onValueChange={(v) => setF("category", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {((form.txType || "expense") === "income" ? INC_CATS : EXP_CATS).map((c) => (
                    <SelectItem key={c} value={c}>{CAT_ICONS[c]} {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={form.accountId || ""} onValueChange={(v) => setF("accountId", v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} — {PKR(a.balance)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(form.txType || "expense") === "expense" && (
              <div className="space-y-2">
                <Label>Paid By</Label>
                <Select value={form.paidBy || "me"} onValueChange={(v) => setF("paidBy", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">You paid</SelectItem>
                    {friends.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name} paid</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="What was this for?" value={form.desc || ""} onChange={(e) => setF("desc", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date || today()} onChange={(e) => setF("date", e.target.value)} />
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            {form.id ? (
              (() => {
                const tx = transactions.find((t) => t.id === form.id);
                const can = tx ? txCanDelete(tx, splits) : { ok: false, reason: "Not found" };
                return (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
                    disabled={!can.ok}
                    title={can.ok ? "Delete" : can.reason}
                    onClick={() => {
                      if (!can.ok) { alert(can.reason); return; }
                      if (!window.confirm("Delete this transaction?")) return;
                      doDelTx(form.id);
                      closeModal();
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                );
              })()
            ) : <span className="hidden sm:block" />}
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={doAddTx}>{form.id ? "Update" : "Save"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Friend Modal */}
      <Dialog open={modal === "addFriend"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Friend" : "Add Friend"}</DialogTitle>
            <DialogDescription>Save a contact to split bills and track loans with them</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="e.g. Ahmed Khan" value={form.name || ""} onChange={(e) => setF("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone (optional)</Label>
              <Input placeholder="0300-0000000" value={form.phone || ""} onChange={(e) => setF("phone", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={doAddFriend}>{form.id ? "Update" : "Add Friend"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Split Modal */}
      <Dialog open={modal === "addSplit"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Bill Split" : "New Bill Split"}</DialogTitle>
            <DialogDescription>Split a bill across people equally, by percentage, by custom amounts, or by shares</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g. Dinner at BBQ Tonight" value={form.title || ""} onChange={(e) => setF("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Total Amount (Rs.)</Label>
              <Input type="number" placeholder="0" value={form.total || ""} onChange={(e) => setF("total", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date || today()} onChange={(e) => setF("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Paid By</Label>
              <Select value={form.paidBy || "me"} onValueChange={(v) => { setF("paidBy", v); if (!sParts.includes(v)) setSParts([...sParts, v]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">You</SelectItem>
                  {friends.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={form.accountId || ""} onValueChange={(v) => setF("accountId", v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Participants</Label>
              <div className="flex flex-wrap gap-2">
                {[{ id: "me", name: "You" }, ...friends].map((p) => {
                  const selected = sParts.includes(p.id);
                  return (
                    <Button
                      key={p.id}
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (selected) setSParts(sParts.filter((x) => x !== p.id));
                        else setSParts([...sParts, p.id]);
                      }}
                    >
                      {p.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Split Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {SPLIT_TYPES.map((st) => (
                  <Button
                    key={st.id}
                    variant={sType === st.id ? "default" : "outline"}
                    size="sm"
                    className="h-auto py-2"
                    onClick={() => setSType(st.id)}
                  >
                    {st.icon} {st.label}
                  </Button>
                ))}
              </div>
            </div>

            {sParts.length >= 2 && (
              <div className="space-y-2 bg-secondary/50 rounded-lg p-4">
                <Label className="text-xs uppercase text-muted-foreground">Split Preview</Label>
                {sParts.map((id) => {
                  const share = getShares(+(form.total || 0))[id] || 0;
                  return (
                    <div key={id} className="flex items-center justify-between py-1">
                      <span className="text-sm">{gName(id)}</span>
                      <span className="font-mono text-sm">{PKR(share)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {sParts.length < 2 && (
              <p className="text-sm text-destructive">Select at least 2 people to create a split.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={doAddSplit} disabled={sParts.length < 2}>{form.id ? "Update Split" : "Create Split"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Loan Modal */}
      <Dialog open={modal === "addLoan"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Loan" : "Record a Loan"}</DialogTitle>
            <DialogDescription>Track money you lent to or borrowed from a friend</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "lent", l: "I Lent", c: "default" as const },
                { v: "borrowed", l: "I Borrowed", c: "destructive" as const },
              ].map((o) => (
                <Button
                  key={o.v}
                  variant={(form.direction || "lent") === o.v ? o.c : "outline"}
                  onClick={() => setF("direction", o.v)}
                >
                  {o.l}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label>{(form.direction || "lent") === "lent" ? "Lent To" : "Borrowed From"}</Label>
              <Select value={form.friendId || ""} onValueChange={(v) => setF("friendId", v)}>
                <SelectTrigger><SelectValue placeholder="Select friend" /></SelectTrigger>
                <SelectContent>
                  {friends.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {friends.length === 0 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Add a friend first
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Amount (Rs.)</Label>
              <Input type="number" placeholder="0" value={form.amount || ""} onChange={(e) => setF("amount", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={form.accountId || ""} onValueChange={(v) => setF("accountId", v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} — {PKR(a.balance)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input placeholder="What was it for?" value={form.desc || ""} onChange={(e) => setF("desc", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date || today()} onChange={(e) => setF("date", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={() => doAddLoan()}>{form.id ? "Update Loan" : "Save Loan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settle Action Modal */}
      <Dialog open={modal === "settleAction"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.incoming ? "Receive Payment" : "Make Payment"}</DialogTitle>
            <DialogDescription>Settle this balance and record the matching account transaction</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card className={cn(
              "border-2",
              form.incoming ? "border-accent/30 bg-accent/5" : "border-destructive/30 bg-destructive/5"
            )}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {form.incoming ? `${form.friendName} pays you back` : `You repay ${form.friendName}`}
                </p>
                <p className={cn(
                  "text-2xl font-bold font-mono mt-1",
                  form.incoming ? "text-accent" : "text-destructive"
                )}>
                  {form.incoming ? "+" : "-"}{PKR(+form.amount || 0)}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label>{form.incoming ? "Deposit Into" : "Pay From"}</Label>
              <Select value={form.accountId || ""} onValueChange={(v) => setF("accountId", v)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} — {PKR(a.balance)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              A &quot;{form.incoming ? "Repayment from" : "Repayment to"} {form.friendName}&quot; transaction will be recorded.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              onClick={() => {
                if (!form.accountId) return;
                if (form.kind === "loan") toggleLoanSettled(form.id, form.accountId);
                else if (form.kind === "tx") toggleTxSettled(form.id, form.accountId);
                else if (form.kind === "split") toggleSettled(form.splitId, form.partId, form.accountId);
                closeModal();
              }}
            >
              {form.incoming ? "Confirm Receipt" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile FAB */}
      {!fabHidden && (
        <button
          type="button"
          onClick={fabAction}
          aria-label="Add"
          className="anim-pulse lg:hidden fixed right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center hover:shadow-[0_14px_36px_-8px_rgba(233,168,37,0.7),0_6px_16px_-6px_rgba(0,0,0,0.5)] active:scale-90 transition-transform duration-200"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      )}

      {/* Mobile Side Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[85vw] max-w-xs p-0 bg-sidebar border-sidebar-border flex flex-col"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>All sections of the app</SheetDescription>
          </SheetHeader>

          {/* Drawer header */}
          <div className="p-5 border-b border-sidebar-border flex items-center gap-3">
            <img src="/logo.png" alt="Rupiyaa" className="w-12 h-12 rounded-2xl object-cover" />
            <div className="leading-tight">
              <h2 className="text-xl font-bold text-primary">Rupiyaa</h2>
              <p className="text-xs text-muted-foreground">Personal Finance</p>
            </div>
          </div>

          {/* Drawer nav links */}
          <nav className="flex-1 overflow-y-auto p-3 min-h-0">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => switchView(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Drawer profile + sign-out — anchored to the bottom */}
          <div className="border-t border-sidebar-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary grid place-items-center text-sm font-semibold flex-shrink-0">
                {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.displayName || "Rupiyaa user"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  {sync === "saving" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                  {sync === "synced" && <Check className="h-2.5 w-2.5 text-accent" />}
                  <span className="truncate">
                    {sync === "saving" ? "Saving…" : sync === "synced" ? "Synced" : sync === "loading" ? "Loading…" : sync === "offline" ? "Offline" : "Local"}
                  </span>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                setDrawerOpen(false);
                logout();
              }}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
