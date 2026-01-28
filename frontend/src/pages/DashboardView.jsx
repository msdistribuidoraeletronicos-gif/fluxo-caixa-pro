import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  LayoutDashboard,
  Wallet,
  Download,
  Target,
  Building2,
  LogOut,
  TrendingUp,
  AlertTriangle,
  Flame,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Receipt,
  UserCircle,
  BarChart3,
  ShoppingBag
} from "lucide-react";

// -----------------------------
// Utils & Helpers
// -----------------------------
const cx = (...classes) => classes.filter(Boolean).join(" ");

const toISODateLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseISOToLocalDate = (iso) => {
  const [y, m, d] = String(iso).split("-").map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
};

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toISODateLocal(d);
};

const addDaysISO = (iso, days) => {
  const d = parseISOToLocalDate(iso);
  d.setDate(d.getDate() + days);
  return toISODateLocal(d);
};

const formatBRL = (value) =>
  (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseNumber = (v) => {
  const s = String(v ?? "")
    .replace(/[^0-9.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

const downloadTextFile = (filename, content, mime = "text/plain") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// -----------------------------
// Domain Constants
// -----------------------------
const ENTRY_TYPES = [
  { key: "sale_cash", label: "Vendas à vista" },
  { key: "sale_installments", label: "Vendas parceladas" },
  { key: "pix", label: "Pix" },
  { key: "card", label: "Cartão" },
  { key: "cash", label: "Dinheiro" },
  { key: "boleto", label: "Boleto" },
  { key: "service", label: "Serviços" },
  { key: "other_income", label: "Outros" },
];

const EXIT_CATEGORIES = [
  { key: "fixed", label: "Custos fixos" },
  { key: "variable", label: "Custos variáveis" },
  { key: "taxes", label: "Impostos" },
  { key: "prolabore", label: "Pró-labore / Retiradas" },
  { key: "investments", label: "Investimentos" },
  { key: "other_expense", label: "Outros" },
];

const CATEGORY_ALL = [
  ...ENTRY_TYPES.map((x) => ({ ...x, kind: "in" })),
  ...EXIT_CATEGORIES.map((x) => ({ ...x, kind: "out" })),
];

const kindLabel = (kind) => (kind === "in" ? "Entrada" : "Saída");
const STORAGE_KEY = "cashflow_saas_psy_v4_pos_fixed";

// -----------------------------
// Data Logic
// -----------------------------
const seedData = () => {
  const start = todayISO();
  return {
    auth: { isAuthed: false, user: null },
    company: {
      name: "Minha Empresa",
      cnpj: "",
      sector: "",
      city: "",
      startBalance: 1000,
    },
    transactions: [],
    goal: { value: 0, period: "1", dailySalesTarget: 5, startDate: null },
    products: [],
    sales: [],
    achievements: { badges: [], streak: 0, lastLogin: start, level: 1, xp: 0 },
  };
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedData();
    return JSON.parse(raw);
  } catch {
    return seedData();
  }
};

const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const computeRunningBalance = (txSorted, startBalance) => {
  let bal = startBalance || 0;
  return txSorted.map((t) => {
    bal += t.kind === "in" ? t.amount : -t.amount;
    return { ...t, runningBalance: bal };
  });
};

const labelForCategory = (key) =>
  CATEGORY_ALL.find((c) => c.key === key)?.label || key;

const toCSV = (rows) => {
  const headers = [
    "Data",
    "Descrição",
    "Categoria",
    "Tipo",
    "Entrada",
    "Saída",
    "Saldo",
    "Método",
  ];
  const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.date,
        r.description,
        labelForCategory(r.category),
        kindLabel(r.kind),
        r.kind === "in" ? r.amount : "",
        r.kind === "out" ? r.amount : "",
        r.runningBalance !== undefined ? r.runningBalance : "",
        r.method ?? "",
      ]
        .map(esc)
        .join(",")
    );
  }
  return lines.join("\n");
};

// -----------------------------
// UI Components (Base)
// -----------------------------
function PrimaryButton({
  children,
  onClick,
  icon: Icon,
  className,
  disabled,
  tone = "brand",
  type = "button",
}) {
  const tones = {
    brand: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30",
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
        tones[tone] || tones.brand,
        className
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </motion.button>
  );
}

function SoftButton({ children, onClick, icon: Icon, className, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
        className
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function Card({ children, className, highlight }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-zinc-950",
        highlight
          ? "border-blue-200 ring-4 ring-blue-50 dark:border-blue-900 dark:ring-blue-900/20"
          : "border-zinc-200 dark:border-zinc-800",
        className
      )}
    >
      {children}
    </div>
  );
}

function Badge({ children, tone = "neutral", size = "sm" }) {
  const tones = {
    neutral:
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    success:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    danger:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    warning:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    brand: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };
  const sizes = { sm: "text-xs px-2 py-0.5", md: "text-sm px-2.5 py-1" };

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        tones[tone] || tones.neutral,
        sizes[size] || sizes.sm
      )}
    >
      {children}
    </span>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  right,
  onKeyDown,
  id,
  autoFocus,
}) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          {label}
        </div>
      )}
      <div className="relative group">
        <input
          id={id}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
        />
        {right && (
          <div className="absolute inset-y-0 right-3 flex items-center text-zinc-400">
            {right}
          </div>
        )}
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          {label}
        </div>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
      </div>
    </label>
  );
}

function ProgressBar({ value, max = 100, color = "blue" }) {
  const p = Math.min(100, Math.max(0, (value / max) * 100));
  const colors = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${p}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cx("h-full rounded-full", colors[color] || colors.blue)}
      />
    </div>
  );
}

const LevelWidget = ({ level, xp, streak }) => {
  const xpNeeded = level * 100;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-2 pr-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 font-bold text-white shadow-sm">
        {level}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-zinc-900 dark:text-zinc-100">
            Gestor Aprendiz
          </span>
          <span className="text-zinc-500">
            {xp}/{xpNeeded} XP
          </span>
        </div>
        <div className="mt-1">
          <ProgressBar value={xp} max={xpNeeded} color="amber" />
        </div>
      </div>
      <div className="hidden items-center gap-1 border-l border-zinc-100 pl-3 text-orange-500 sm:flex dark:border-zinc-800">
        <Flame className="h-4 w-4 fill-orange-500" />
        <span className="text-sm font-bold">{streak}</span>
      </div>
    </div>
  );
};

