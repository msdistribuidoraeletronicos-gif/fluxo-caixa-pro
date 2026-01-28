// src/pages/GoalView.jsx
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Sparkles,
  BadgeCheck,
} from "lucide-react";

import {
  Card,
  Badge,
  PrimaryButton,
  SoftButton,
  Input,
  Select,
  cx,
} from "../shared/ui";

// -----------------------------
// Helpers
// -----------------------------
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

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// -----------------------------
// Frases de efeito
// -----------------------------
const PHRASES_150 = [
  "Se o total assusta, transforme em pequenas metas diárias e tudo fica leve.",
  "Grandes metas são só somas de pequenas vitórias bem repetidas.",
  "Hoje não precisa bater tudo. Precisa bater o necessário de hoje.",
  "Quando você divide a meta por dia, ela vira um plano, não um sonho.",
  "A meta é grande; o passo de hoje é pequeno. Faça o passo.",
  "O que parece difícil no mês, fica fácil quando vira rotina diária.",
  "Foque no processo: a meta vira consequência.",
  "Uma meta por dia é um sistema. Um sistema sempre vence a força.",
  "O segredo é constância, não ansiedade.",
  "Meta grande não é pesada: pesado é não ter direção.",
  "Se você fizer o mínimo bem feito todo dia, o máximo chega sozinho.",
  "Não é sorte: é repetição com intenção.",
  "O mês é longo, mas o dia é simples. Ganhe o dia.",
  "Quem vence o dia, vence o mês.",
  "Metas assustam quando estão sem plano. Hoje você tem plano.",
  "A clareza reduz o medo. Divida e conquiste.",
  "O impossível some quando você calcula o possível por dia.",
  "Faça pouco, mas faça todo dia.",
  "A meta não pede perfeição. Pede presença diária.",
  "Um dia de cada vez: o caixa agradece.",
  "Disciplina diária transforma qualquer meta em inevitável.",
  "Você não bate meta com pressa; bate com método.",
  "Quando o plano cabe no dia, ele cabe na vida.",
  "Você não precisa fazer muito. Precisa fazer sempre.",
  "Quanto menor a tarefa, maior a chance de cumprir.",
  "Dividir é dominar.",
  "A meta vira simples quando você mede e ajusta.",
  "Se o alvo está claro, o caminho aparece.",
  "A meta não é inimiga. Ela é sua bússola.",
  "O que te falta não é motivação: é um número diário.",
  "Meta no papel + ação diária = tranquilidade.",
  "O progresso gosta de repetição.",
  "Sem drama: hoje é só cumprir o combinado.",
  "O resultado é filho do ritmo.",
  "A constância é mais forte que qualquer pico de esforço.",
  "De pouco em pouco, o caixa vira gigante.",
  "Você não precisa de um milagre. Precisa de um hábito.",
  "Meta grande, passos pequenos, mente leve.",
  "Hoje é sobre fazer o certo, não fazer tudo.",
  "Trabalhe o dia. O mês cuida de si.",
  "A meta é o destino; a rotina é o veículo.",
  "Quando você calcula, você controla.",
  "Se você consegue um pouco por dia, você consegue tudo no fim.",
  "A meta é uma escada: suba um degrau por vez.",
  "Uma venda a mais por dia muda o mês inteiro.",
  "Reduzir um custo por dia também bate meta.",
  "Lucro diário é liberdade mensal.",
  "Venda com margem, não com ansiedade.",
  "Meta diária bem definida reduz decisões ruins.",
  "Hoje você não precisa correr: precisa andar na direção certa.",
  "Quem ajusta diariamente, não sofre no fim.",
  "A meta vira fácil quando você troca ‘mês’ por ‘hoje’.",
  "Você ganha o jogo quando joga o dia certo, todo dia.",
  "Se o número parece alto, é porque ainda não virou rotina.",
  "Meta sem acompanhamento vira frustração. Aqui vira evolução.",
  "O que mede, melhora.",
  "Menos improviso, mais previsibilidade.",
  "A sua meta não é um peso: é um norte.",
  "Um plano simples todo dia vence qualquer plano perfeito nunca feito.",
  "Hoje é dia de consistência.",
  "Meta diária é o antídoto da procrastinação.",
  "Você não precisa sentir vontade. Precisa cumprir.",
  "Vendas com margem constroem paz.",
  "Uma pequena melhoria diária é uma revolução silenciosa.",
  "A meta não te pressiona; ela te organiza.",
  "Quando o foco é diário, o resultado vira inevitável.",
  "O segredo do lucro é repetição com controle.",
  "Faça o básico com excelência e a meta vira detalhe.",
  "A meta te mostra o caminho; o hábito te leva até lá.",
  "A ansiedade enxerga o todo; a disciplina enxerga o hoje.",
  "Se o mês parece distante, aproxime com ações diárias.",
  "Meta diária é uma conversa honesta com a realidade.",
  "Um bom gestor não adivinha: calcula e executa.",
  "O mês é uma soma. Faça a soma dar certo.",
  "A meta vira leve quando você para de carregar o futuro.",
  "Você não precisa de sorte. Precisa de padrão.",
  "Venda melhor, não apenas mais.",
  "O lucro é o aplauso do controle.",
  "O caixa melhora quando você decide com números.",
  "Meta é compromisso com o seu futuro.",
  "Pequenas metas são grandes estratégias disfarçadas.",
  "Quando você foca na margem, a meta fica mais perto.",
  "Se hoje deu certo, repita amanhã.",
  "Não busque o impossível. Busque o repetível.",
  "Meta diária é o que separa sonho de gestão.",
  "Se o total pesa, transforme em rotina. Rotina não pesa.",
  "O melhor plano é o que você consegue executar todo dia.",
  "Hoje é o dia de ser consistente.",
  "Meta diária é o seu ‘piloto automático’ financeiro.",
  "A meta é grande, mas o método é simples.",
  "Faça menos promessas, mais registros.",
  "Você só precisa ser melhor do que ontem, não perfeito.",
  "Quando você calcula, você se acalma.",
  "A meta não é corrida: é construção.",
  "Seu caixa responde ao seu ritmo.",
  "A meta diária é o degrau que você sobe sem perceber.",
  "Uma venda extra por dia é um mês diferente.",
  "Cortar um desperdício por dia é lucro que aparece.",
  "Meta diária: o pequeno esforço que muda tudo.",
  "O caminho mais curto é o consistente.",
  "Hoje você só precisa cumprir o plano do dia.",
  "Se a meta assusta, é porque o plano estava faltando.",
  "Meta é direção; ação diária é tração.",
  "A diferença entre meta e realidade é rotina.",
  "Com um pouco por dia, você chega com folga.",
  "O mês termina, mas o hábito fica. Faça o hábito vencer.",
  "Meta é matemática com disciplina.",
  "Quando você executa hoje, você agradece amanhã.",
  "Meta diária é como farol: você não se perde.",
  "A melhor estratégia é a repetível.",
  "Foco no lucro: é isso que paga a liberdade.",
  "Venda com margem, e a meta fica fácil.",
  "O caixa melhora quando você deixa de adivinhar.",
  "O que hoje é esforço, amanhã é padrão.",
  "A meta vira simples quando você transforma em rotina.",
  "Se está difícil, reduza o passo, não o objetivo.",
  "O objetivo fica grande só quando você olha sem dividir.",
  "Consistência é a forma adulta de motivação.",
  "Um plano por dia elimina o desespero do fim do mês.",
  "Você não precisa de tudo; precisa do suficiente todo dia.",
  "Lucro diário é paz de espírito.",
  "Meta diária bem feita deixa a meta do mês automática.",
  "Se você sabe o número, você sabe o que fazer.",
  "O melhor gestor é o que executa o simples diariamente.",
  "Meta grande se vence com passos pequenos e firmes.",
  "Você não está atrasado: você está organizando.",
  "Hoje é mais uma oportunidade de cumprir o combinado.",
  "Quando o plano é claro, a execução flui.",
  "A meta é um alvo; sua rotina é a flecha.",
  "Faça o que dá hoje, todos os dias, e o mês se resolve.",
  "O que você repete diariamente define seu resultado.",
  "Se você quer meta batida, construa dias batidos.",
  "Meta diária é a chave da previsibilidade.",
  "Você não precisa correr no fim se andar todo dia.",
  "A meta fica leve quando vira um hábito.",
  "A disciplina diária transforma números em realidade.",
  "O plano do dia vence a dúvida.",
  "Seu caixa não precisa de sorte. Precisa de controle.",
  "Quando você registra, você governa.",
  "Se você olhar com calma, é só algumas vendas por dia.",
  "Não é difícil: é só diário.",
  "Meta é compromisso. Rotina é respeito.",
  "Você não está sozinho: o número te guia.",
  "Se o todo parece grande, pense no ‘por dia’.",
  "A meta não é pesada: pesado é não saber o caminho.",
  "Um dia bem feito vale mais que um mês de intenção.",
  "A meta diária é o truque inteligente do gestor.",
  "A cada dia, um tijolo. No fim, a casa está pronta.",
  "Você não bate meta no susto: bate no planejamento.",
  "A meta vira inevitável quando você cria um padrão.",
  "Hoje é o dia de dar mais um passo.",
  "Não complique: execute o número diário.",
  "A meta do mês é só a soma dos seus dias.",
  "Com disciplina, a meta deixa de ser meta e vira resultado.",
  "Pequenas vitórias diárias são grandes conquistas mensais.",
  "Meta diária te dá calma; calma te dá qualidade.",
  "Vender com lucro é vender com inteligência.",
  "O lucro de hoje é o seu futuro sorrindo.",
  "Faça o simples, e o grande acontece.",
  "Quando você divide, você vence.",
  "Você só precisa de constância, não de mágica.",
  "O número diário é o atalho para o resultado.",
  "Mais controle, menos ansiedade.",
  "Meta diária é o caminho mais curto para a meta grande.",
  "Se você fizer hoje, amanhã fica mais fácil.",
  "Hoje é o seu melhor investimento.",
  "A meta é grande, mas o seu plano é maior.",
  "Se o passo é diário, a chegada é certa.",
  "O segredo é repetir o que funciona.",
  "Planejamento diário é liberdade no fim do mês.",
  "Meta batida é rotina bem feita.",
  "Você não precisa de motivação: precisa de método.",
  "O que hoje parece difícil, amanhã vira normal.",
  "Uma venda a mais, um desperdício a menos: meta mais perto.",
  "A meta de hoje é o seu futuro em construção.",
  "Consistência transforma qualquer número em realidade.",
  "Controle diário é a verdadeira coragem financeira.",
  "A meta é só um número; você é o sistema.",
];
const PHRASES = PHRASES_150.slice(0, 150);

