// src/pages/ReportsView.jsx
import React, { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { Download, Filter, TrendingUp, AlertTriangle } from "lucide-react";

import { Card, Badge, SoftButton, Select, Input, cx } from "../shared/ui";

// -----------------------------
// Helpers (locais)
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

const downloadTextFile = (filename, content, mime = "text/plain") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const startOfWeekISO = (baseISO) => {
  const now = parseISOToLocalDate(baseISO);
  const d = new Date(now);
  const day = d.getDay(); // 0 dom
  const diff = day === 0 ? 6 : day - 1; // semana comecando segunda
  d.setDate(d.getDate() - diff);
  return toISODateLocal(d);
};

const startOfMonthISO = (baseISO) => {
  const now = parseISOToLocalDate(baseISO);
  return toISODateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
};

const inRange = (d, a, b) => d >= a && d <= b;

const kindLabel = (k) => (k === "in" ? "Entrada" : "Saída");

// Para labels bonitos sem depender do App.jsx
const CATEGORY_LABEL = {
  // entradas
  sale_cash: "Vendas à vista",
  sale_installments: "Vendas parceladas",
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
  boleto: "Boleto",
  service: "Serviços",
  other_income: "Outros",

  // saídas
  fixed: "Custos fixos",
  variable: "Custos variáveis",
  taxes: "Impostos",
  prolabore: "Pró-labore / Retiradas",
  investments: "Investimentos",
  other_expense: "Outros",
};

const labelForCategory = (key) => CATEGORY_LABEL[key] || key;

const sum = (arr, pick) => arr.reduce((a, x) => a + (pick(x) || 0), 0);

// -----------------------------
// MAIN VIEW
// -----------------------------
export default function ReportsView({
  tx = [],
  txSorted = [],
  sales = [],
  products = [],
  hidden = false,
}) {
  const moneyOrHidden = (v) => (hidden ? "••••" : formatBRL(v));

  // filtros simples (como no “antigo”: período + data custom)
  const [period, setPeriod] = useState("month"); // day | week | month | all | custom
  const [from, setFrom] = useState(addDaysISO(todayISO(), -30));
  const [to, setTo] = useState(todayISO());

  const range = useMemo(() => {
    const t = todayISO();
    if (period === "day") return { from: t, to: t };
    if (period === "week") return { from: startOfWeekISO(t), to: t };
    if (period === "month") return { from: startOfMonthISO(t), to: t };
    if (period === "all") return { from: "0000-01-01", to: "9999-12-31" };
    // custom
    return { from: from || "0000-01-01", to: to || "9999-12-31" };
  }, [period, from, to]);

  const txInRange = useMemo(
    () => (tx || []).filter((t) => inRange(t.date, range.from, range.to)),
    [tx, range]
  );

  const paidSales = useMemo(
    () => (sales || []).filter((s) => s.status !== "pending"),
    [sales]
  );

  const paidSalesInRange = useMemo(
    () => paidSales.filter((s) => inRange(s.date, range.from, range.to)),
    [paidSales, range]
  );

  const pendingSalesInRange = useMemo(
    () =>
      (sales || []).filter(
        (s) => s.status === "pending" && inRange(s.date, range.from, range.to)
      ),
    [sales, range]
  );

  // KPIs financeiros
  const kpis = useMemo(() => {
    const ins = txInRange.filter((t) => t.kind === "in");
    const outs = txInRange.filter((t) => t.kind === "out");

    const totalIn = sum(ins, (t) => Number(t.amount || 0));
    const totalOut = sum(outs, (t) => Number(t.amount || 0));
    const net = totalIn - totalOut;

    const avgInPerDay = (() => {
      // conta dias distintos no range com qualquer registro
      const days = new Set(txInRange.map((t) => t.date));
      const n = Math.max(1, days.size);
      return totalIn / n;
     })();

    return { totalIn, totalOut, net, avgInPerDay };
  }, [txInRange]);

  // KPIs de vendas (paga vs pendente)
  const salesKpis = useMemo(() => {
    const paidValue = sum(paidSalesInRange, (s) => Number(s.total || 0));
    const pendingValue = sum(pendingSalesInRange, (s) => Number(s.total || 0));
    const paidCount = paidSalesInRange.length;
    const pendingCount = pendingSalesInRange.length;

    return { paidValue, pendingValue, paidCount, pendingCount };
  }, [paidSalesInRange, pendingSalesInRange]);

  // Top categorias
  const topCategories = useMemo(() => {
    const groupedIn = new Map();
    const groupedOut = new Map();

    for (const t of txInRange) {
      const key = t.category || "other";
      const amt = Number(t.amount || 0);

      if (t.kind === "in") groupedIn.set(key, (groupedIn.get(key) || 0) + amt);
      else groupedOut.set(key, (groupedOut.get(key) || 0) + amt);
    }

    const toSorted = (m) =>
      [...m.entries()]
        .map(([k, v]) => ({ key: k, label: labelForCategory(k), value: v }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

    return { topIn: toSorted(groupedIn), topOut: toSorted(groupedOut) };
  }, [txInRange]);

  // Top produtos vendidos (a partir das vendas pagas)
  const topProducts = useMemo(() => {
    const byId = new Map();

    for (const s of paidSalesInRange) {
      const items = Array.isArray(s.items) ? s.items : [];
      for (const it of items) {
        const id = it.productId || it.id || it.code || it.name;
        if (!id) continue;

        const qty = Math.abs(Number(it.qty || 0));
        const total = Number(it.total || 0);

        const cur = byId.get(id) || {
          id,
          name: it.name || "—",
          code: it.code || "",
          qty: 0,
          total: 0,
        };

        cur.qty += qty;
        cur.total += total;
        if (!cur.name && it.name) cur.name = it.name;

        byId.set(id, cur);
      }
    }

    return [...byId.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [paidSalesInRange]);

  // Série para gráfico (últimos 30 dias dentro do range / ou sempre 30 dias)
  const series = useMemo(() => {
    // Garante que 'to' existe, senão usa hoje
    const end = range.to || todayISO(); 
    const start = addDaysISO(end, -29);

    const days = [];
    for (let i = 0; i < 30; i++) days.push(addDaysISO(start, i));

    const mapIn = new Map();
    const mapOut = new Map();

    // Adiciona verificação de segurança (|| [])
    for (const t of txSorted || []) {
      // Garante que a data existe antes de comparar
      if (t.date && !inRange(t.date, start, end)) continue;
      
      const amt = Number(t.amount || 0);
      if (t.kind === "in") mapIn.set(t.date, (mapIn.get(t.date) || 0) + amt);
      else mapOut.set(t.date, (mapOut.get(t.date) || 0) + amt);
    }

    return days.map((d) => ({
      date: d.slice(5), // Remove o ano para ficar mais curto no gráfico (MM-DD)
      in: mapIn.get(d) || 0,
      out: mapOut.get(d) || 0,
    }));
  }, [txSorted, range]);

  // exportações
  const exportCSV = () => {
    const headers = [
      "Data",
      "Descrição",
      "Categoria",
      "Tipo",
      "Valor",
      "Método",
    ];
    const esc = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';

    const rows = txInRange.map((t) => [
      t.date,
      t.description || "",
      labelForCategory(t.category),
      kindLabel(t.kind),
      t.amount ?? 0,
      t.method || "",
    ]);

    const csv = [
      headers.map(esc).join(","),
      ...rows.map((r) => r.map(esc).join(",")),
    ].join("\n");
    downloadTextFile(
      `relatorios_${range.from}_a_${range.to}.csv`,
      csv,
      "text/csv"
    );
  };

  const exportJSON = () => {
    const payload = {
      range,
      totals: { ...kpis, ...salesKpis },
      tx: txInRange,
      salesPaid: paidSalesInRange,
      salesPending: pendingSalesInRange,
      products,
    };
    downloadTextFile(
      `relatorios_${range.from}_a_${range.to}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  };

  const toneNet = kpis.net >= 0 ? "success" : "danger";

  return (
    <div className="grid gap-6">
      {/* Header + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Relatórios</h2>
          <p className="text-sm text-zinc-500">
            Visão completa do caixa, vendas e categorias no período.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="Período"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "day", label: "Hoje" },
              { value: "week", label: "Esta semana" },
              { value: "month", label: "Este mês" },
              { value: "all", label: "Tudo" },
              { value: "custom", label: "Personalizado" },
            ]}
          />

          {period === "custom" && (
            <>
              <Input label="De" type="date" value={from} onChange={setFrom} />
              <Input label="Até" type="date" value={to} onChange={setTo} />
            </>
          )}

          <SoftButton icon={Download} onClick={exportCSV}>
            CSV
          </SoftButton>
          <SoftButton icon={Download} onClick={exportJSON}>
            JSON
          </SoftButton>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          {/* ✅ Renomeado para deixar claro que é CAIXA */}
          <div className="text-xs text-zinc-500">Entradas no Caixa</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-600">
            {moneyOrHidden(kpis.totalIn)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">no período</div>
        </Card>

        <Card>
          <div className="text-xs text-zinc-500">Saídas</div>
          <div className="mt-1 text-2xl font-extrabold text-rose-600">
            {moneyOrHidden(kpis.totalOut)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">no período</div>
        </Card>

        <Card highlight={kpis.net < 0}>
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500">Resultado</div>
            <Badge tone={toneNet}>
              {kpis.net >= 0 ? "POSITIVO" : "NEGATIVO"}
            </Badge>
          </div>
          <div
            className={cx(
              "mt-1 text-2xl font-extrabold",
              kpis.net >= 0 ? "text-emerald-600" : "text-rose-600"
            )}
          >
            {moneyOrHidden(kpis.net)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">entradas - saídas</div>
        </Card>

        <Card>
          <div className="text-xs text-zinc-500">Média de entrada</div>
          <div className="mt-1 text-2xl font-extrabold text-blue-600">
            {moneyOrHidden(kpis.avgInPerDay)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">por dia com registro</div>
        </Card>
      </div>

      {/* Vendas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                <TrendingUp className="inline-block h-4 w-4 -mt-0.5 mr-1" />
                Vendas no período
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                Recebidas vs Pendentes
              </div>
            </div>
            <Badge tone={salesKpis.pendingCount ? "warning" : "success"}>
              {salesKpis.pendingCount ? "atenção" : "ok"}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              {/* ✅ Renomeado para diferenciar de "Entradas" */}
              <div className="text-xs text-emerald-700 dark:text-emerald-200">
                Faturamento recebido
              </div>
              <div className="mt-1 text-xl font-extrabold text-emerald-700 dark:text-emerald-200">
                {moneyOrHidden(salesKpis.paidValue)}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                {salesKpis.paidCount} venda(s)
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="text-xs text-amber-700 dark:text-amber-200">
                Pendentes
              </div>
              <div className="mt-1 text-xl font-extrabold text-amber-700 dark:text-amber-200">
                {moneyOrHidden(salesKpis.pendingValue)}
              </div>
              <div className="text-xs text-amber-600 dark:text-amber-400">
                {salesKpis.pendingCount} pendência(s)
              </div>
            </div>
          </div>

          {salesKpis.pendingCount > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <div>
                  Existem pendências no período. Isso <b>não entra</b> no caixa
                  até ser recebido.
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Categorias (Top)
              </div>
              <div className="text-sm text-zinc-500">Entradas e Saídas</div>
            </div>
            <SoftButton icon={Filter}>Filtros</SoftButton>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-zinc-500 mb-2">
                Entradas
              </div>
              {topCategories.topIn.length === 0 ? (
                <div className="text-sm text-zinc-500">Sem dados.</div>
              ) : (
                <div className="space-y-2">
                  {topCategories.topIn.map((c) => (
                    <div
                      key={c.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-zinc-600 dark:text-zinc-300">
                        {c.label}
                      </span>
                      <span className="font-bold text-emerald-600">
                        {moneyOrHidden(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-500 mb-2">
                Saídas
              </div>
              {topCategories.topOut.length === 0 ? (
                <div className="text-sm text-zinc-500">Sem dados.</div>
              ) : (
                <div className="space-y-2">
                  {topCategories.topOut.map((c) => (
                    <div
                      key={c.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-zinc-600 dark:text-zinc-300">
                        {c.label}
                      </span>
                      <span className="font-bold text-rose-600">
                        {moneyOrHidden(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Entradas vs Saídas (30 dias)</h3>
            <p className="text-sm text-zinc-500">
              Últimos 30 dias até {range.to}.
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
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
                formatter={(v) => moneyOrHidden(v)}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="in"
                stroke="#16a34a"
                strokeWidth={2}
                fillOpacity={0.08}
                fill="#16a34a"
              />
              <Area
                type="monotone"
                dataKey="out"
                stroke="#e11d48"
                strokeWidth={2}
                fillOpacity={0.08}
                fill="#e11d48"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top produtos */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h3 className="font-bold">Top Produtos Vendidos (pagas)</h3>
          <p className="text-xs text-zinc-500">
            Baseado nos itens registrados nas vendas recebidas no período.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4 text-right">Qtd</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-zinc-500">
                    Sem vendas pagas no período.
                  </td>
                </tr>
              ) : (
                topProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-6 py-4 font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-zinc-500">
                      {p.code || "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-500">
                      {String(p.qty).replace(".", ",")}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {moneyOrHidden(p.total)}
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