// src/pages/PlansView.jsx
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Crown, Zap, Shield, Star, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

import {
  Card,
  Badge,
  PrimaryButton,
  SoftButton,
  cx,
} from "../shared/ui";

// ✅ URL da API (Env ou Localhost)
const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const brl = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PLANS = [
  {
    id: "mensal",
    index: 1,
    title: "Plano Mensal",
    price: 89.9,
    periodLabel: "por mês",
    highlight: false,
    tone: "neutral",
    icon: Zap,
    tag: "Comece agora",
    perks: [
      "Acesso completo ao painel",
      "Cadastro de produtos e vendas",
      "Relatórios e projeções",
      "Backup no Supabase",
      "Suporte padrão",
    ],
  },
  {
    id: "trimestral",
    index: 2,
    title: "Plano Trimestral",
    price: 199.99,
    periodLabel: "a cada 3 meses",
    highlight: true,
    tone: "brand",
    icon: Crown,
    tag: "Mais vendido",
    perks: [
      "Tudo do Mensal",
      "Melhor custo-benefício",
      "Prioridade em melhorias",
      "Suporte mais rápido",
      "Acesso antecipado a recursos",
    ],
  },
  {
    id: "anual",
    index: 3,
    title: "Plano Anual",
    price: 899.99,
    periodLabel: "por ano",
    highlight: false,
    tone: "success",
    icon: Shield,
    tag: "Economia máxima",
    perks: [
      "Tudo do Trimestral",
      "Economia no longo prazo",
      "Selo de cliente premium",
      "Suporte prioritário",
      "Acesso a atualizações premium",
    ],
  },
  {
    id: "vitalicio",
    index: 4,
    title: "Plano Vitalício",
    price: 1890.9,
    periodLabel: "pagamento único",
    highlight: false,
    tone: "warning",
    icon: Star,
    tag: "Para sempre",
    perks: [
      "Acesso vitalício ao app",
      "Atualizações incluídas",
      "Recursos premium liberados",
      "Suporte VIP",
      "Sem mensalidades",
    ],
  },
];

const toneBadge = (tone) => {
  if (tone === "brand") return "brand";
  if (tone === "success") return "success";
  if (tone === "warning") return "warning";
  return "neutral";
};

export default function PlansView({
  currentPlanId = null,
  // userId, // ❌ Removido (não é mais necessário, usamos o token)
  onChoosePlan,
}) {
  const [selected, setSelected] = useState(currentPlanId);
  const [loadingId, setLoadingId] = useState(null);

  const plans = useMemo(() => PLANS, []);

  // ✅ Nova função goCheckout atualizada
  async function goCheckout(plan) {
    try {
      setLoadingId(plan.id);

      // 1. Pega o token da sessão atual
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) throw new Error("Sessão inválida. Faça login novamente.");

      // 2. Chama o backend (usando API_URL)
      const resp = await fetch(`${API_URL}/checkout/create-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: plan.id }),
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Falha no checkout");

      // 3. Redireciona
      if (json.init_point) window.location.href = json.init_point;
      else throw new Error("Link de pagamento não retornado.");

    } catch (error) {
      console.error("Erro no checkout:", error);
      alert(error?.message || "Não foi possível iniciar o pagamento.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Planos</h2>
        <p className="text-sm text-zinc-500">
          Escolha o plano ideal para sua empresa e desbloqueie recursos premium.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((p) => {
          const Icon = p.icon;
          const isSelected = selected === p.id;
          const isLoading = loadingId === p.id;

          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Card
                className={cx(
                  "relative overflow-hidden border p-5",
                  p.highlight
                    ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900/40 dark:from-blue-950/30 dark:to-zinc-950"
                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950",
                  isSelected && "ring-2 ring-blue-500/40"
                )}
              >
                {/* Tag */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cx(
                        "rounded-xl p-2",
                        p.highlight
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="font-extrabold">{p.title}</div>
                      <div className="text-xs text-zinc-500">
                        {p.periodLabel}
                      </div>
                    </div>
                  </div>

                  <Badge tone={toneBadge(p.tone)}>{p.tag}</Badge>
                </div>

                {/* Preço */}
                <div className="mb-4">
                  <div className="text-3xl font-extrabold tracking-tight">
                    {brl(p.price)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {p.id === "mensal" && "Renova automaticamente todo mês."}
                    {p.id === "trimestral" && "Renova automaticamente a cada 3 meses."}
                    {p.id === "anual" && "Renova automaticamente todo ano."}
                    {p.id === "vitalicio" && "Pagamento único, acesso para sempre."}
                  </div>
                </div>

                {/* Benefícios */}
                <div className="space-y-2">
                  {p.perks.map((perk) => (
                    <div key={perk} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {perk}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Ações */}
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => setSelected(p.id)}
                    className={cx(
                      "text-sm font-semibold",
                      isSelected
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    )}
                  >
                    {isSelected ? "Selecionado ✓" : "Selecionar"}
                  </button>

                  <div className="flex gap-2">
                    <SoftButton
                      onClick={() => setSelected(p.id)}
                    >
                      Ver detalhes
                    </SoftButton>

                    <PrimaryButton
                      tone={p.highlight ? "brand" : "success"}
                      onClick={() => goCheckout(p)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          Assinar <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </PrimaryButton>
                  </div>
                </div>

                {/* Destaque visual no "Mais vendido" */}
                {p.highlight && (
                  <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-blue-600/10 blur-2xl" />
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold">Dica</div>
            <div className="text-sm text-zinc-500">
              O <b>Trimestral</b> costuma ser o melhor equilíbrio entre preço e
              compromisso.
            </div>
          </div>
          <Badge tone="neutral">
            Plano atual: {currentPlanId ? currentPlanId : "Nenhum"}
          </Badge>
        </div>
      </Card>
    </div>
  );
}