const pickNextPhrase = () => {
  const key = "goal_phrase_last_index_v1";
  const last = Number(localStorage.getItem(key) || "-1");
  if (PHRASES.length <= 1) return PHRASES[0] || "";
  let idx = Math.floor(Math.random() * PHRASES.length);
  if (idx === last) idx = (idx + 1) % PHRASES.length;
  localStorage.setItem(key, String(idx));
  return PHRASES[idx];
};

// -----------------------------
// ProgressBar
// -----------------------------
function ProgressBar({ value, max = 100, color = "blue" }) {
  const p = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const colors = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
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

// -----------------------------
// MAIN
// -----------------------------
export default function GoalView({
  tx = [],
  state,
  setState,
  hidden = false,
  onSaveGoal,
  notify,
}) {
  const moneyOrHidden = (v) => (hidden ? "••••" : formatBRL(v));
  const today = todayISO();

  // ✅ 1. Meta ATIVA (A que vale para cálculos)
  // Usamos state?.goal para garantir que a UI reflita o que está salvo no App/BD
  const activeGoal = state?.goal || {
    value: 0,
    period: "1",
    dailySalesTarget: 0,
    startDate: null,
  };
  const activeValue = Math.max(0, Number(activeGoal.value || 0));
  const activePeriod = String(activeGoal.period || "1");
  const activeStartDate = activeGoal.startDate || "";
  const activeSalesPerDay = Number(activeGoal.dailySalesTarget || 0);

  // ✅ 2. Draft / Rascunho (Inputs)
  // Independente da meta ativa, para permitir edição livre
  const [value, setValue] = useState(String(activeValue || ""));
  const [period, setPeriod] = useState(String(activePeriod || "1"));
  const [startDate, setStartDate] = useState(activeStartDate || "");
  const [selectedSalesPerDay, setSelectedSalesPerDay] = useState(
    activeSalesPerDay || 0
  );

  // Estados de Modais
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [celebrateText, setCelebrateText] = useState("");
  const [goalSavedOpen, setGoalSavedOpen] = useState(false);
  const [goalSavedText, setGoalSavedText] = useState("");

  // Frase rotativa
  const [phrase, setPhrase] = useState("");
  useEffect(() => {
    setPhrase(pickNextPhrase());
  }, []);

  // ✅ 3. Sincroniza Rascunho quando a Meta Ativa muda externamente (ex: load inicial)
  useEffect(() => {
    setValue(String(activeValue || ""));
    setPeriod(String(activePeriod || "1"));
    setStartDate(activeStartDate || "");
    setSelectedSalesPerDay(activeSalesPerDay || 0);
    // Opcional: troca frase quando a meta muda/carrega
    if (activeValue > 0) setPhrase(pickNextPhrase());
  }, [activeValue, activePeriod, activeStartDate, activeSalesPerDay]);

  // =================================================================
  // 🧮 CÁLCULOS BLINDADOS (Usam META ATIVA, não o Input)
  // =================================================================
  const calcPeriod = activePeriod;
  const calcStartDate = activeStartDate;
  const calcGoalValue = activeValue;
  // O "ritmo" ativo serve para o card de "Sua Meta Diária"
  const calcSalesPerDay = activeSalesPerDay;

  // Datas do período (JANELA MÓVEL: Mensal = 30 dias Fixos)
  const start = useMemo(() => {
    // ✅ se o usuário escolheu uma data, usa ela
    if (calcStartDate) return calcStartDate;

    // ✅ se não escolheu, começa hoje (dia que definiu a meta)
    return today;
  }, [calcStartDate, today]);

  const end = useMemo(() => {
    // ✅ Mensal = 30 dias (hoje + 29)
    if (calcPeriod === "1") return addDaysISO(start, 29);

    // ✅ Trimestral = 90 dias (start + 89)
    if (calcPeriod === "3") return addDaysISO(start, 89);

    // ✅ Anual = 365 dias (start + 364)
    if (calcPeriod === "12") return addDaysISO(start, 364);

    // fallback
    return addDaysISO(start, 29);
  }, [start, calcPeriod]);

  const daysTotal = useMemo(() => {
    // ✅ Como agora é janela móvel, dá pra fixar (evita bugs de cálculo)
    if (calcPeriod === "1") return 30;
    if (calcPeriod === "3") return 90;
    if (calcPeriod === "12") return 365;

    // fallback antigo
    const a = parseISOToLocalDate(start).getTime();
    const b = parseISOToLocalDate(end).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [start, end, calcPeriod]);

  const daysPassed = useMemo(() => {
    const a = parseISOToLocalDate(start).getTime();
    const b = parseISOToLocalDate(today).getTime();
    const n = Math.round((b - a) / (1000 * 60 * 60 * 24)) + 1;
    return clamp(n, 0, daysTotal);
  }, [start, today, daysTotal]);

  // Transações no range (Meta Ativa)
  const txInRange = useMemo(
    () => (tx || []).filter((t) => t.date >= start && t.date <= end),
    [tx, start, end]
  );

  const totalIn = useMemo(
    () =>
      txInRange
        .filter((t) => t.kind === "in")
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    [txInRange]
  );

  const totalOut = useMemo(
    () =>
      txInRange
        .filter((t) => t.kind === "out")
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    [txInRange]
  );

  const net = totalIn - totalOut;

  // Lucro Hoje (independe de meta, mas usado na comemoração)
  const profitToday = useMemo(() => {
    const inToday = (tx || [])
      .filter((t) => t.date === today && t.kind === "in")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const outToday = (tx || [])
      .filter((t) => t.date === today && t.kind === "out")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    return inToday - outToday;
  }, [tx, today]);

  // Progresso (Baseado na Meta Ativa)
  const remaining = useMemo(
    () => Math.max(0, calcGoalValue - totalIn),
    [calcGoalValue, totalIn]
  );

  const progressPct = useMemo(() => {
    if (!calcGoalValue) return 0;
    return (totalIn / calcGoalValue) * 100;
  }, [calcGoalValue, totalIn]);

  const activeDailyProfitTarget = useMemo(() => {
    if (!calcGoalValue) return 0;
    return calcGoalValue / Math.max(1, daysTotal);
  }, [calcGoalValue, daysTotal]);

  const hasActiveGoal = calcGoalValue > 0;

  // =================================================================
  // 🔘 LÓGICA DE INTERFACE (Usa RASCUNHO para simulação)
  // =================================================================

  // Valor sendo digitado
  const draftGoalValue = Math.max(0, parseNumber(value));

  // Meta diária estimada (baseada no que está sendo digitado)
  const estimatedDailyTarget = useMemo(() => {
    // Estimativa rápida de dias baseada no select do rascunho
    let estDays = daysTotal;
    if (period !== calcPeriod) {
      if (period === "1") estDays = 30;
      if (period === "3") estDays = 90;
      if (period === "12") estDays = 365;
    }
    return draftGoalValue / Math.max(1, estDays);
  }, [draftGoalValue, daysTotal, period, calcPeriod]);

  // Presets (Botões 1, 5, 15, 30) - Reagem ao INPUT (Draft)
  const salesPresetsDraft = useMemo(() => {
    if (!draftGoalValue) return [];
    const presets = [1, 5, 15, 30];
    return presets.map((spd) => {
      const perSale = spd > 0 ? estimatedDailyTarget / spd : 0;
      return {
        salesPerDay: spd,
        perSale,
        label: `Com ${spd} venda(s) de ${formatBRL(
          perSale
        )} por dia, você bate essa meta.`,
      };
    });
  }, [draftGoalValue, estimatedDailyTarget]);

  // Auto-select preset no draft (UX friendly)
  useEffect(() => {
    if (!draftGoalValue) {
      if (selectedSalesPerDay !== 0) setSelectedSalesPerDay(0);
      return;
    }
    // Se o usuário já selecionou algo manualmente, não sobreescreve
    if (selectedSalesPerDay === 0) {
      const d = draftGoalValue <= 20000 ? 15 : 5;
      setSelectedSalesPerDay(d);
    }
  }, [draftGoalValue]);

  const resetDraftToStart = () => {
    // Na lógica janela móvel, resetar significa setar para hoje
    setStartDate(today);
  };

  // =================================================================
  // 💾 SAVE & EVENTS
  // =================================================================

  const saveGoal = () => {
    const nextValue = Math.max(0, parseNumber(value));
    const nextPeriod = String(period || "1");

    // Se data estiver vazia, usa lógica de start atual (Hoje)
    let nextStart = startDate;
    if (!nextStart) {
      nextStart = today;
    }

    if (!nextValue || nextValue <= 0) {
      setGoalSavedText("Digite um valor de meta válido ✅");
      setGoalSavedOpen(true);
      return;
    }
    if (!selectedSalesPerDay || selectedSalesPerDay <= 0) {
      setGoalSavedText("Escolha um ritmo (vendas/dia) abaixo ✅");
      setGoalSavedOpen(true);
      return;
    }

    const next = {
      value: nextValue,
      period: nextPeriod,
      startDate: nextStart,
      dailySalesTarget: Number(selectedSalesPerDay),
    };

    // ✅ CHAMA onSaveGoal (PERSISTÊNCIA) OU FALLBACK
    if (onSaveGoal) {
      onSaveGoal(next);
    } else {
      setState((s) => ({ ...s, goal: next }));
    }

    // Calcula data final estimada para o feedback (Janela Móvel)
    let estimatedEnd = nextStart;
    if (nextPeriod === "1") estimatedEnd = addDaysISO(nextStart, 29);
    else if (nextPeriod === "3") estimatedEnd = addDaysISO(nextStart, 89);
    else if (nextPeriod === "12") estimatedEnd = addDaysISO(nextStart, 364);
    else estimatedEnd = addDaysISO(nextStart, 29);

    setGoalSavedText(
      `Meta ATIVA ✅\nMeta: ${formatBRL(
        nextValue
      )}\nPeríodo: ${nextStart} até ${estimatedEnd}\nRitmo: ${selectedSalesPerDay} venda(s)/dia`
    );
    setGoalSavedOpen(true);
    setPhrase(pickNextPhrase());
  };

  // Lembretes automáticos (60/80/100) baseados na META ATIVA
  const milestoneKey = useMemo(() => {
    return `goal_milestones_v2:${start}:${end}:${calcGoalValue}`;
  }, [start, end, calcGoalValue]);

  useEffect(() => {
    if (!calcGoalValue || calcGoalValue <= 0) return;

    const pct = progressPct;
    const firedRaw = localStorage.getItem(milestoneKey);
    const fired = firedRaw
      ? JSON.parse(firedRaw)
      : { m60: false, m80: false, m100: false };

    const fire = (k, text) => {
      const next = { ...fired, [k]: true };
      localStorage.setItem(milestoneKey, JSON.stringify(next));
      setGoalSavedText(text);
      setGoalSavedOpen(true);
    };

    if (pct >= 100 && !fired.m100) {
      fire(
        "m100",
        `META BATIDA! 🎉\nVocê chegou em ${formatBRL(
          totalIn
        )} de ${formatBRL(calcGoalValue)}.\nAgora é manter o ritmo.`
      );
      setCelebrateText(`Parabéns! Você bateu a meta do período! 🚀`);
      setCelebrateOpen(true);
      return;
    }

    if (pct >= 80 && !fired.m80) {
      fire(
        "m80",
        `Você chegou em 80% da meta 🚀\nProgresso: ${pct.toFixed(
          1
        )}%\nFalta: ${formatBRL(remaining)}`
      );
      return;
    }

    if (pct >= 60 && !fired.m60) {
      fire(
        "m60",
        `Boa! 60% da meta atingido ✅\nProgresso: ${pct.toFixed(
          1
        )}%\nFalta: ${formatBRL(remaining)}`
      );
    }
  }, [calcGoalValue, progressPct, milestoneKey, totalIn, remaining]);

  // Checar meta diária ao carregar (se lucro do dia >= meta diária ATIVA)
  useEffect(() => {
    if (!calcGoalValue || calcGoalValue <= 0) return;
    if (activeDailyProfitTarget <= 0) return;

    const todayKey = `celebrated_daily_${today}_${calcGoalValue}`;
    if (localStorage.getItem(todayKey)) return;

    if (profitToday >= activeDailyProfitTarget) {
      setCelebrateText(
        `Parabéns! Você bateu sua meta diária de lucro 🎉\nLucro de hoje: ${formatBRL(
          profitToday
        )} • Meta diária: ${formatBRL(activeDailyProfitTarget)}`
      );
      setCelebrateOpen(true);
      localStorage.setItem(todayKey, "true");
    }
  }, [profitToday, activeDailyProfitTarget, calcGoalValue, today]);

  // Cores visuais
  const badgeTone =
    progressPct >= 100
      ? "success"
      : progressPct >= 60
      ? "brand"
      : "warning";

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Meta</h2>
          <p className="text-sm text-zinc-500">
            Defina um objetivo. Ele só ativa quando você clicar em "Definir
            meta".
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PrimaryButton tone="brand" onClick={saveGoal}>
            <CheckCircle2 className="h-4 w-4" /> Definir meta
          </PrimaryButton>
          <SoftButton onClick={resetDraftToStart}>
            <Calendar className="h-4 w-4" /> Reset início
          </SoftButton>
        </div>
      </div>

      {/* 📝 CONFIGURAÇÃO (Inputs = Draft) */}
      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Meta (R$)"
            value={value}
            onChange={(v) => {
              setValue(v);
              if (!parseNumber(v)) setSelectedSalesPerDay(0);
            }}
            placeholder="Ex: 100000"
          />

          <Select
            label="Período"
            value={period}
            onChange={(v) => setPeriod(v)}
            options={[
              { value: "1", label: "Mensal" },
              { value: "3", label: "Trimestral" },
              { value: "12", label: "Anual" },
            ]}
          />

          <Input
            label="Início do período"
            type="date"
            value={startDate}
            onChange={setStartDate}
          />
        </div>

        {/* Simulador de Ritmo (Usa Draft) */}
        {draftGoalValue > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold">
                  Escolha seu ritmo (vendas/dia)
                </div>
                <div className="text-xs text-zinc-500">
                  Simule abaixo. Clique em "Definir meta" para valer.
                </div>
              </div>
              <Badge tone="brand">
                <TrendingUp className="h-4 w-4" /> Simulação
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {salesPresetsDraft.map((p) => {
                const active = p.salesPerDay === selectedSalesPerDay;
                return (
                  <button
                    key={p.salesPerDay}
                    onClick={() => setSelectedSalesPerDay(p.salesPerDay)}
                    className={cx(
                      "rounded-2xl border p-4 text-left transition-all",
                      active
                        ? "border-blue-300 bg-blue-50 ring-4 ring-blue-100 dark:border-blue-900/60 dark:bg-blue-950/20 dark:ring-blue-900/20"
                        : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                    )}
                    title="Clique para escolher este ritmo"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold uppercase text-zinc-500">
                        {p.salesPerDay} / dia
                      </div>
                      {active ? (
                        <Badge tone="success">Selecionado</Badge>
                      ) : (
                        <Badge tone="neutral">Escolher</Badge>
                      )}
                    </div>

                    <div className="mt-2 text-lg font-extrabold">
                      {hidden ? "••••" : formatBRL(p.perSale)}
                      <span className="text-xs font-semibold text-zinc-500">
                        {" "}
                        / venda
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-zinc-500">
                      {hidden
                        ? "Com • venda(s) de • por dia você bate sua meta."
                        : p.label}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-200/50 p-2 dark:bg-blue-900/30">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-blue-900 dark:text-blue-200">
                    Lembrete do dia
                  </div>
                  <div className="mt-1 text-sm text-blue-800/90 dark:text-blue-200/90">
                    {phrase}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 📊 4. EVOLUÇÃO (Renderiza SOMENTE se tiver META ATIVA) */}
      {hasActiveGoal && (
        <>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-zinc-500">
                  Evolução da meta ativa
                </div>
                <div className="mt-1 text-lg font-extrabold">
                  {hidden
                    ? "••••"
                    : `${Math.min(100, progressPct).toFixed(1)}%`}
                  <span className="text-sm font-semibold text-zinc-500">
                    {" "}
                    ({moneyOrHidden(totalIn)} de {moneyOrHidden(calcGoalValue)})
                  </span>
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  Dias: <b>{daysPassed}</b> / {daysTotal} • Falta:{" "}
                  <b>{moneyOrHidden(remaining)}</b>
                </div>
              </div>

              <Badge tone={badgeTone}>
                {progressPct >= 100 ? "Meta batida" : "Em andamento"}
              </Badge>
            </div>

            <div className="mt-3">
              <ProgressBar
                value={Math.min(totalIn, calcGoalValue || 0)}
                max={Math.max(calcGoalValue || 0, 1)}
                color={
                  progressPct >= 100
                    ? "emerald"
                    : progressPct >= 60
                    ? "blue"
                    : "amber"
                }
              />
            </div>

            <div className="mt-3 text-sm text-zinc-500">
              Para bater no tempo, você precisa em média de{" "}
              <b className="text-zinc-800 dark:text-zinc-200">
                {moneyOrHidden(
                  remaining / Math.max(1, daysTotal - daysPassed)
                )}
              </b>{" "}
              por dia daqui pra frente.
            </div>
          </Card>

          {/* KPIs Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <div className="text-xs text-zinc-500">Entradas no período</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600">
                {moneyOrHidden(totalIn)}
              </div>
              <div className="mt-1 text-xs text-zinc-400">soma de entradas</div>
            </Card>

            <Card>
              <div className="text-xs text-zinc-500">Saídas no período</div>
              <div className="mt-1 text-2xl font-extrabold text-rose-600">
                {moneyOrHidden(totalOut)}
              </div>
              <div className="mt-1 text-xs text-zinc-400">soma de saídas</div>
            </Card>

            <Card highlight={net < 0}>
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">Resultado</div>
                <Badge tone={net >= 0 ? "success" : "danger"}>
                  {net >= 0 ? "POSITIVO" : "NEGATIVO"}
                </Badge>
              </div>
              <div
                className={cx(
                  "mt-1 text-2xl font-extrabold",
                  net >= 0 ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {moneyOrHidden(net)}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                entradas - saídas
              </div>
            </Card>

            <Card>
              <div className="text-xs text-zinc-500">Falta para bater</div>
              <div className="mt-1 text-2xl font-extrabold text-blue-600">
                {moneyOrHidden(remaining)}
              </div>
              <div className="mt-1 text-xs text-zinc-400">restante da meta</div>
            </Card>
          </div>

          {/* Detalhamento do Plano Diário (Baseado na Meta ATIVA) */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Plano Diário Ativo</h3>
                <p className="text-sm text-zinc-500">
                  Dados oficiais da meta salva.
                </p>
              </div>
              <Badge tone="brand">
                <TrendingUp className="h-4 w-4" /> Oficial
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="text-xs text-blue-700 dark:text-blue-200">
                  Meta diária (lucro)
                </div>
                <div className="mt-1 text-xl font-extrabold text-blue-700 dark:text-blue-200">
                  {moneyOrHidden(activeDailyProfitTarget)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-300">
                  meta ÷ dias do período
                </div>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="text-xs text-zinc-500">Ritmo definido</div>
                <div className="mt-1 text-xl font-extrabold">
                  {calcSalesPerDay || 0} venda(s)/dia
                </div>
                <div className="text-xs text-zinc-400">meta salva</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="text-xs text-emerald-700 dark:text-emerald-200">
                  Alvo por venda (oficial)
                </div>
                <div className="mt-1 text-xl font-extrabold text-emerald-700 dark:text-emerald-200">
                  {moneyOrHidden(
                    calcSalesPerDay > 0
                      ? activeDailyProfitTarget / calcSalesPerDay
                      : 0
                  )}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-300">
                  meta diária ÷ vendas/dia
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                    Lucro de hoje
                  </div>
                  <div className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                    entradas de hoje - saídas de hoje
                  </div>
                </div>
                <Badge
                  tone={
                    profitToday >= activeDailyProfitTarget &&
                    activeDailyProfitTarget > 0
                      ? "success"
                      : "neutral"
                  }
                >
                  {profitToday >= activeDailyProfitTarget &&
                  activeDailyProfitTarget > 0
                    ? "Meta diária batida"
                    : "Em andamento"}
                </Badge>
              </div>

              <div className="mt-2 text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">
                {moneyOrHidden(profitToday)}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Modais de Comemoração e Feedback */}
      <AnimatePresence>
        {celebrateOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setCelebrateOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl dark:border-emerald-900/40 dark:bg-zinc-950"
            >
              <div className="relative overflow-hidden p-6">
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {Array.from({ length: 18 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute text-xl"
                      style={{
                        left: `${(i * 7) % 100}%`,
                        top: `${(i * 11) % 60}%`,
                      }}
                      initial={{ y: -20, rotate: 0, opacity: 0 }}
                      animate={{
                        y: [-20, 80, 160],
                        rotate: [0, 180, 360],
                        opacity: [0, 1, 0.9],
                      }}
                      transition={{
                        duration: 1.4,
                        delay: i * 0.03,
                        ease: "easeOut",
                      }}
                    >
                      🎉
                    </motion.div>
                  ))}
                </motion.div>

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-lg font-extrabold">Meta Batida!</div>
                      <div className="text-xs text-zinc-500">
                        {celebrateText.includes("diária")
                          ? "Meta diária superada"
                          : "Meta do período"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                    {celebrateText}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <PrimaryButton
                      tone="success"
                      onClick={() => setCelebrateOpen(false)}
                    >
                      Fechar
                    </PrimaryButton>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {goalSavedOpen && (
          <motion.div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setGoalSavedOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="p-6">
                <div className="flex items-center gap-2">
                  <div className="rounded-2xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                    <Target className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold">
                      Aviso do Sistema
                    </div>
                    <div className="text-xs text-zinc-500">Sobre sua meta</div>
                  </div>
                </div>

                <div className="mt-4 whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">
                  {goalSavedText}
                </div>

                <div className="mt-5 flex justify-end">
                  <PrimaryButton
                    tone="brand"
                    onClick={() => setGoalSavedOpen(false)}
                  >
                    OK
                  </PrimaryButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}