const SmartNudge = ({ type, title, subtitle, action, onAction }) => {
  const styles = {
    danger:
      "border-rose-100 bg-rose-50 text-rose-900 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-200",
    opportunity:
      "border-blue-100 bg-blue-50 text-blue-900 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-200",
    habit:
      "border-emerald-100 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx(
        "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
        styles[type]
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cx(
            "rounded-full p-2",
            type === "danger"
              ? "bg-rose-200/50"
              : type === "habit"
              ? "bg-emerald-200/50"
              : "bg-blue-200/50"
          )}
        >
          {type === "danger" ? (
            <AlertTriangle className="h-5 w-5" />
          ) : type === "habit" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Target className="h-5 w-5" />
          )}
        </div>
        <div>
          <div className="font-bold">{title}</div>
          <div className="text-sm opacity-90">{subtitle}</div>
        </div>
      </div>

      {action && (
        <button
          onClick={onAction}
          className="group flex items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95 dark:bg-black dark:text-white"
        >
          {action}{" "}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </button>
      )}
    </motion.div>
  );
};

const applyXp = (ach, add) => {
  let xp = (ach.xp || 0) + add;
  let level = ach.level || 1;
  while (xp >= level * 100) {
    xp -= level * 100;
    level += 1;
  }
  return { ...ach, xp, level };
};

const checkGamification = (state) => {
  let { xp, level, streak, lastLogin } = state.achievements;
  const today = todayISO();

  if (lastLogin !== today) {
    const yesterday = addDaysISO(today, -1);
    if (lastLogin === yesterday) streak += 1;
    else streak = 1;
  }

  const xpNeeded = level * 100;
  if (xp >= xpNeeded) {
    level += 1;
    xp = xp - xpNeeded;
  }

  return { ...state.achievements, streak, level, xp, lastLogin: today };
};

// -----------------------------
// COMPONENTS INSERTED (Header & Missing Placeholders)
// -----------------------------

// ✅ RENOMEADO DE "Header" PARA "DashboardHeader"
function DashboardHeader({ user, achievements, dark, setDark, onLogout }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Painel de Caixa
        </div>
        <div className="text-2xl font-extrabold">
          Olá, {user?.name || "Usuário"}
        </div>
        <div className="mt-1 text-sm text-zinc-500">
          Empresa: {user?.companyName || "Minha Empresa"} • Nível {achievements?.level || 1}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setDark(!dark)}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          {dark ? "Modo claro" : "Modo escuro"}
        </button>

        <button
          onClick={onLogout}
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/50"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

// -- Placeholders para componentes que faltavam no contexto anterior mas são usados no App --
function AuthScreen({ onLogin }) {
  const [name, setName] = useState("");
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-xl font-bold">Bem-vindo</h1>
        <p className="mb-6 text-sm text-zinc-500">Digite seu nome para entrar</p>
        <Input placeholder="Seu nome" value={name} onChange={setName} />
        <div className="mt-4">
            <PrimaryButton onClick={() => onLogin({ name, companyName: "Minha Empresa" })} disabled={!name}>Entrar</PrimaryButton>
        </div>
      </Card>
    </div>
  );
}

function Navigation({ route, setRoute }) {
  const navs = [
    { id: "dashboard", icon: LayoutDashboard, label: "Visão" },
    { id: "transactions", icon: Wallet, label: "Caixa" },
    { id: "sales", icon: ShoppingBag, label: "Vendas" },
    { id: "products", icon: Receipt, label: "Produtos" },
    { id: "reports", icon: BarChart3, label: "Relat." },
    { id: "goal", icon: Target, label: "Metas" },
    { id: "profile", icon: Building2, label: "Perfil" },
  ];
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 pb-1 dark:border-zinc-800 no-scrollbar">
      {navs.map(n => (
        <button
            key={n.id}
            onClick={() => setRoute(n.id)}
            className={cx(
                "flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                route === n.id 
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" 
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            )}
        >
            <n.icon className="h-5 w-5" />
            {n.label}
        </button>
      ))}
    </div>
  );
}

function DashboardView({ balance, txSorted, onAction }) {
  return (
    <div className="grid gap-6">
        <Card highlight>
            <div className="text-sm text-zinc-500">Saldo Atual</div>
            <div className={cx("text-4xl font-extrabold mt-2", balance >= 0 ? "text-blue-600" : "text-rose-600")}>
                {formatBRL(balance)}
            </div>
            <div className="mt-4 flex gap-2">
                <PrimaryButton onClick={() => onAction("transactions")}>Novo Lançamento</PrimaryButton>
                <SoftButton onClick={() => onAction("pos")}>Abrir PDV</SoftButton>
            </div>
        </Card>
    </div>
  )
}

function ReportsView() {
    return <Card><div className="text-center py-10 text-zinc-500">Relatórios em desenvolvimento</div></Card>;
}

function ProductsView({ products, onUpdate }) {
    // Placeholder simples para produtos caso não tenha o arquivo externo
    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">Produtos</h2>
                <Badge>{products?.length || 0} itens</Badge>
            </div>
            <div className="text-sm text-zinc-500">Gerenciamento de produtos aqui.</div>
        </Card>
    )
}

