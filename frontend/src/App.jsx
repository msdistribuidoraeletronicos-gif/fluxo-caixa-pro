// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthCallback from "./pages/AuthCallback";

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
  Target,
  Building2,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Receipt,
  BarChart3,
  ShoppingBag,
  Plus,
  Package,
  Eye,
  EyeOff,
  Filter,
  Crown,
} from "lucide-react";

// ✅ UI Shared
import {
  Header as DashboardHeader,
  PrimaryButton,
  SoftButton,
  Card,
  Badge,
  Input,
  Select,
  ModalShell,
  cx,
} from "./shared/ui";

// ✅ Imports do Supabase e Banco de Dados
import { supabase } from "./lib/supabaseClient";
import AuthPage from "./pages/AuthPage";

// ✅ IMPORTS ATUALIZADOS
import {
  loadAll,
  saveCompany,
  saveProfile,
  loadSubscription,
  // CADASTRO
  upsertProduct,
  upsertPendencia,
  deletePendencia,
  // HISTÓRICO
  insertTransaction,
  insertSale,
  // META
  upsertGoal, // ✅ Importado
} from "./lib/db";

// ✅ VISUALIZAÇÕES EXTERNAS
import ProductsView from "./pages/ProductsView";
import PendenciasView from "./pages/PendenciasView";
import ReportsView from "./pages/ReportsView";
import GoalView from "./pages/GoalView";
import ProjectionView from "./pages/ProjectionView";
import { SalesView, POSView, POSNavigation } from "./pages/SalesPage";

// ✅ IMPORT ProfileView & PlansView
import ProfileView from "./pages/ProfileView";
import PlansView from "./pages/PlansView";

// -----------------------------
// ✅ CONFIGURAÇÃO DO BACKEND (CORRIGIDA)
// -----------------------------
// Em DEV usa localhost, em PROD usa caminho relativo (proxy do Vercel)
const apiUrl = (path) => {
  const base = import.meta.env.DEV
    ? import.meta.env.VITE_BACKEND_URL || "http://localhost:3001"
    : "";
  return `${base}${path}`;
};

// -----------------------------
// ✅ HELPER FUNCTIONS GLOBAIS
// -----------------------------

// ✅ [NOVO] Helper Dedupe
const dedupeById = (arr) => {
  const map = new Map();
  for (const item of arr || []) {
    const id = item?.id;
    if (!id) continue;
    map.set(id, item); // mantém o último
  }
  return Array.from(map.values());
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const diffDaysFromToday = (isoOrDate) => {
  if (!isoOrDate) return null;
  const due = new Date(isoOrDate);
  const today = startOfToday();
  const due0 = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.floor((due0.getTime() - today.getTime()) / 86400000);
};

const formatDayMonth = (isoOrDate) => {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const THEME_KEY = (uid) => `theme_mode_${uid || "guest"}`;

const readTheme = (uid) => {
  try {
    const v = localStorage.getItem(THEME_KEY(uid));
    if (v === "dark") return true;
    if (v === "light") return false;
    return null;
  } catch {
    return null;
  }
};

const writeTheme = (uid, dark) => {
  try {
    localStorage.setItem(THEME_KEY(uid), dark ? "dark" : "light");
  } catch {}
};

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

const daysUntilISO = (iso) => {
  if (!iso) return null;
  const [y, m, d] = String(iso).split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
};

const getExpiringProducts = (products) => {
  return (products || [])
    .filter((p) => p && p.type !== "service")
    .filter((p) => String(p.expiryDate || "").trim() !== "")
    .map((p) => ({ ...p, daysLeft: daysUntilISO(p.expiryDate) }))
    .filter(
      (p) =>
        p.daysLeft === 5 ||
        p.daysLeft === 1 ||
        p.daysLeft === 0 ||
        p.daysLeft < 0
    )
    .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));
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

const normalizePass = (p) => {
  const s = String(p ?? "").trim();
  const low = s.toLowerCase();
  if (!s) return "";
  if (low === "null" || low === "undefined") return "";
  return s;
};

// -----------------------------
// Helpers de Plano (UI do Header)
// -----------------------------
const PLAN_BADGE = {
  mensal: { label: "PRO Mensal", tone: "brand" },
  trimestral: { label: "PRO Trimestral", tone: "success" },
  anual: { label: "PRO Anual", tone: "neutral" },
  vitalicio: { label: "PRO Vitalício", tone: "warning" },
};

const getPlanBadge = (planId) => {
  return PLAN_BADGE[planId] || { label: "PRO", tone: "brand" };
};

// ---------------------------------------------------------
// Helpers de Meta
// ---------------------------------------------------------
const profitTodayFromTx = (tx) => {
  const t = todayISO();
  const ins = (tx || [])
    .filter((x) => x.date === t && x.kind === "in")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const outs = (tx || [])
    .filter((x) => x.date === t && x.kind === "out")
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  return ins - outs;
};

// ✅ [ATUALIZADO] Janela Móvel (30/90/365 dias fixos)
const dailyProfitTargetFromGoal = (goal) => {
  const g = goal || {};
  const goalValue = Math.max(0, Number(g.value || 0));
  if (!goalValue) return 0;

  const period = String(g.period ?? "1");
  const start = g.startDate || todayISO();

  const daysTotal =
    period === "1" ? 30 :
    period === "3" ? 90 :
    period === "12" ? 365 :
    30;

  return goalValue / Math.max(1, daysTotal);
};

const uid = () => crypto.randomUUID();

const checkGamification = (ach) => {
  const today = todayISO();
  let streak = ach?.streak || 0;
  const lastLogin = ach?.lastLogin || today;
  let xp = ach?.xp || 0;
  let level = ach?.level || 1;

  if (lastLogin !== today) {
    const yesterday = addDaysISO(today, -1);
    if (lastLogin === yesterday) streak += 1;
    else streak = 1;
  }

  while (xp >= level * 100) {
    xp -= level * 100;
    level += 1;
  }

  return { ...(ach || {}), streak, level, xp, lastLogin: today };
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
const labelForCategory = (key) =>
  CATEGORY_ALL.find((c) => c.key === key)?.label || key;

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
    pendencias: [],
    sales: [],
    achievements: { badges: [], streak: 0, lastLogin: start, level: 1, xp: 0 },
    subscription: null,
  };
};

