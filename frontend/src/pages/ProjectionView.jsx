// src/pages/ProjectionView.jsx
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
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Card, Select, cx } from "../shared/ui";
import { formatBRL } from "../shared/utils";

// Helpers locais
const toISODateLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseISOToLocalDate = (iso) => {
  const [y, m, d] = String(iso || "").split("-").map((x) => parseInt(x, 10));
  return new Date(y || 1970, (m || 1) - 1, d || 1);
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

export default function ProjectionView({ tx = [], startBalance = 0 }) {
  const [days, setDays] = useState("30");

  const projection = useMemo(() => {
    const horizon = Number(days || 30);
    const start = todayISO();

    // considera lançamentos com data >= hoje (inclui contas futuras)
    const futureTx = (tx || []).filter((t) => String(t.date || "") >= start);

    const byDate = new Map();
    for (const t of futureTx) {
      const k = String(t.date || "");
      const arr = byDate.get(k) || [];
      arr.push(t);
      byDate.set(k, arr);
    }

    let bal = Number(startBalance || 0);
    const rows = [];

    for (let i = 0; i <= horizon; i++) {
      const d = addDaysISO(start, i);
      const list = byDate.get(d) || [];
      let inSum = 0;
      let outSum = 0;

      for (const t of list) {
        const amt = Number(t.amount) || 0;
        if (t.kind === "in") inSum += amt;
        else outSum += amt;
      }

      bal = bal + inSum - outSum;
      rows.push({ date: d, inSum, outSum, balance: bal });
    }

    return rows;
  }, [tx, startBalance, days]);

  const chartData = useMemo(() => {
    return projection.map((r) => ({
      date: String(r.date || "").slice(5),
      saldo: r.balance,
    }));
  }, [projection]);

  const minBal = useMemo(() => {
    const arr = projection.map((r) => Number(r.balance || 0));
    arr.push(Number(startBalance || 0));
    return Math.min(...arr);
  }, [projection, startBalance]);

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
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis
                  width={70}
                  tickFormatter={(v) => (Number(v) || 0).toLocaleString("pt-BR")}
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