// -----------------------------
// MAIN COMPONENT
// -----------------------------
export default function App() {
  const [state, setState] = useState(() => loadState());
  const [route, setRoute] = useState("auth");
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState(null);
  const [posModal, setPosModal] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const authed = state.auth.isAuthed;

  const txSorted = useMemo(() => {
    const sorted = [...state.transactions].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    return computeRunningBalance(sorted, state.company.startBalance);
  }, [state.transactions, state.company.startBalance]);

  const balance =
    txSorted.slice(-1)[0]?.runningBalance ?? state.company.startBalance ?? 0;

  const currentNudge = useMemo(() => {
    if (balance < 0)
      return {
        type: "danger",
        title: "Alerta de Caixa Negativo",
        subtitle: "Saldo vermelho. Priorize receber.",
        action: "Ver Projeção",
        route: "projection",
      };

    const today = todayISO();
    if (!state.transactions.some((t) => t.date === today))
      return {
        type: "habit",
        title: "Mantenha a ofensiva!",
        subtitle: "Registre algo hoje para ganhar XP.",
        action: "Registrar",
        route: "transactions",
      };

    return {
      type: "opportunity",
      title: "Caixa Saudável",
      subtitle: "Bom momento para analisar custos.",
      action: "Relatórios",
      route: "reports",
    };
  }, [balance, state.transactions]);

  const notify = (title, desc, tone = "success") =>
    setToast({ title, desc, tone });

  const handleLogin = (user) => {
    setState((s) => ({
      ...s,
      auth: { isAuthed: true, user },
      company: { ...s.company, name: user.companyName || "Minha Empresa" },
      achievements: checkGamification(s),
    }));
    setRoute("dashboard");
    notify("Bem-vindo!", "Vamos colocar as finanças em ordem.", "brand");
  };

  const handleLogout = () => {
    setState((s) => ({ ...s, auth: { ...s.auth, isAuthed: false } }));
    setRoute("auth");
  };

  useEffect(() => {
    if (authed && route === "auth") setRoute("dashboard");
  }, [authed, route]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 transition-colors dark:bg-black dark:text-zinc-100">
      {/* Toast Integration */}
      <AnimatePresence>
        <ToastContainer toast={toast} onClose={() => setToast(null)} />
      </AnimatePresence>

      {!authed ? (
        <AuthScreen onLogin={handleLogin} />
      ) : (
        <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
          {/* ✅ HEADER USADO COM O NOVO NOME */}
          <DashboardHeader
            user={state.auth.user}
            achievements={state.achievements}
            dark={dark}
            setDark={setDark}
            onLogout={handleLogout}
          />

          <div className="mt-6">
            <SmartNudge
              {...currentNudge}
              onAction={() => setRoute(currentNudge.route)}
            />
          </div>

          {route === "pos" ? (
            <POSNavigation active={posModal} onOpen={setPosModal} />
          ) : (
            <Navigation route={route} setRoute={setRoute} />
          )}

          <main className="mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={route}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {route === "dashboard" && (
                  <DashboardView
                    balance={balance}
                    txSorted={txSorted}
                    onAction={setRoute}
                  />
                )}

                {route === "transactions" && (
                  <TransactionsView
                    tx={state.transactions}
                    onUpdate={(tx) => {
                      setState((s) => ({
                        ...s,
                        transactions: tx,
                        achievements: applyXp(s.achievements, 10),
                      }));
                      notify(
                        "Caixa Atualizado",
                        "Mais clareza para sua gestão! (+10 XP)",
                        "success"
                      );
                    }}
                  />
                )}

                {route === "products" && (
                  <ProductsView
                    products={state.products}
                    onUpdate={(next) => {
                      setState((s) => ({
                        ...s,
                        products:
                          typeof next === "function"
                            ? next(s.products || [])
                            : next,
                      }));
                    }}
                  />
                )}

                {route === "reports" && (
                  <ReportsView
                    tx={state.transactions}
                    txSorted={txSorted}
                    sales={state.sales}
                    products={state.products}
                  />
                )}

                {route === "goal" && (
                  <GoalView
                    tx={state.transactions}
                    state={state}
                    setState={setState}
                  />
                )}

                {route === "sales" && (
                  <SalesView sales={state.sales} onStart={() => setRoute("pos")} />
                )}

                {route === "pos" && (
                  <POSView
                    products={state.products}
                    posModal={posModal}
                    setPosModal={setPosModal}
                    onBack={() => {
                      setPosModal(null);
                      setRoute("sales");
                    }}
                    onFinishSale={(sale, paymentMethod) => {
                      setState((s) => {
                        const prods = [...(s.products || [])];
                        const qtyById = new Map();

                        for (const item of sale.items || []) {
                          const q = Number(item.qty || 0);
                          qtyById.set(
                            item.productId,
                            (qtyById.get(item.productId) || 0) + q
                          );
                        }

                        const updated = prods.map((p) => {
                          const delta = qtyById.get(p.id) || 0;
                          const current = Number(p.stock ?? 0);
                          if (p.type === "service") return p;
                          return { ...p, stock: Math.max(0, current - delta) };
                        });

                        return {
                          ...s,
                          products: updated,
                          sales: [sale, ...(s.sales || [])],
                          transactions: [
                            ...(s.transactions || []),
                            {
                              id: uid(),
                              date: todayISO(),
                              kind: "in",
                              category: "sale_cash",
                              description: `Venda (${sale.code})`,
                              amount: sale.total,
                              method: paymentMethod,
                            },
                          ],
                        };
                      });

                      notify(
                        "Venda Realizada",
                        `Código ${sale.code} registrado com sucesso!`,
                        "success"
                      );
                      setPosModal(null);
                      setRoute("sales");
                    }}
                  />
                )}

                {route === "projection" && (
                  <ProjectionView tx={state.transactions} startBalance={balance} />
                )}

                {route === "profile" && (
                  <ProfileView
                    company={state.company}
                    onSave={(c) => {
                      setState((s) => ({ ...s, company: c }));
                      notify("Perfil Salvo", "Dados atualizados.", "success");
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}
    </div>
  );
}
// -----------------------------
// TRANSACTIONS
// -----------------------------
function TransactionsView({ tx, onUpdate }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [preset, setPreset] = useState("all");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [cat, setCat] = useState("all");

  const txSorted = useMemo(() => {
    return [...(tx || [])].sort((a, b) => b.date.localeCompare(a.date));
  }, [tx]);

  const filtered = useMemo(() => {
    const t = todayISO();
    const startWeek = (() => {
      const now = parseISOToLocalDate(t);
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      return toISODateLocal(d);
    })();

    const startMonth = (() => {
      const now = parseISOToLocalDate(t);
      return toISODateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    })();

    return txSorted.filter((x) => {
      if (preset === "today" && x.date !== t) return false;
      if (preset === "week" && x.date < startWeek) return false;
      if (preset === "month" && x.date < startMonth) return false;

      if (kind !== "all" && x.kind !== kind) return false;
      if (cat !== "all" && x.category !== cat) return false;

      if (q) {
        const s = (x.description || "").toLowerCase();
        if (!s.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [txSorted, preset, kind, cat, q]);

  const totals = useMemo(() => {
    const entradas = filtered
      .filter((t) => t.kind === "in")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const saidas = filtered
      .filter((t) => t.kind === "out")
      .reduce((s, t) => s + (t.amount || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [filtered]);

  const removeTx = (id) => {
    if (typeof onUpdate === "function") {
      onUpdate((prev) => (prev || []).filter((t) => t.id !== id));
    }
  };

  const exportCSV = () => {
    const rows = [...filtered].reverse();
    const csv = toCSV(
      rows.map((r) => ({
        ...r,
        runningBalance: "",
      }))
    );
    downloadTextFile(
      `movimentos_${todayISO()}.csv`,
      csv,
      "text/csv;charset=utf-8;"
    );
  };

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Movimentos de Caixa</h2>
            <p className="text-sm text-zinc-500">
              Registre entradas e saídas pelo dia real que o dinheiro entrou/saiu.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SoftButton onClick={exportCSV} icon={Download}>
              Exportar CSV
            </SoftButton>
            <PrimaryButton
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Novo Movimento <ArrowRight className="h-4 w-4 opacity-70" />
            </PrimaryButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Select
            label="Período"
            value={preset}
            onChange={setPreset}
            options={[
              { value: "all", label: "Tudo" },
              { value: "today", label: "Hoje" },
              { value: "week", label: "Semana" },
              { value: "month", label: "Mês" },
            ]}
          />
          <Select
            label="Tipo"
            value={kind}
            onChange={setKind}
            options={[
              { value: "all", label: "Entradas + Saídas" },
              { value: "in", label: "Entradas" },
              { value: "out", label: "Saídas" },
            ]}
          />
          <Select
            label="Categoria"
            value={cat}
            onChange={setCat}
            options={[
              { value: "all", label: "Todas" },
              ...CATEGORY_ALL.map((c) => ({
                value: c.key,
                label: `${kindLabel(c.kind)} · ${c.label}`,
              })),
            ]}
          />
          <Input
            label="Buscar"
            value={q}
            onChange={setQ}
            placeholder="Ex: fornecedor, aluguel..."
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Card className="bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Entradas (filtro)</div>
            <div className="text-2xl font-extrabold text-emerald-600">
              {formatBRL(totals.entradas)}
            </div>
          </Card>
          <Card className="bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Saídas (filtro)</div>
            <div className="text-2xl font-extrabold text-rose-600">
              {formatBRL(totals.saidas)}
            </div>
          </Card>
          <Card className="bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Saldo (filtro)</div>
            <div
              className={cx(
                "text-2xl font-extrabold",
                totals.saldo >= 0 ? "text-blue-600" : "text-rose-600"
              )}
            >
              {formatBRL(totals.saldo)}
            </div>
          </Card>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="font-bold">Lista de Movimentos</div>
          <Badge tone="neutral">{filtered.length} itens</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-500">
                    Nenhum movimento encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-6 py-3 text-zinc-500">{t.date}</td>
                    <td className="px-6 py-3 font-medium">{t.description}</td>
                    <td className="px-6 py-3 text-zinc-500">
                      {labelForCategory(t.category)}
                    </td>
                    <td
                      className={cx(
                        "px-6 py-3 text-right font-extrabold",
                        t.kind === "in"
                          ? "text-emerald-600"
                          : "text-rose-600"
                      )}
                    >
                      {t.kind === "out" ? "-" : ""}
                      {formatBRL(t.amount)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => {
                            setEditing(t);
                            setOpen(true);
                          }}
                          className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-bold hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => removeTx(t.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/50"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {open && (
          <TxModal
            editing={editing}
            onClose={() => {
              setOpen(false);
              setEditing(null);
            }}
            onSave={(payload) => {
              const next = editing
                ? (tx || []).map((t) =>
                    t.id === editing.id ? { ...t, ...payload } : t
                  )
                : [{ id: uid(), ...payload }, ...(tx || [])];

              if (typeof onUpdate === "function") {
                onUpdate(next);
              }

              setOpen(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TxModal({ editing, onClose, onSave }) {
  const [date, setDate] = useState(editing?.date || todayISO());
  const [description, setDescription] = useState(editing?.description || "");
  const [kind, setKind] = useState(editing?.kind || "in");
  const [category, setCategory] = useState(editing?.category || "sale_cash");
  const [amount, setAmount] = useState(String(editing?.amount ?? ""));
  const [method, setMethod] = useState(editing?.method || "");

  useEffect(() => {
    if (!editing) {
      if (
        kind === "in" &&
        !CATEGORY_ALL.find((c) => c.key === category && c.kind === "in")
      ) {
        setCategory("sale_cash");
      }
      if (
        kind === "out" &&
        !CATEGORY_ALL.find((c) => c.key === category && c.kind === "out")
      ) {
        setCategory("fixed");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const catOptions = useMemo(() => {
    return CATEGORY_ALL.filter((c) => c.kind === kind).map((c) => ({
      value: c.key,
      label: c.label,
    }));
  }, [kind]);

  return (
    <ModalShell title={editing ? "Editar Movimento" : "Novo Movimento"} onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Data real" type="date" value={date} onChange={setDate} />
        <Select
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            { value: "in", label: "Entrada" },
            { value: "out", label: "Saída" },
          ]}
        />
        <div className="md:col-span-2">
          <Input
            label="Descrição"
            value={description}
            onChange={setDescription}
            placeholder="Ex: Venda balcão, aluguel, fornecedor..."
          />
        </div>
        <Select
          label="Categoria"
          value={category}
          onChange={setCategory}
          options={catOptions}
        />
        <Input
          label="Valor"
          value={amount}
          onChange={setAmount}
          placeholder="Ex: 150,00"
          right="R$"
        />
        <div className="md:col-span-2">
          <Input
            label="Método (opcional)"
            value={method}
            onChange={setMethod}
            placeholder="Pix, Cartão, Dinheiro..."
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <SoftButton onClick={onClose}>Cancelar</SoftButton>
        <PrimaryButton
          onClick={() =>
            onSave?.({
              date,
              description: description.trim() || "(sem descrição)",
              kind,
              category,
              amount: parseNumber(amount),
              method: method.trim(),
            })
          }
          disabled={!date || parseNumber(amount) <= 0}
        >
          Salvar
        </PrimaryButton>
      </div>
    </ModalShell>
  );
}
// -----------------------------
// PROJECTION
// -----------------------------
function ProjectionView({ tx, startBalance }) {
  const [days, setDays] = useState("30");

  const projection = useMemo(() => {
    const horizon = Number(days || 30);
    const start = todayISO();

    const futureTx = (tx || []).filter((t) => t.date >= start);
    const byDate = new Map();
    for (const t of futureTx) {
      const arr = byDate.get(t.date) || [];
      arr.push(t);
      byDate.set(t.date, arr);
    }

    let bal = Number(startBalance || 0);
    const rows = [];
    for (let i = 0; i <= horizon; i++) {
      const d = addDaysISO(start, i);
      const list = byDate.get(d) || [];
      let inSum = 0;
      let outSum = 0;
      for (const t of list) {
        if (t.kind === "in") inSum += t.amount || 0;
        else outSum += t.amount || 0;
      }
      bal = bal + inSum - outSum;
      rows.push({ date: d, inSum, outSum, balance: bal });
    }
    return rows;
  }, [tx, startBalance, days]);

  const chartData = useMemo(() => {
    return projection.map((r) => ({
      date: r.date.slice(5),
      saldo: r.balance,
    }));
  }, [projection]);

  const minBal = useMemo(
    () =>
      Math.min(
        ...projection.map((r) => r.balance),
        Number(startBalance || 0)
      ),
    [projection, startBalance]
  );

  const willGoNegative = minBal < 0;

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Projeção de Caixa</h2>
            <p className="text-sm text-zinc-500">
              Visualize o saldo futuro baseado nos lançamentos com data &gt;= hoje.
            </p>
          </div>

          <div className="w-full max-w-xs">
            <Select
              label="Horizonte"
              value={days}
              onChange={setDays}
              options={[
                { value: "7", label: "7 dias" },
                { value: "15", label: "15 dias" },
                { value: "30", label: "30 dias" },
                { value: "60", label: "60 dias" },
                { value: "90", label: "90 dias" },
              ]}
            />
          </div>
        </div>

        <div className="mt-5">
          {willGoNegative ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              <div className="flex items-center gap-2 font-extrabold">
                <AlertTriangle className="h-5 w-5" /> Risco: saldo pode ficar negativo
              </div>
              <div className="mt-1 text-sm opacity-90">
                Menor saldo no horizonte:{" "}
                <span className="font-bold">{formatBRL(minBal)}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-extrabold">
                <CheckCircle2 className="h-5 w-5" /> Projeção saudável
              </div>
              <div className="mt-1 text-sm opacity-90">
                Menor saldo no horizonte:{" "}
                <span className="font-bold">{formatBRL(minBal)}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 font-bold">Gráfico do Saldo Projetado</div>
        <div className="h-[260px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              Sem dados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis
                  width={70}
                  tickFormatter={(v) =>
                    (Number(v) || 0).toLocaleString("pt-BR")
                  }
                />
                <Tooltip
                  formatter={(v) => formatBRL(Number(v) || 0)}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Area type="monotone" dataKey="saldo" strokeWidth={2} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 font-bold">
          Tabela (dia a dia)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">Entradas</th>
                <th className="px-6 py-4 text-right">Saídas</th>
                <th className="px-6 py-4 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {projection.map((r) => (
                <tr key={r.date} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-6 py-3 text-zinc-500">{r.date}</td>
                  <td className="px-6 py-3 text-right font-bold text-emerald-600">
                    {formatBRL(r.inSum)}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-rose-600">
                    {formatBRL(r.outSum)}
                  </td>
                  <td
                    className={cx(
                      "px-6 py-3 text-right font-extrabold",
                      r.balance >= 0 ? "text-blue-600" : "text-rose-600"
                    )}
                  >
                    {formatBRL(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------
// GOAL
// -----------------------------
function GoalView({ tx, state, setState }) {
  const goal = state.goal || {
    value: 0,
    period: "1",
    dailySalesTarget: 5,
    startDate: null,
  };

  const [value, setValue] = useState(String(goal.value ?? 0));
  const [period, setPeriod] = useState(String(goal.period ?? "1"));
  const [dailySalesTarget, setDailySalesTarget] = useState(
    String(goal.dailySalesTarget ?? 5)
  );
  const [startDate, setStartDate] = useState(goal.startDate || todayISO());

  const range = useMemo(() => {
    const start = startDate || todayISO();
    const startD = parseISOToLocalDate(start);
    const months = Math.max(1, parseInt(period, 10) || 1);
    const endD = new Date(
      startD.getFullYear(),
      startD.getMonth() + months,
      startD.getDate()
    );
    const end = toISODateLocal(endD);
    return { start, end };
  }, [startDate, period]);

  const progress = useMemo(() => {
    const start = range.start;
    const end = range.end;
    const entries = (tx || [])
      .filter((t) => t.kind === "in")
      .filter((t) => t.date >= start && t.date <= end)
      .reduce((s, t) => s + (t.amount || 0), 0);

    const target = parseNumber(value);
    const pct = target > 0 ? (entries / target) * 100 : 0;
    return { entries, target, pct };
  }, [tx, range, value]);

  const save = () => {
    setState((s) => ({
      ...s,
      goal: {
        value: parseNumber(value),
        period: String(parseInt(period, 10) || 1),
        dailySalesTarget: parseInt(dailySalesTarget, 10) || 0,
        startDate: startDate || todayISO(),
      },
    }));
  };

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Meta</h2>
            <p className="text-sm text-zinc-500">
              Defina uma meta de entradas (receitas) e acompanhe o progresso.
            </p>
          </div>

          <PrimaryButton onClick={save}>
            Salvar Meta <ArrowRight className="h-4 w-4 opacity-70" />
          </PrimaryButton>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Input
            label="Meta (R$)"
            value={value}
            onChange={setValue}
            placeholder="Ex: 30000"
          />
          <Select
            label="Período"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "1", label: "1 mês" },
              { value: "2", label: "2 meses" },
              { value: "3", label: "3 meses" },
              { value: "6", label: "6 meses" },
              { value: "12", label: "12 meses" },
            ]}
          />
          <Input
            label="Início"
            type="date"
            value={startDate}
            onChange={setStartDate}
          />
          <Input
            label="Meta de vendas/dia (opcional)"
            value={dailySalesTarget}
            onChange={setDailySalesTarget}
            placeholder="Ex: 5"
          />
        </div>
      </Card>

      <Card highlight>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Progresso no período
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {formatBRL(progress.entries)}{" "}
              <span className="text-zinc-400 text-base font-bold">
                / {formatBRL(progress.target)}
              </span>
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              {range.start} → {range.end}
            </div>
          </div>

          <div className="w-full max-w-sm">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-zinc-500">
              <span>Percentual</span>
              <span>
                {Math.min(100, Math.max(0, progress.pct)).toFixed(1)}%
              </span>
            </div>
            <ProgressBar
              value={progress.entries}
              max={Math.max(1, progress.target)}
              color="blue"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="font-bold mb-3">Dica prática</div>
        <div className="text-sm text-zinc-600 dark:text-zinc-300">
          Se você quer bater a meta com mais consistência, registre todo dia ao menos:
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>1 entrada (mesmo pequena)</li>
            <li>1 saída (para não “sumir” no caixa)</li>
            <li>Ao final, confira o saldo real</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------
// PROFILE
// -----------------------------
function ProfileView({ company, onSave }) {
  const [name, setName] = useState(company?.name || "Minha Empresa");
  const [cnpj, setCnpj] = useState(company?.cnpj || "");
  const [sector, setSector] = useState(company?.sector || "");
  const [city, setCity] = useState(company?.city || "");
  const [startBalance, setStartBalance] = useState(
    String(company?.startBalance ?? 0)
  );

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Configurações</h2>
            <p className="text-sm text-zinc-500">
              Dados básicos da empresa e saldo inicial.
            </p>
          </div>
          <PrimaryButton
            onClick={() =>
              onSave?.({
                name: name.trim() || "Minha Empresa",
                cnpj: cnpj.trim(),
                sector: sector.trim(),
                city: city.trim(),
                startBalance: parseNumber(startBalance),
              })
            }
          >
            Salvar <ArrowRight className="h-4 w-4 opacity-70" />
          </PrimaryButton>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input label="Nome da Empresa" value={name} onChange={setName} />
          <Input
            label="CNPJ (opcional)"
            value={cnpj}
            onChange={setCnpj}
            placeholder="00.000.000/0000-00"
          />
          <Input
            label="Segmento"
            value={sector}
            onChange={setSector}
            placeholder="Ex: Mercado, Lanchonete, Serviço..."
          />
          <Input
            label="Cidade"
            value={city}
            onChange={setCity}
            placeholder="Ex: Anastácio"
          />
          <div className="md:col-span-2">
            <Input
              label="Saldo Inicial (R$)"
              value={startBalance}
              onChange={setStartBalance}
              placeholder="Ex: 1000"
            />
            <div className="mt-2 text-xs text-zinc-500">
              Dica: use o saldo real do caixa/banco no dia que você começou a usar o app.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------
// SALES VIEW (lista vendas + botão iniciar PDV)
// -----------------------------
function SalesView({ sales, onStart }) {
  const list = useMemo(() => {
    return [...(sales || [])].sort((a, b) => {
      const da = `${a.date || ""} ${a.time || ""}`;
      const db = `${b.date || ""} ${b.time || ""}`;
      return db.localeCompare(da);
    });
  }, [sales]);

  const total = useMemo(() => {
    return list.reduce((s, x) => s + (x.total || 0), 0);
  }, [list]);

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Vendas</h2>
            <p className="text-sm text-zinc-500">
              Histórico de vendas registradas pelo PDV.
            </p>
          </div>
          <PrimaryButton onClick={onStart}>
            Abrir PDV <ArrowRight className="h-4 w-4 opacity-70" />
          </PrimaryButton>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Card className="bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Qtd. vendas</div>
            <div className="text-2xl font-extrabold">{list.length}</div>
          </Card>
          <Card className="bg-zinc-50 dark:bg-zinc-900 md:col-span-2">
            <div className="text-xs text-zinc-500">Total vendido</div>
            <div className="text-2xl font-extrabold text-blue-600">
              {formatBRL(total)}
            </div>
          </Card>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="font-bold">Últimas vendas</div>
          <Badge>{list.length} registros</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Itens</th>
                <th className="px-6 py-4">Pagamento</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-500">
                    Nenhuma venda ainda. Abra o PDV para registrar.
                  </td>
                </tr>
              ) : (
                list.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-6 py-3 text-zinc-500">
                      {s.date} {s.time}
                    </td>
                    <td className="px-6 py-3 font-bold">{s.code}</td>
                    <td className="px-6 py-3 text-zinc-500">{s.itemsCount}</td>
                    <td className="px-6 py-3 text-zinc-500">
                      {s.payment || "—"}
                    </td>
                    <td className="px-6 py-3 text-right font-extrabold">
                      {formatBRL(s.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------
// POS NAVIGATION (atalhos modais)
// -----------------------------
function POSNavigation({ active, onOpen }) {
  const items = [
    { key: "search", label: "Buscar Itens" },
    { key: "qty", label: "Quantidade" },
    { key: "discount", label: "Desconto" },
    { key: "return", label: "Devolução" },
    { key: "partial", label: "Pagamento Parcial" },
    { key: "finish", label: "Finalizar" },
  ];

  return (
    <nav className="no-scrollbar mt-6 flex overflow-x-auto border-b border-zinc-200 pb-1 dark:border-zinc-800">
      {items.map((n) => {
        const isActive = active === n.key;
        return (
          <button
            key={n.key}
            onClick={() => onOpen(n.key)}
            className={cx(
              "flex min-w-[110px] flex-1 items-center justify-center border-b-2 px-4 py-3 text-xs font-bold transition-colors sm:text-sm",
              isActive
                ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            {n.label}
          </button>
        );
      })}
    </nav>
  );
}

// -----------------------------
// POS (PDV)
// -----------------------------
function POSView({ products, posModal, setPosModal, onBack, onFinishSale }) {
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState("Dinheiro");
  const [discount, setDiscount] = useState(0);

  const [quickOpen, setQuickOpen] = useState(false);

  const subtotal = useMemo(
    () => cart.reduce((s, it) => s + (it.total || 0), 0),
    [cart]
  );

  const total = useMemo(
    () => Math.max(0, subtotal - (discount || 0)),
    [subtotal, discount]
  );

  const addItem = (p) => {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === p.id);
      if (idx >= 0) {
        const clone = [...prev];
        const curr = clone[idx];
        const qty = Number(curr.qty || 0) + 1;
        const price = Number(curr.price || 0);
        clone[idx] = { ...curr, qty, total: qty * price };
        return clone;
      }
      const price = Number(p.price || 0);
      return [
        ...prev,
        {
          id: uid(),
          productId: p.id,
          name: p.name,
          qty: 1,
          price,
          total: price,
        },
      ];
    });
  };

  const setQty = (productId, qty) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.productId !== productId) return it;
          const q = Math.max(0, Number(qty || 0));
          return { ...it, qty: q, total: q * Number(it.price || 0) };
        })
        .filter((it) => it.qty > 0)
    );
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((it) => it.productId !== productId));
  };

  const finish = () => {
    const now = new Date();
    const sale = {
      id: uid(),
      code: `VD${String(Math.floor(Math.random() * 9000) + 1000)}`,
      date: todayISO(),
      time: now.toTimeString().slice(0, 5),
      items: cart,
      itemsCount: cart.reduce((s, it) => s + Number(it.qty || 0), 0),
      subtotal,
      discount,
      total,
      payment,
      payments: [{ method: payment, amount: total }],
    };

    onFinishSale?.(sale, payment);
    setCart([]);
    setDiscount(0);
    setPayment("Dinheiro");
  };

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">PDV</h2>
            <p className="text-sm text-zinc-500">
              Adicione itens, ajuste quantidades e finalize.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SoftButton onClick={() => setQuickOpen(true)}>
              Cadastro rápido
            </SoftButton>
            <SoftButton onClick={() => setPosModal("search")}>
              Buscar itens
            </SoftButton>
            <SoftButton onClick={onBack}>Voltar</SoftButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Card className="bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Subtotal</div>
            <div className="text-2xl font-extrabold">{formatBRL(subtotal)}</div>
          </Card>
          <Card className="bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Desconto</div>
            <div className="text-2xl font-extrabold text-amber-600">
              {formatBRL(discount)}
            </div>
          </Card>
          <Card className="bg-zinc-50 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Total</div>
            <div className="text-2xl font-extrabold text-blue-600">
              {formatBRL(total)}
            </div>
          </Card>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Select
            label="Forma de Pagamento"
            value={payment}
            onChange={setPayment}
            options={[
              { value: "Dinheiro", label: "Dinheiro" },
              { value: "Pix", label: "Pix" },
              { value: "Cartão", label: "Cartão" },
              { value: "Boleto", label: "Boleto" },
              { value: "Outros", label: "Outros" },
            ]}
          />
          <Input
            label="Desconto (R$)"
            value={String(discount ?? 0)}
            onChange={(v) => setDiscount(parseNumber(v))}
            placeholder="0"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <SoftButton onClick={() => setPosModal("qty")}>Quantidade</SoftButton>
          <SoftButton onClick={() => setPosModal("discount")}>Desconto</SoftButton>
          <SoftButton onClick={() => setPosModal("finish")}>Finalizar</SoftButton>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="font-bold">Carrinho</div>
          <Badge>{cart.length} itens</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4 text-right">Preço</th>
                <th className="px-6 py-4 text-right">Qtd</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-500">
                    Carrinho vazio. Use “Buscar itens” ou “Cadastro rápido”.
                  </td>
                </tr>
              ) : (
                cart.map((it) => (
                  <tr
                    key={it.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-6 py-3 font-medium">{it.name}</td>
                    <td className="px-6 py-3 text-right text-zinc-500">
                      {formatBRL(it.price)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <input
                        className="w-20 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-right text-sm font-bold dark:border-zinc-800 dark:bg-zinc-950"
                        value={String(it.qty)}
                        onChange={(e) =>
                          setQty(
                            it.productId,
                            parseInt(e.target.value || "0", 10)
                          )
                        }
                      />
                    </td>
                    <td className="px-6 py-3 text-right font-extrabold">
                      {formatBRL(it.total)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/50"
                        onClick={() => removeItem(it.productId)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {posModal === "search" && (
          <SearchModal
            products={products || []}
            onClose={() => setPosModal(null)}
            onPick={(p) => {
              addItem(p);
              setPosModal(null);
            }}
          />
        )}

        {posModal === "qty" && (
          <QuantityModal
            cart={cart}
            onClose={() => setPosModal(null)}
            onSetQty={(productId, qty) => setQty(productId, qty)}
          />
        )}

        {posModal === "discount" && (
          <DiscountModal
            discount={discount}
            onClose={() => setPosModal(null)}
            onApply={(d) => {
              setDiscount(Math.max(0, d));
              setPosModal(null);
            }}
          />
        )}

        {posModal === "finish" && (
          <FinishModal
            cart={cart}
            subtotal={subtotal}
            discount={discount}
            total={total}
            payment={payment}
            onClose={() => setPosModal(null)}
            onFinish={() => {
              setPosModal(null);
              finish();
            }}
          />
        )}

        {posModal === "return" && <ReturnModal onClose={() => setPosModal(null)} />}
        {posModal === "partial" && <PartialModal onClose={() => setPosModal(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {quickOpen && (
          <QuickCreateProductModal
            onClose={() => setQuickOpen(false)}
            onCreate={(p) => {
              addItem(p);
              setQuickOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------
// MODAL SHELL
// -----------------------------
function ModalShell({ title, children, onClose, wide = false }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className={cx(
          "w-full rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-lg font-extrabold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-bold opacity-60 hover:opacity-100"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}

// -----------------------------
// POS MODALS
// -----------------------------
function SearchModal({ products, onClose, onPick }) {
  const [q, setQ] = useState("");
  const [onlyStock, setOnlyStock] = useState(false);

  const list = useMemo(() => {
    const base = (products || []).filter((p) => p && p.name);
    return base
      .filter((p) => {
        if (onlyStock && p.type !== "service") {
          const st = Number(p.stock ?? 0);
          if (st <= 0) return false;
        }
        if (!q) return true;
        return String(p.name).toLowerCase().includes(q.toLowerCase());
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [products, q, onlyStock]);

  return (
    <ModalShell title="Buscar itens" onClose={onClose} wide>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <Input label="Buscar" value={q} onChange={setQ} placeholder="Digite o nome do item..." />
        </div>
        <Select
          label="Filtro"
          value={onlyStock ? "stock" : "all"}
          onChange={(v) => setOnlyStock(v === "stock")}
          options={[
            { value: "all", label: "Todos" },
            { value: "stock", label: "Somente com estoque" },
          ]}
        />
      </div>

      <div className="mt-4 max-h-[360px] overflow-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
        {list.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">Nenhum item encontrado.</div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick?.(p)}
                className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-zinc-500">
                      {p.type === "service" ? "Serviço" : `Estoque: ${p.stock ?? 0}`} · Preço:{" "}
                      {formatBRL(p.price || 0)}
                    </div>
                  </div>
                  <div className="text-sm font-extrabold text-blue-600">Adicionar</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <SoftButton onClick={onClose}>Fechar</SoftButton>
      </div>
    </ModalShell>
  );
}

function QuantityModal({ cart, onClose, onSetQty }) {
  return (
    <ModalShell title="Ajustar Quantidades" onClose={onClose} wide>
      {!cart || cart.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-500">Carrinho vazio.</div>
      ) : (
        <div className="space-y-3">
          {cart.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
            >
              <div>
                <div className="font-bold">{it.name}</div>
                <div className="text-xs text-zinc-500">Preço: {formatBRL(it.price)}</div>
              </div>
              <input
                className="w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-right text-sm font-bold dark:border-zinc-800 dark:bg-zinc-950"
                value={String(it.qty)}
                onChange={(e) =>
                  onSetQty?.(it.productId, parseInt(e.target.value || "0", 10))
                }
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <SoftButton onClick={onClose}>Concluir</SoftButton>
      </div>
    </ModalShell>
  );
}

function DiscountModal({ discount, onClose, onApply }) {
  const [v, setV] = useState(String(discount ?? 0));
  return (
    <ModalShell title="Aplicar Desconto" onClose={onClose}>
      <Input label="Desconto (R$)" value={v} onChange={setV} placeholder="0" />
      <div className="mt-5 flex justify-end gap-2">
        <SoftButton onClick={onClose}>Cancelar</SoftButton>
        <PrimaryButton onClick={() => onApply?.(parseNumber(v))}>Aplicar</PrimaryButton>
      </div>
    </ModalShell>
  );
}

function FinishModal({ cart, subtotal, discount, total, payment, onClose, onFinish }) {
  return (
    <ModalShell title="Finalizar Venda" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Itens</span>
          <span className="font-bold">{cart?.length || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Subtotal</span>
          <span className="font-bold">{formatBRL(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Desconto</span>
          <span className="font-bold text-amber-600">{formatBRL(discount)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <span className="text-zinc-500">Total</span>
          <span className="text-lg font-extrabold text-blue-600">{formatBRL(total)}</span>
        </div>

        <div className="mt-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-bold uppercase text-zinc-500">Pagamento</div>
          <div className="mt-1 font-extrabold">{payment}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <SoftButton onClick={onClose}>Voltar</SoftButton>
        <PrimaryButton onClick={onFinish} disabled={!cart || cart.length === 0}>
          Confirmar Venda
        </PrimaryButton>
      </div>
    </ModalShell>
  );
}

function ReturnModal({ onClose }) {
  return (
    <ModalShell title="Devolução" onClose={onClose}>
      <div className="text-sm text-zinc-500">
        Estrutura pronta. Se você quiser, eu implemento devolução com estorno + ajuste de estoque.
      </div>
      <div className="mt-5 flex justify-end">
        <SoftButton onClick={onClose}>Fechar</SoftButton>
      </div>
    </ModalShell>
  );
}

function PartialModal({ onClose }) {
  return (
    <ModalShell title="Pagamento Parcial" onClose={onClose}>
      <div className="text-sm text-zinc-500">
        Estrutura pronta. Se você quiser, eu implemento split de pagamento (Pix + Cartão etc.).
      </div>
      <div className="mt-5 flex justify-end">
        <SoftButton onClick={onClose}>Fechar</SoftButton>
      </div>
    </ModalShell>
  );
}

// -----------------------------
// QUICK CREATE (sem página Produtos)
// -----------------------------
function QuickCreateProductModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("product");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("0");

  const create = () => {
    const p = {
      id: uid(),
      name: name.trim() || "Item",
      type: type === "service" ? "service" : "product",
      price: parseNumber(price),
      cost: parseNumber(cost),
      stock: type === "service" ? 0 : parseInt(stock, 10) || 0,
      minStock: type === "service" ? 0 : parseInt(minStock, 10) || 0,
    };
    onCreate?.(p);
  };

  return (
    <ModalShell title="Cadastro rápido (para vender agora)" onClose={onClose}>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input label="Nome" value={name} onChange={setName} placeholder="Ex: Refrigerante 2L" />
        </div>
        <Select
          label="Tipo"
          value={type}
          onChange={setType}
          options={[
            { value: "product", label: "Produto" },
            { value: "service", label: "Serviço" },
          ]}
        />
        <Input label="Preço (R$)" value={price} onChange={setPrice} placeholder="Ex: 10,00" />
        <Input label="Custo (R$)" value={cost} onChange={setCost} placeholder="Ex: 6,50" />

        {type !== "service" && (
          <>
            <Input label="Estoque" value={stock} onChange={setStock} placeholder="0" />
            <Input label="Estoque mínimo" value={minStock} onChange={setMinStock} placeholder="0" />
          </>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <SoftButton onClick={onClose}>Cancelar</SoftButton>
        <PrimaryButton onClick={create} disabled={!name || parseNumber(price) <= 0}>
          Criar e adicionar
        </PrimaryButton>
      </div>
    </ModalShell>
  );
}

// -----------------------------
// TOAST NOTIFICATION
// -----------------------------
function ToastContainer({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose?.(), 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const tones = {
    brand:
      "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200",
    danger:
      "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200",
    warning:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200",
  };

  return (
    <div className="fixed right-4 top-4 z-50 w-[340px]">
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        className={cx(
          "rounded-2xl border p-4 shadow-lg",
          tones[toast.tone] || tones.success
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-extrabold">{toast.title}</div>
            <div className="mt-1 text-sm opacity-90">{toast.desc}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-bold opacity-60 hover:opacity-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </div>
  );
}