const computeRunningBalance = (txSorted, startBalance) => {
  let bal = startBalance || 0;
  return txSorted.map((t) => {
    bal += t.kind === "in" ? t.amount : -t.amount;
    return { ...t, runningBalance: bal };
  });
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

// -----------------------------
// MAIN APP COMPONENT
// -----------------------------
export default function App() {
  const [state, setState] = useState(() => seedData());
  const [session, setSession] = useState(null);
  const userId = session?.user?.id;

  // ✅ [NOVO] TRAVA ANTI-DUPLO CLIQUE + DEDUPE
  const pendenciaLocksRef = useRef(new Set());
    
  // ✅ [NOVO] Trava de hidratação
  const didHydrateRef = useRef(false);

  // ✅ [NOVO] HELPER FUNCTIONS INTERNAS
  const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
  const normName = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  // ✅ ROTAS
  const [route, setRoute] = useState(() => {
    if (window.location.pathname === "/auth/callback") {
      return "auth_callback";
    }
    return "auth";
  });

  const [dark, setDark] = useState(() => {
    const guestTheme = readTheme(null);
    return guestTheme ?? false;
  });

  const themeHydratedRef = useRef(false);
  const [toast, setToast] = useState(null);
  const [posModal, setPosModal] = useState(null);

  const [expiryOpen, setExpiryOpen] = useState(false);
  const [expiringNow, setExpiringNow] = useState([]);

  const [hidden, setHidden] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPass, setUnlockPass] = useState("");

  // ✅ Modais de Parabéns (Meta e Plano)
  const [goalCongratsOpen, setGoalCongratsOpen] = useState(false);
  const [congratsTitle, setCongratsTitle] = useState("");
  const [congratsText, setCongratsText] = useState("");

  const notify = (title, desc, tone = "success") =>
    setToast({ title, desc, tone });

  // ---------------------------------------------------------
  // ✅ ATALHOS DE TECLADO (F1..F10) - INTEGRADO COM TRAVA PDV
  // ---------------------------------------------------------
  useEffect(() => {
    const isTypingTarget = (el) => {
      if (!el) return false;
      const tag = String(el.tagName || "").toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el.isContentEditable
      );
    };

    const handler = (e) => {
      // evita conflitos com combos
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // se estiver digitando em algum campo, não muda rota
      if (isTypingTarget(e.target)) return;

      // apenas F1..F10
      const key = String(e.key || "");
      if (!/^F([1-9]|10)$/i.test(key)) return;

      // impede o navegador (ex: F1 ajuda)
      e.preventDefault();

      // Se estiver no callback, não mexe
      if (route === "auth_callback") return;

      // ✅ [NOVO] TRAVA DO PDV: Se estiver no PDV, ignora navegação global
      if (route === "pos") return;

      const map = {
        F1: "dashboard",     // Visão Geral
        F2: "sales",         // Vendas
        F3: "transactions",  // Movimentos
        F4: "pendencias",    // Pendências
        F5: "reports",       // Relatórios
        F6: "projection",    // Futuro
        F7: "goal",          // Meta
        F8: "products",      // Produtos
        F9: "plans",         // Planos
        F10: "profile",      // Config
      };

      const next = map[key.toUpperCase()];
      if (!next) return;

      setRoute(next);
    };

    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [route]);


  // ✅ [NOVO] Reseta trava quando userId mudar
  useEffect(() => {
    didHydrateRef.current = false;
  }, [userId]);

  // ✅ 3.1) Feedback e POLLING com limpeza e loadSubscription
  useEffect(() => {
    if (!userId) return;

    const p = new URLSearchParams(window.location.search);
    const mp = p.get("mp");
    if (!mp) return;

    if (mp === "success")
      notify("Pagamento aprovado", "Ativando seu plano...", "success");
    if (mp === "pending")
      notify(
        "Pagamento pendente",
        "Vamos confirmar assim que liberar.",
        "warning"
      );
    if (mp === "failure")
      notify("Pagamento falhou", "Tente novamente.", "danger");

    // ✅ limpa query
    window.history.replaceState({}, document.title, window.location.pathname);

    // ✅ sempre volta pro dashboard
    setRoute("dashboard");

    if (mp === "failure") return;

    // ✅ Polling no Supabase
    let cancelled = false;

    (async () => {
      const startedAt = Date.now();
      const timeoutMs = 30_000; // 30s
      const intervalMs = 2_000; // 2s

      while (!cancelled && Date.now() - startedAt < timeoutMs) {
        try {
          const sub = await loadSubscription(userId);

          if (sub) {
            setState((s) => ({
              ...s,
              subscription: sub,
              auth: {
                ...s.auth,
                user: {
                  ...(s.auth.user || {}),
                  planId: sub.plan_id || s.auth.user?.planId || null,
                },
              },
            }));

            if (sub.status === "active") {
              notify("Plano ativado ✅", "Acesso liberado!", "success");
              return;
            }
          }
        } catch (e) {
          console.error("loadSubscription error:", e);
        }

        await new Promise((r) => setTimeout(r, intervalMs));
      }

      if (!cancelled) {
        notify(
          "Verificando pagamento…",
          "Se você já pagou, pode levar alguns segundos para ativar. Atualize a página.",
          "warning"
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ✅ NOVO: Entitlement com regra de 14 dias de tolerância
  const entitled = useMemo(() => {
    const sub = state.subscription;
    if (!sub) return false;

    // vitalício
    if (sub.plan_id === "vitalicio" && sub.status === "active") return true;

    const now = Date.now();

    // trial
    if (sub.status === "trial" && sub.trial_ends_at) {
      return new Date(sub.trial_ends_at).getTime() > now;
    }

    // active/past_due
    const endDate = sub.current_period_ends_at || sub.current_period_end;
    if ((sub.status === "active" || sub.status === "past_due") && endDate) {
      const daysToDue = diffDaysFromToday(endDate);

      // ainda não venceu (ou vence hoje)
      if (daysToDue >= 0) return true;

      // já venceu: graça até 14 dias após vencimento
      const daysOverdue = Math.abs(daysToDue);
      return daysOverdue <= 14;
    }

    return false;
  }, [state.subscription]);

  // ✅ NOVO: Banner de Aviso (Billing Notice)
  const billingNotice = useMemo(() => {
    const sub = state.subscription;
    if (!sub) return null;

    // vitalício
    if (sub.plan_id === "vitalicio" && sub.status === "active") {
      return {
        tone: "success",
        title: "Plano vitalício ativo ✅",
        desc: "Acesso liberado para sempre. Sem renovações.",
        intensity: 1,
      };
    }

    // trial
    if (sub.status === "trial") {
      const days = sub.trial_ends_at
        ? Math.max(
            0,
            Math.ceil(
              (new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000
            )
          )
        : 0;
      return {
        tone: days <= 1 ? "danger" : "warning",
        title: "Teste grátis em andamento",
        desc: `Seu teste termina em ${days} dia(s). Após isso, será necessário assinar um plano.`,
        intensity: days <= 1 ? 3 : 2,
      };
    }

    // precisa de vencimento
    const endDate = sub.current_period_ends_at || sub.current_period_end;
    if (!endDate) return null;

    const daysToDue = diffDaysFromToday(endDate);
    const dueLabel = formatDayMonth(endDate);

    // ainda não venceu
    if (daysToDue > 0) {
      return {
        tone: "neutral",
        title: "Assinatura ativa ✅",
        desc: `Seu plano renova em ${daysToDue} dia(s) — vencimento em ${dueLabel}.`,
        intensity: 1,
      };
    }

    // vence hoje
    if (daysToDue === 0) {
      return {
        tone: "warning",
        title: "Renovação hoje",
        desc: `Seu plano vence hoje (${dueLabel}). Se o pagamento não for identificado, iniciaremos o período de aviso.`,
        intensity: 2,
      };
    }

    // venceu
    const daysOverdue = Math.abs(daysToDue);

    // 1..14: avisos progressivos
    if (daysOverdue >= 1 && daysOverdue <= 14) {
      const intense = daysOverdue >= 14;
      return {
        tone: intense ? "danger" : "warning",
        title: intense
          ? "Pagamento não identificado — risco de bloqueio"
          : "Plano vencido — pagamento não identificado",
        desc: intense
          ? `Seu plano venceu em ${dueLabel}. Já se passaram ${daysOverdue} dia(s). Amanhã o acesso será interrompido se o pagamento não for identificado.`
          : `Seu plano venceu em ${dueLabel}. Já se passaram ${daysOverdue} dia(s). Assim que o pagamento for identificado, liberamos automaticamente.`,
        intensity: intense ? 4 : 3,
      };
    }

    // 15+: bloqueio total
    return {
      tone: "danger",
      title: "Acesso interrompido por falta de pagamento",
      desc: `Seu plano venceu em ${dueLabel} e passou do limite (15+ dias). Para liberar novamente, efetue o pagamento.`,
      intensity: 5,
      blocked: true,
    };
  }, [state.subscription]);

  // ✅ UI Summary para o Header (Badges Pequenas)
  const subscriptionSummary = useMemo(() => {
    const sub = state.subscription;
    if (!sub)
      return {
        kind: "none",
        planId: null,
        badge: null,
      };

    if (sub.status === "trial") {
      const days = sub.trial_ends_at
        ? Math.max(
            0,
            Math.ceil(
              (new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000
            )
          )
        : 0;
      return {
        kind: "trial",
        planId: sub.plan_id,
        badge: {
          label: `Teste: ${days} dia(s)`,
          tone: days <= 1 ? "danger" : "warning",
        },
      };
    }

    if (entitled) {
      const planId = sub.plan_id || "mensal";
      return {
        kind: "active",
        planId,
        badge: getPlanBadge(planId),
      };
    }

    return {
      kind: "blocked",
      planId: sub.plan_id,
      badge: { label: "Bloqueado", tone: "danger" },
    };
  }, [state.subscription, entitled]);

  // ✅ Redirecionar automaticamente se !entitled
  useEffect(() => {
    if (!userId) return;
    if (!entitled && route !== "plans") {
      setRoute("plans");
    }
  }, [userId, entitled, route]);

  // ✅ Helper de Bloqueio de Ação
  const requireEntitled = () => {
    if (entitled) return true;
    notify(
      "Assinatura necessária",
      "Seu acesso expirou. Renove para continuar.",
      "warning"
    );
    setRoute("plans");
    return false;
  };

  useEffect(() => {
    themeHydratedRef.current = false;
    const next =
      (userId ? readTheme(userId) : null) ?? readTheme(null) ?? false;
    setDark(next);
    Promise.resolve().then(() => {
      themeHydratedRef.current = true;
    });
  }, [userId]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!themeHydratedRef.current) return;
    writeTheme(userId, dark);
  }, [dark, userId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setState(seedData());
        if (route !== "auth_callback") {
          setRoute("auth");
        }
        setHidden(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [route]);

  const handleLoginSubmit = async ({
    email,
    shouldCreateUser,
    name,
    companyName,
    privacyPass,
  }) => {
    if (!email) return notify("Erro", "Email obrigatório", "danger");

    if (shouldCreateUser) {
      sessionStorage.setItem(
        "pending_signup",
        JSON.stringify({ name, companyName, privacyPass, email })
      );
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: !!shouldCreateUser,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) notify("Erro no Login", error.message, "danger");
    else notify("Tudo certo", "Link enviado! Verifique seu email.", "brand");
  };

  useEffect(() => {
    if (!userId) return;

    // ✅ TRAVA: impede double-run do StrictMode em DEV
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;

    (async () => {
      const pendingRaw = sessionStorage.getItem("pending_signup");
      const pending = pendingRaw ? JSON.parse(pendingRaw) : null;

      const all = await loadAll(userId);

      if (pending && (!all.profile || !all.profile.company_name)) {
        await saveProfile(userId, {
          name: pending.name || "Usuário",
          company_name: pending.companyName || "Minha Empresa",
          privacy_pass: pending.privacyPass || "",
        });
        await saveCompany(userId, {
          name: pending.companyName || "Minha Empresa",
          cnpj: "",
          sector: "",
          city: "",
          startBalance: 0,
        });
        sessionStorage.removeItem("pending_signup");
      }

      const all2 = await loadAll(userId);
      const privacyPassLoaded = normalizePass(all2.profile?.privacy_pass);

      setState((s) => ({
        ...s,
        auth: {
          isAuthed: true,
          user: {
            ...(s.auth.user || {}),
            id: userId,
            name: all2.profile?.name || "Usuário",
            companyName:
              all2.profile?.company_name ||
              all2.company?.name ||
              "Minha Empresa",
            privacyPass: privacyPassLoaded,
            planId: all2.profile?.plan_id || null,
          },
        },
        company: {
          name: all2.company?.name || "Minha Empresa",
          cnpj: all2.company?.cnpj || "",
          sector: all2.company?.sector || "",
          city: all2.company?.city || "",
          startBalance: Number(all2.company?.start_balance ?? 0),
        },
        // ✅ APLICANDO DEDUPEBYID E CORREÇÃO DE DATA
        transactions: dedupeById(all2.transactions || []).map((t) => ({
          ...t,
          date: String(t.date || t.created_at || "").slice(0, 10), // ✅ normaliza
          amount: Number(t.amount || 0),
        })),
        products: dedupeById(all2.products || []).map((p) => ({
          ...p,
          expiryDate: p.expiry_date || p.expiryDate || "",
          createdAt: p.created_at || p.createdAt,
          minStock: Number(p.min_stock ?? p.minStock ?? 0),
          marginPct: Number(p.margin_pct ?? p.marginPct ?? 0),
          marginBRL: Number(p.margin_brl ?? p.marginBRL ?? 0),
          stock: Number(p.stock || 0),
        })),
        pendencias: dedupeById(all2.pendencias || []).map((c) => ({
          ...c,
          createdAt: c.created_at || c.createdAt,
          resolvedAt: c.resolved_at || c.resolvedAt,
          purchases: c.purchases || [],
          payments: c.payments || [],
        })),
        // ✅ CORREÇÃO DE DATA E TIPO NUMÉRICO EM VENDAS
        sales: dedupeById(all2.sales || []).map((s) => ({
          ...s,
          date: String(s.date || s.created_at || "").slice(0, 10), // ✅ normaliza
          total: Number(s.total || 0), // ✅ garante número
          itemsCount: s.items_count ?? s.itemsCount ?? 0,
          paidAtSale: Number(s.paid_at_sale ?? s.paidAtSale ?? 0),
          pendingAtSale: Number(s.pending_at_sale ?? s.pendingAtSale ?? 0),
          clientId: s.client_id || s.clientId,
          createdAt: s.created_at || s.createdAt,
        })),
        goal: all2.goal || s.goal,
        achievements: checkGamification({
          ...(all2.achievements || s.achievements),
          badges: all2.achievements?.badges || [],
        }),
        subscription: all2.subscription || null,
      }));

      const PRIV_FLAG_KEY = `privacy_enabled_${userId}`;
      if (!privacyPassLoaded) {
        setHidden(false);
      } else {
        const enabled = localStorage.getItem(PRIV_FLAG_KEY) === "1";
        setHidden(enabled);
      }
      setUnlockOpen(false);
      setUnlockPass("");
        
      if (route === "auth_callback") {
        setRoute("dashboard");
      } else {
        setRoute("dashboard");
      }
    })().catch((e) => {
      console.error(e);
      notify("Erro", "Falha ao carregar dados.", "danger");
    });
  }, [userId]);

  // ✅ Check de Meta Batida
  useEffect(() => {
    if (!userId) return;
    const goalValue = Number(state.goal?.value || 0);
    if (!goalValue) return;
    const target = dailyProfitTargetFromGoal(state.goal);
    if (!target) return;
    const profitToday = profitTodayFromTx(state.transactions);
    const key = `goal_daily_congrats_${userId}_${todayISO()}`;
    if (localStorage.getItem(key) === "1") return;
    if (profitToday >= target) {
      localStorage.setItem(key, "1");
      setCongratsTitle("🎉 Meta diária batida!");
      setCongratsText(
        `Lucro de hoje: ${formatBRL(profitToday)} • Meta diária: ${formatBRL(
          target
        )}`
      );
      setGoalCongratsOpen(true);
    }
  }, [userId, state.transactions, state.goal]);

  // ✅ Check de Plano Ativo (Parabéns)
  useEffect(() => {
    const sub = state.subscription;
    if (!userId || !sub) return;

    if (sub.status !== "active") return;

    const key = `congrats_plan_${userId}_${sub.plan_id}_${sub.current_period_start || ""}`;
    if (localStorage.getItem(key) === "1") return;

    localStorage.setItem(key, "1");

    const endDate = sub.current_period_ends_at || sub.current_period_end;
    const due = endDate ? formatDayMonth(endDate) : null;

    setCongratsTitle("🎉 Assinatura confirmada!");
    setCongratsText(
      `Você assinou a melhor plataforma de gestão.\n` +
      (sub.plan_id === "vitalicio"
        ? `Seu acesso é vitalício (sem renovações).`
        : `Seu plano renova sempre no mesmo dia. Próximo vencimento: ${due}.`)
    );
    setGoalCongratsOpen(true);
  }, [userId, state.subscription]);

  const txSorted = useMemo(() => {
    const sorted = [...state.transactions].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    return computeRunningBalance(sorted, state.company.startBalance);
  }, [state.transactions, state.company.startBalance]);

  const balance =
    txSorted.slice(-1)[0]?.runningBalance ?? state.company.startBalance ?? 0;

  useEffect(() => {
    if (!userId) return;
    const items = getExpiringProducts(state.products || []);
    setExpiringNow(items);
    if (route !== "dashboard") return;
    if (items.length === 0) return;
    const key = `expiry_alert_seen_${todayISO()}`;
    if (localStorage.getItem(key)) return;
    setExpiryOpen(true);
    localStorage.setItem(key, "1");
  }, [userId, route, state.products]);

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

  const requestUnhide = () => {
    const saved = normalizePass(state.auth.user?.privacyPass);
    if (!saved) {
      setHidden(false);
      notify(
        "Valores liberados",
        "Crie uma senha em Configurações se quiser.",
        "brand"
      );
      return;
    }
    setUnlockPass("");
    setUnlockOpen(true);
  };

  const confirmUnhide = () => {
    const saved = normalizePass(state.auth.user?.privacyPass);
    if (!saved) {
      setHidden(false);
      setUnlockOpen(false);
      localStorage.removeItem(`privacy_enabled_${userId}`);
      return;
    }
    if (normalizePass(unlockPass) !== saved) {
      notify("Senha incorreta", "Tente novamente.", "danger");
      return;
    }
    setHidden(false);
    setUnlockOpen(false);
    localStorage.removeItem(`privacy_enabled_${userId}`);
    notify("Valores liberados", "Modo privacidade desativado.", "success");
  };

  const navigate = (next) => {
    setRoute(next);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setState(seedData());
    setHidden(false);
    setRoute("auth");
  };

  useEffect(() => {
    if (session && route === "auth") setRoute("dashboard");
  }, [session, route]);

  if (route === "auth_callback") {
    return <AuthCallback />;
  }
  return (
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 transition-colors dark:bg-black dark:text-zinc-100">
        <AnimatePresence>
          <ToastContainer toast={toast} onClose={() => setToast(null)} />
        </AnimatePresence>

        {!session ? (
          <AuthPage onLogin={handleLoginSubmit} />
        ) : (
          <div className="mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
            <DashboardHeader
              user={state.auth.user}
              achievements={state.achievements}
              dark={dark}
              setDark={setDark}
              onLogout={handleLogout}
              hidden={hidden}
              subscriptionSummary={subscriptionSummary}
              onToggleHidden={() => {
                const saved = normalizePass(state.auth.user?.privacyPass);
                const key = `privacy_enabled_${userId}`;
                if (!hidden) {
                  setHidden(true);
                  localStorage.setItem(key, "1");
                  return;
                }
                if (!saved) {
                  setHidden(false);
                  localStorage.removeItem(key);
                  return;
                }
                setUnlockPass("");
                setUnlockOpen(true);
              }}
            />

            <AnimatePresence>
              {unlockOpen && (
                <ModalShell
                  title="Liberar valores"
                  subtitle="Digite sua senha de privacidade"
                  onClose={() => setUnlockOpen(false)}
                  footer={
                    <div className="flex items-center justify-between">
                      <SoftButton onClick={() => setUnlockOpen(false)}>
                        Cancelar
                      </SoftButton>
                      <PrimaryButton tone="success" onClick={confirmUnhide}>
                        Liberar
                      </PrimaryButton>
                    </div>
                  }
                >
                  <Input
                    autoFocus
                    label="Senha"
                    type="password"
                    value={unlockPass}
                    onChange={setUnlockPass}
                    onKeyDown={(e) => e.key === "Enter" && confirmUnhide()}
                  />
                </ModalShell>
              )}

              {expiryOpen && (
                <ExpiryAlertModal
                  items={expiringNow}
                  onClose={() => setExpiryOpen(false)}
                  onGoProducts={() => {
                    setExpiryOpen(false);
                    setRoute("products");
                  }}
                />
              )}

              {goalCongratsOpen && (
                <motion.div
                  className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setGoalCongratsOpen(false);
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.92, y: 12, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.92, y: 12, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    className="w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl dark:border-emerald-900/40 dark:bg-zinc-950"
                  >
                    <div className="p-6">
                      <div className="text-lg font-extrabold">
                        {congratsTitle}
                      </div>
                      <div className="mt-2 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                        {congratsText}
                      </div>
                      <div className="mt-5 flex justify-end">
                        <PrimaryButton
                          tone="success"
                          onClick={() => setGoalCongratsOpen(false)}
                        >
                          Fechar
                        </PrimaryButton>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6">
              <SmartNudge
                {...currentNudge}
                onAction={() => setRoute(currentNudge.route)}
              />
            </div>

            {route === "pos" ? (
              <POSNavigation active={posModal} onOpen={setPosModal} />
            ) : (
              <Navigation route={route} setRoute={navigate} />
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
                      sales={state.sales || []}
                      onAction={setRoute}
                      expiringCount={expiringNow.length}
                      onOpenExpiry={() => setExpiryOpen(true)}
                      hidden={hidden}
                      subscriptionSummary={subscriptionSummary}
                      billingNotice={billingNotice}
                    />
                  )}

                  {route === "transactions" && (
                    <TransactionsView
                      tx={state.transactions}
                      sales={state.sales || []}
                      hidden={hidden}
                      onUpdate={async (newTx) => {
                        if (!requireEntitled()) return;

                        // 1) Otimista no estado (append apenas)
                        setState((s) => ({
                          ...s,
                          transactions: [...(s.transactions || []), newTx],
                          achievements: applyXp(s.achievements, 10),
                        }));

                        // 2) Persiste no histórico (INSERT)
                        if (userId) {
                          try {
                            const saved = await insertTransaction(userId, newTx);

                            // Atualiza ID real do Supabase
                            setState((s) => ({
                              ...s,
                              transactions: (s.transactions || []).map((t) =>
                                t.id === newTx.id ? { ...t, ...saved } : t
                              ),
                            }));

                            notify("Caixa Atualizado", "Salvo no histórico ✅", "success");
                          } catch (e) {
                            console.error(e);
                            notify("Erro Supabase", e?.message || "Falha ao salvar", "danger");
                          }
                        } else {
                          notify("Caixa Atualizado", "Modo local (+10 XP)", "success");
                        }
                      }}
                    />
                  )}

                  {route === "products" && (
                    <ProductsView
                      products={state.products}
                      onUpdate={async (next) => {
                        if (!requireEntitled()) return;

                        const currentProducts = state.products || [];
                        const nextProducts =
                          typeof next === "function"
                            ? next(currentProducts)
                            : next;

                        // Otimista
                        setState((s) => ({ ...s, products: nextProducts }));

                        if (userId) {
                          try {
                            // Salva todos (upsert) para garantir sincronia
                            await Promise.all(
                              nextProducts.map((p) => upsertProduct(userId, p))
                            );
                            notify(
                              "Produtos Salvos",
                              "Estoque sincronizado ✅",
                              "success"
                            );
                          } catch (e) {
                            console.error(e);
                            notify(
                              "Erro Supabase",
                              e?.message || "Falha ao salvar produtos",
                              "danger"
                            );
                          }
                        } else {
                          notify(
                            "Produtos Salvos",
                            "Salvo localmente",
                            "success"
                          );
                        }
                      }}
                    />
                  )}

                  {route === "pendencias" && (
                    <PendenciasView
                      pendencias={state.pendencias || []}
                      hidden={hidden}
                      // ✅ FIX: Otimização para salvar apenas o item alterado (se fornecido)
                      onUpdate={async (next, changedItem) => {
                        if (!requireEntitled()) return;

                        // 1. Atualiza Estado Local (React)
                        let nextPendencias = null;
                        setState((s) => {
                          const current = s.pendencias || [];
                          nextPendencias =
                            typeof next === "function" ? next(current) : next;
                          return { ...s, pendencias: nextPendencias };
                        });

                        // 2. Persistência (Supabase)
                        if (userId && nextPendencias) {
                          try {
                            if (changedItem) {
                              // ✅ Smart Save: Salva apenas o item específico que mudou
                              await upsertPendencia(userId, changedItem);
                            } else {
                              // Fallback: Se não passar o item, salva tudo (para compatibilidade)
                              await Promise.all(
                                nextPendencias.map((p) =>
                                  upsertPendencia(userId, p)
                                )
                              );
                            }
                          } catch (e) {
                            console.error(e);
                            notify(
                              "Erro Supabase",
                              "Falha ao salvar pendências",
                              "danger"
                            );
                          }
                        }
                      }}
                      // ✅ ADICIONE ISSO AQUI: Lógica de exclusão
                      onDelete={async (clientId) => {
                        if (!requireEntitled()) return;

                        // 1. Otimista: Remove da tela imediatamente
                        setState((s) => ({
                          ...s,
                          pendencias: (s.pendencias || []).filter((p) => p.id !== clientId),
                        }));

                        // 2. Banco de Dados: Apaga no Supabase
                        if (userId) {
                          try {
                            await deletePendencia(clientId);
                            notify("Cliente removido", "Excluído com sucesso.", "success");
                          } catch (e) {
                            console.error(e);
                            notify("Erro", "Falha ao excluir cliente.", "danger");
                            // Opcional: Recarregar dados se falhar
                          }
                        }
                      }}
                    />
                  )}

                  {route === "reports" && (
                    <ReportsView
                      tx={state.transactions}
                      txSorted={txSorted}
                      // ✅ FIX REPORTS: Removemos o filtro de status para que pendências sejam calculadas
                      sales={state.sales || []}
                      products={state.products}
                      hidden={hidden}
                    />
                  )}

                  {route === "projection" && (
                    <ProjectionView
                      tx={state.transactions}
                      startBalance={state.company?.startBalance ?? 0}
                      hidden={hidden}
                    />
                  )}

                  {route === "goal" && (
                    <GoalView
                      tx={state.transactions}
                      state={state}
                      setState={setState}
                      hidden={hidden}
                      onRequestUnhide={requestUnhide}
                      notify={notify}
                      // ✅ [NOVO] Handler para salvar meta
                      onSaveGoal={async (nextGoal) => {
                        if (!requireEntitled()) return;

                        // 1) Otimista: atualiza estado local
                        setState((s) => ({ ...s, goal: nextGoal }));

                        // 2) Persiste no banco
                        if (userId) {
                          try {
                            const saved = await upsertGoal(userId, nextGoal);
                            setState((s) => ({ ...s, goal: saved }));
                            notify("Meta salva ✅", "Meta ativa e sincronizada.", "success");
                          } catch (e) {
                            console.error(e);
                            notify("Erro", "Falha ao salvar meta no Supabase.", "danger");
                          }
                        }
                      }}
                    />
                  )}

                  {route === "sales" && (
                    <SalesView
                      sales={state.sales}
                      onStart={() => setRoute("pos")}
                      hidden={hidden}
                    />
                  )}

                  {route === "pos" && (
                    <POSView
                      products={state.products}
                      pendencias={state.pendencias || []}
                      posModal={posModal}
                      setPosModal={setPosModal}
                      onBack={() => {
                        setPosModal(null);
                        setRoute("sales");
                      }}
                        
                      // ✅ FIX C: onAddPendencia (Venda Pendente) - CORRIGIDO
                      onAddPendencia={async (clientId, purchase, meta) => {
                        if (!requireEntitled()) return;

                        // Trava de segurança
                        const purchaseKey = purchase?._dedupeKey || purchase?.id || uid();
                        const lockKey = `${clientId}::${purchaseKey}`;
                        if (pendenciaLocksRef.current.has(lockKey)) return;
                        pendenciaLocksRef.current.add(lockKey);

                        try {
                            // 1. Validações e Preparação de Dados (ANTES DO SETSTATE)
                            const currentPendencias = state.pendencias || [];
                            const clientIndex = currentPendencias.findIndex(c => c.id === clientId);

                            if (clientIndex === -1) {
                            notify("Cliente não encontrado", "Cadastre o cliente antes.", "danger");
                            return; 
                            }

                            const now = new Date();
                            const paidAtSale = Number(purchase?.paidAtSale || 0);
                            const itemsList = purchase?.items || []; 

                            // Cria o objeto da venda
                            const pendingSale = {
                                id: uid(),
                                date: purchase?.date || todayISO(),
                                time: purchase?.time || now.toLocaleTimeString().slice(0, 5),
                                code: purchase?.code || `V${now.getTime().toString().slice(-6)}`,
                                items: itemsList.map(i => ({...i})),
                                itemsCount: itemsList.reduce((s, it) => s + Math.abs(Number(it.qty || 0)), 0),
                                total: Number(purchase?.total || 0),
                                payments: Array.isArray(purchase?.paymentsAtSale) ? purchase.paymentsAtSale : [],
                                paidAtSale,
                                pendingAtSale: Number(purchase?.pendingAtSale ?? 0) || Math.max(0, Number(purchase?.total || 0) - paidAtSale),
                                payment: paidAtSale > 0 ? `Parcial (${purchase?.paidMethodAtSale || "—"})` : "PENDÊNCIA",
                                status: "pending",
                                clientId: clientId,
                                createdAt: purchase?.createdAt || new Date().toISOString(),
                            };

                            // ✅ CORREÇÃO CRÍTICA: Prepara o Cliente Atualizado AQUI FORA
                            // Pegamos o cliente do estado atual
                            const originalClient = currentPendencias[clientIndex];
                            const existingPurchases = Array.isArray(originalClient.purchases) ? originalClient.purchases : [];
                            
                            // Criamos o novo objeto do cliente com a venda adicionada
                            const updatedClient = {
                                ...originalClient,
                                purchases: [pendingSale, ...existingPurchases],
                                updatedAt: new Date().toISOString()
                            };

                            // 2. Prepara atualização de Estoque (Cálculo)
                            const prods = [...(state.products || [])];
                            const qtyById = new Map();
                            for (const item of itemsList) {
                            if (!item.productId) continue;
                            qtyById.set(item.productId, (qtyById.get(item.productId) || 0) + Number(item.qty || 0));
                            }
                            const updatedProducts = prods.map((p) => {
                            const delta = qtyById.get(p.id) || 0;
                            if (!delta || p.type === "service") return p;
                            return { ...p, stock: Math.max(0, Number(p.stock || 0) - delta) };
                            });


                            // 3. Atualização Visual (Otimista)
                            setState((s) => {
                            const newPendenciasList = [...(s.pendencias || [])];
                            
                            // Atualiza apenas o cliente específico na lista
                            newPendenciasList[clientIndex] = updatedClient;

                            const nextSales = [{ ...pendingSale, clientId }, ...(s.sales || [])];

                            return {
                                ...s,
                                products: updatedProducts,
                                pendencias: newPendenciasList,
                                sales: nextSales
                            };
                            });

                            // 4. Persistência no Supabase
                            // Agora 'updatedClient' existe com certeza, pois foi criado no passo 1
                            if (userId) {
                            try {
                                console.log("Iniciando salvamento...", pendingSale.code); // Log para debug

                                // PASSO 1: Salvar Cliente (Atualiza lista de compras do cliente)
                                await upsertPendencia(userId, updatedClient);

                                // PASSO 2: Salvar a Venda na tabela 'sales'
                                await insertSale(userId, pendingSale);
                                
                                // PASSO 3: Atualiza Estoque no Banco
                                await Promise.all((updatedProducts || []).map(p => upsertProduct(userId, p)));

                                notify("Pendência Registrada", `Venda ${pendingSale.code} salva!`, "success");
                            } catch (dbError) {
                                console.error("Erro ao salvar no banco:", dbError);
                                notify("Erro de Salvamento", "Verifique sua conexão.", "danger");
                            }
                            } else {
                            // Se cair aqui, é porque realmente não tem userId (usuário deslogado)
                            notify("Aviso", "Usuário não identificado. Recarregue a página.", "warning");
                            }

                            setPosModal(null);

                        } catch (e) {
                            console.error(e);
                            notify("Erro Crítico", "Falha ao processar venda.", "danger");
                        } finally {
                            pendenciaLocksRef.current.delete(lockKey);
                        }
                        }}

                      // ✅ FIX B: onFinishSale (Venda Paga) - INSERT ONLY
                      onFinishSale={async (sale, paymentMethod) => {
                        if (!requireEntitled()) return;

                        let updatedProducts, finalSale, txVenda;

                        // Prepara dados
                        finalSale = { ...sale, status: "paid" };
                          
                        txVenda = {
                            id: uid(),
                            date: todayISO(),
                            kind: "in",
                            category: "sale_cash",
                            description: `Venda (${sale.code})`,
                            amount: sale.total,
                            method: paymentMethod,
                        };

                        // Otimista
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
                          updatedProducts = prods.map((p) => {
                            const delta = qtyById.get(p.id) || 0;
                            const current = Number(p.stock ?? 0);
                            if (p.type === "service") return p;
                            return {
                              ...p,
                              stock: Math.max(0, current - delta),
                            };
                          });

                          return {
                            ...s,
                            products: updatedProducts,
                            sales: [finalSale, ...(s.sales || [])],
                            transactions: [...(s.transactions || []), txVenda],
                          };
                        });

                        if (userId) {
                          try {
                            // 1) Salva venda (HISTÓRICO)
                            const savedSale = await insertSale(userId, finalSale);

                            // 2) Salva movimento de caixa (HISTÓRICO)
                            const savedTx = await insertTransaction(userId, txVenda);

                            // 3) Atualiza estoque (CADASTRO)
                            // Filtrar apenas o que mudou seria ideal, mas enviamos tudo para garantir.
                            const prodsToSave = (updatedProducts || []).filter(Boolean);
                            await Promise.all(prodsToSave.map(p => upsertProduct(userId, p)));

                            notify(
                              "Venda Realizada",
                              "Salvo no histórico ✅",
                              "success"
                            );

                            // Atualiza IDs reais do Supabase no estado
                            setState((s) => ({
                              ...s,
                              sales: (s.sales || []).map((x) => (x.id === sale.id ? { ...x, ...savedSale } : x)),
                              transactions: (s.transactions || []).map((x) => (x.id === txVenda.id ? { ...x, ...savedTx } : x)),
                            }));

                          } catch (e) {
                            console.error(e);
                            notify(
                              "Erro Supabase",
                              e?.message || "Falha ao salvar venda",
                              "danger"
                            );
                          }
                        } else {
                          notify(
                            "Venda Realizada",
                            `Código ${sale.code} registrado!`,
                            "success"
                          );
                        }
                        setPosModal(null);
                        setRoute("sales");
                      }}
                    />
                  )}

                  {route === "plans" && (
                    <PlansView
                      currentPlanId={state.auth?.user?.planId || null}
                      onChoosePlan={async (plan) => {
                        try {
                          const { data } = await supabase.auth.getSession();
                          const token = data?.session?.access_token;
                          if (!token) {
                            notify(
                              "Erro",
                              "Você precisa estar logado.",
                              "danger"
                            );
                            return;
                          }

                          notify(
                            "Redirecionando...",
                            "Abrindo checkout do Mercado Pago",
                            "brand"
                          );

                          // ✅ USANDO apiUrl PARA PATH RELATIVO EM PROD
                          const r = await fetch(
                            apiUrl("/api/checkout/create-preference"), 
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ planId: plan.id }),
                            }
                          );

                          const text = await r.text();
                          let json = {};
                          try {
                            json = JSON.parse(text);
                          } catch {}

                          if (!r.ok) {
                            throw new Error(
                              json?.error || text || "Falha no checkout"
                            );
                          }

                          if (json.init_point) {
                            window.location.href = json.init_point;
                          } else {
                            throw new Error("Link de pagamento não gerado");
                          }
                        } catch (e) {
                          console.error(e);
                          notify(
                            "Erro no Checkout",
                            e.message || "Tente novamente",
                            "danger"
                          );
                        }
                      }}
                    />
                  )}

                  {route === "profile" && (
                    <ProfileView
                      company={state.company}
                      user={state.auth.user}
                      transactions={state.transactions || []}
                      products={state.products || []}
                      pendencias={state.pendencias || []}
                      sales={state.sales || []}
                      goal={state.goal || {}}
                      achievements={state.achievements || {}}
                      onSave={async (c, u) => {
                        setState((s) => ({
                          ...s,
                          company: c,
                          auth: { ...s.auth, user: { ...s.auth.user, ...u } },
                        }));
                        if (userId) {
                          await saveCompany(userId, c);
                          await saveProfile(userId, {
                            name: u.name,
                            company_name: u.companyName,
                            privacy_pass: u.privacyPass,
                          });
                        }
                        notify(
                          "Configurações Salvas",
                          "Dados sincronizados.",
                          "success"
                        );
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
  // COMPONENTES DEFINIDOS INLINE
  // -----------------------------

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

  function Navigation({ route, setRoute }) {
    const navs = [
      { key: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
      { key: "sales", label: "Vendas", icon: Receipt },
      { key: "transactions", label: "Movimentos", icon: Wallet },
      { key: "pendencias", label: "Pendências", icon: ShoppingBag },
      { key: "reports", label: "Relatórios", icon: BarChart3 },
      { key: "projection", label: "Futuro", icon: TrendingUp },
      { key: "goal", label: "Meta", icon: Target },
      { key: "products", label: "Produtos", icon: Package },
      { key: "plans", label: "Planos", icon: Crown },
      { key: "profile", label: "Config", icon: Building2 },
    ];
    return (
      <nav className="no-scrollbar mt-6 flex overflow-x-auto border-b border-zinc-200 pb-1 dark:border-zinc-800">
        {navs.map((n) => {
          const active = route === n.key;
          const Icon = n.icon;
          return (
            <button
              key={n.key}
              onClick={() => setRoute(n.key)}
              className={cx(
                "flex min-w-[100px] flex-1 flex-col items-center gap-1 border-b-2 px-4 py-3 text-xs font-medium transition-colors sm:flex-row sm:justify-center sm:text-sm",
                active
                  ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              <Icon
                className={cx(
                  "mb-1 h-5 w-5 sm:mb-0",
                  active && "fill-current opacity-20"
                )}
              />
              {n.label}
            </button>
          );
        })}
      </nav>
    );
  }

  // ✅ 3.1 Atualizado com billingNotice (Banner)
  function DashboardView({
    balance,
    txSorted,
    sales = [],
    onAction,
    hidden,
    expiringCount = 0,
    onOpenExpiry,
    subscriptionSummary,
    billingNotice,
  }) {
    const moneyOrHidden = (v) => (hidden ? "••••" : formatBRL(v));

    const data = useMemo(() => {
      const last30 = txSorted.filter(
        (t) => t.date >= addDaysISO(todayISO(), -30)
      );
      const grouped = {};
      last30.forEach((t) => {
        grouped[t.date] = t.runningBalance;
      });
      return Object.keys(grouped).map((date) => ({
        date: date.slice(5),
        saldo: grouped[date],
      }));
    }, [txSorted]);

    const resumo = useMemo(() => {
      const now = new Date();
      const mesAtual = now.toISOString().slice(0, 7);
      const mesPassado = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .slice(0, 7);
      const atual = txSorted.filter((t) => t.date.startsWith(mesAtual));
      const anterior = txSorted.filter((t) => t.date.startsWith(mesPassado));
      const entradasAtual = atual
        .filter((t) => t.kind === "in")
        .reduce((s, t) => s + t.amount, 0);
      const saidasAtual = atual
        .filter((t) => t.kind === "out")
        .reduce((s, t) => s + t.amount, 0);
      const saldoAtual = entradasAtual - saidasAtual;
      const entradasAnterior = anterior
        .filter((t) => t.kind === "in")
        .reduce((s, t) => s + t.amount, 0);
      const variacao =
        entradasAnterior > 0
          ? ((entradasAtual - entradasAnterior) / entradasAnterior) * 100
          : 0;
      return { entradasAtual, saidasAtual, saldoAtual, variacao };
    }, [txSorted]);

    const salesKpisDash = useMemo(() => {
      const t = todayISO();
      const inRange = (d, a, b) => d >= a && d <= b;

      const now = parseISOToLocalDate(t);
      const startOfWeek = (() => {
        const d = new Date(now);
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1;
        d.setDate(d.getDate() - diff);
        return toISODateLocal(d);
      })();

      const startOfMonth = toISODateLocal(
        new Date(now.getFullYear(), now.getMonth(), 1)
      );

      const paid = (sales || []).filter((s) => s.status !== "pending");

      const dayTotal = paid
        .filter((s) => s.date === t)
        .reduce((a, s) => a + (s.total || 0), 0);
      const weekTotal = paid
        .filter((s) => inRange(s.date, startOfWeek, t))
        .reduce((a, s) => a + (s.total || 0), 0);
      const monthTotal = paid
        .filter((s) => inRange(s.date, startOfMonth, t))
        .reduce((a, s) => a + (s.total || 0), 0);

      return { dayTotal, weekTotal, monthTotal };
    }, [sales]);

    return (
      <div className="grid gap-6">
        {/* ✅ Banner de Assinatura */}
        {billingNotice && (
          <Card
            className={cx(
              "border",
              billingNotice.tone === "danger" &&
                "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20",
              billingNotice.tone === "warning" &&
                "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20",
              billingNotice.tone === "success" &&
                "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
              billingNotice.tone === "neutral" &&
                "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            )}
          >
            <div className="font-extrabold">{billingNotice.title}</div>
            <div className="mt-1 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-300">
              {billingNotice.desc}
            </div>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white dark:from-blue-950 dark:to-zinc-900 md:col-span-2">
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                    <Wallet className="h-4 w-4" /> Saldo Real Hoje
                  </div>
                </div>

                <div className="mt-2 text-4xl font-extrabold tracking-tight text-white">
                  {moneyOrHidden(balance)}
                </div>
                <div className="mt-2 text-sm text-zinc-400">
                  Disponível para uso imediato.
                </div>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <PrimaryButton
                  onClick={() => onAction("transactions")}
                  tone="brand"
                  className="border-0 bg-white text-zinc-900 shadow-none hover:bg-zinc-100"
                >
                  <Plus className="h-4 w-4" /> Registrar Movimento
                </PrimaryButton>
                <button
                  onClick={() => onAction("projection")}
                  className="px-4 py-2 text-sm font-semibold text-white/80 hover:text-white"
                >
                  Ver Futuro →
                </button>

                {expiringCount > 0 && (
                  <button
                    onClick={onOpenExpiry}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-amber-900/20 hover:bg-amber-400"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Validade: {expiringCount}
                  </button>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-zinc-700 dark:text-zinc-300">
                  Resumo Rápido
                </h3>
                <Badge tone={resumo.variacao >= 0 ? "success" : "danger"}>
                  {resumo.variacao >= 0 ? "+" : ""}
                  {resumo.variacao.toFixed(1)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Entradas</span>
                  <span className="font-semibold text-emerald-600">
                    {moneyOrHidden(resumo.entradasAtual)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Saídas</span>
                  <span className="font-semibold text-rose-600">
                    {moneyOrHidden(resumo.saidasAtual)}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-xs text-zinc-500">Vendas do Dia</div>
              <div className="text-xl font-extrabold text-emerald-600">
                {moneyOrHidden(salesKpisDash.dayTotal)}
              </div>
              <div className="text-xs text-zinc-400">somente recebidas</div>
            </Card>

            <Card>
              <div className="text-xs text-zinc-500">Vendas da Semana</div>
              <div className="text-xl font-extrabold text-blue-600">
                {moneyOrHidden(salesKpisDash.weekTotal)}
              </div>
              <div className="text-xs text-zinc-400">somente recebidas</div>
            </Card>

            <Card>
              <div className="text-xs text-zinc-500">Vendas do Mês</div>
              <div className="text-xl font-extrabold text-indigo-500">
                {moneyOrHidden(salesKpisDash.monthTotal)}
              </div>
              <div className="text-xs text-zinc-400">somente recebidas</div>
            </Card>
          </div>
        </div>

        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Evolução do Caixa</h3>
              <p className="text-sm text-zinc-500">
                Como seu dinheiro se comportou nos últimos 30 dias.
              </p>
            </div>
            <SoftButton icon={Filter}>Filtrar</SoftButton>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e4e4e7"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#71717a" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#71717a" }}
                  tickFormatter={(v) => (hidden ? "•" : v)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(v) => moneyOrHidden(v)}
                />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSaldo)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  }

  // ✅ FIX A: TransactionsView atualizado para enviar apenas newTx
  function TransactionsView({ tx, sales, onUpdate, hidden }) {
    const moneyOrHidden = (v) => (hidden ? "••••" : formatBRL(v));
    const [modalOpen, setModalOpen] = useState(false);
    const [type, setType] = useState("out");
    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");
    const [cat, setCat] = useState("variable");
    const [date, setDate] = useState(todayISO());

    const pendingSales = useMemo(
      () => (sales || []).filter((s) => s.status === "pending"),
      [sales]
    );

    const handleSubmit = () => {
      const val = Math.abs(parseNumber(amount));
      if (!val || !desc) return;
      const newTx = {
        id: uid(),
        date,
        kind: type,
        category: cat,
        description: desc,
        amount: val,
        method: "Manual",
      };
        
      // ✅ Envia APENAS o novo movimento, não o array todo
      onUpdate(newTx);
        
      setModalOpen(false);
      setAmount("");
      setDesc("");
    };
    const categories = type === "in" ? ENTRY_TYPES : EXIT_CATEGORIES;
    const sortedTx = [...tx].sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="grid gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Livro Diário</h2>
            <p className="text-sm text-zinc-500">
              Registro fiel de cada centavo que entra e sai.
            </p>
          </div>
          <PrimaryButton icon={Plus} onClick={() => setModalOpen(true)}>
            Registrar Movimento
          </PrimaryButton>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-6 py-4 text-center">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedTx.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500">
                      <p className="mb-2 text-lg">Nada por aqui ainda.</p>
                      <p className="text-xs">
                        Comece registrando o saldo inicial ou uma venda.
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedTx.map((t) => (
                    <tr
                      key={t.id}
                      className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <td className="px-6 py-4 text-zinc-500">{t.date}</td>
                      <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                        {t.description}
                      </td>
                      <td className="px-6 py-4 text-zinc-500">
                        {labelForCategory(t.category)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {moneyOrHidden(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge tone={t.kind === "in" ? "success" : "neutral"}>
                          {t.kind === "in" ? "Entrada" : "Saída"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800">
            <div className="font-bold">Vendas em Pendência</div>
            <Badge tone={pendingSales.length ? "warning" : "success"}>
              {pendingSales.length
                ? `${pendingSales.length} pendente(s)`
                : "Tudo certo"}
            </Badge>
          </div>

          {pendingSales.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-zinc-500">
              Nenhuma venda pendente registrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-950">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Código</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pendingSales.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <td className="px-6 py-3 text-zinc-500">
                        {s.date} {s.time || ""}
                      </td>
                      <td className="px-6 py-3 font-medium">{s.code}</td>
                      <td className="px-6 py-3">
                        <Badge tone="warning">PENDENTE</Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-bold">
                        {moneyOrHidden(s.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <AnimatePresence>
          {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-950"
              >
                <div className="border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800">
                  <h3 className="text-lg font-bold">Novo Registro</h3>
                  <p className="text-xs text-zinc-500">
                    Mantenha seu caixa atualizado diariamente.
                  </p>
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
                    <button
                      onClick={() => setType("in")}
                      className={cx(
                        "flex-1 rounded-lg py-2 text-sm font-bold transition-all",
                        type === "in"
                          ? "bg-white text-emerald-600 shadow-sm dark:bg-zinc-800"
                          : "text-zinc-500"
                      )}
                    >
                      Entrada (Receita)
                    </button>
                    <button
                      onClick={() => setType("out")}
                      className={cx(
                        "flex-1 rounded-lg py-2 text-sm font-bold transition-all",
                        type === "out"
                          ? "bg-white text-rose-600 shadow-sm dark:bg-zinc-800"
                          : "text-zinc-500"
                      )}
                    >
                      Saída (Despesa)
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Valor"
                      placeholder="0,00"
                      value={amount}
                      onChange={setAmount}
                    />
                    <Input
                      label="Data"
                      type="date"
                      value={date}
                      onChange={setDate}
                    />
                  </div>
                  <Input
                    label="Descrição"
                    placeholder={
                      type === "in" ? "Ex: Venda Balcão" : "Ex: Conta de Luz"
                    }
                    value={desc}
                    onChange={setDesc}
                  />
                  <Select
                    label="Categoria"
                    value={cat}
                    onChange={setCat}
                    options={categories.map((c) => ({
                      value: c.key,
                      label: c.label,
                    }))}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-sm font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    Cancelar
                  </button>
                  <PrimaryButton
                    onClick={handleSubmit}
                    tone={type === "in" ? "success" : "danger"}
                  >
                    Confirmar {type === "in" ? "Entrada" : "Saída"}
                  </PrimaryButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ✅ Alerta de Validade
  function ExpiryAlertModal({ items, onClose, onGoProducts }) {
    const label = (d) => {
      if (d === 0) return "Vence hoje";
      if (d === 1) return "Vence amanhã";
      if (d === 5) return "Faltam 5 dias";
      if (d < 0) return `Vencido há ${Math.abs(d)} dia(s)`;
      return `Faltam ${d} dia(s)`;
    };

    const tone = (d) => {
      if (d < 0) return "danger";
      if (d <= 1) return "danger";
      return "warning"; // 5 dias
    };

    return (
      <ModalShell title="⚠️ Alerta de validade" onClose={onClose} wide>
        {!items || items.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-500">
            Nenhum produto com alerta de validade.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Produtos com aviso em <b>5 dias</b>, <b>1 dia</b>, <b>vence hoje</b>{" "}
              e <b>vencidos</b>.
            </div>

            <div className="max-h-[360px] overflow-auto rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-xs text-zinc-500">
                        Validade: {p.expiryDate}{" "}
                        {p.code ? `· Código: ${p.code}` : ""}
                      </div>
                    </div>
                    <Badge tone={tone(p.daysLeft)}>{label(p.daysLeft)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <SoftButton onClick={onClose}>Fechar</SoftButton>
          <PrimaryButton onClick={onGoProducts}>Ir para Produtos</PrimaryButton>
        </div>
      </ModalShell>
    );
  }

  // -----------------------------
  // TOAST
  // -----------------------------
  function ToastContainer({ toast, onClose }) {
    useEffect(() => {
      if (!toast) return;
      const t = setTimeout(() => onClose?.(), 3500);
      return () => clearTimeout(t);
    }, [toast, onClose]);

    if (!toast) return null;

    const toneStyle = {
      success:
        "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
      danger:
        "border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
      warning:
        "border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
      brand:
        "border-blue-500/30 bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
      neutral:
        "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
    };

    const cls = toneStyle[toast.tone] || toneStyle.neutral;

    return (
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        className="fixed right-4 top-4 z-[9999] w-[calc(100%-2rem)] max-w-sm"
      >
        <div className={`rounded-2xl border p-4 shadow-xl ${cls}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold">{toast.title}</div>
              {toast.desc ? (
                <div className="mt-1 text-xs opacity-80">{toast.desc}</div>
              ) : null}
            </div>

            <button
              onClick={onClose}
              className="rounded-xl px-2 py-1 text-xs font-bold opacity-70 hover:opacity-100"
              aria-label="Fechar"
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>
      </motion.div>
    );
  }