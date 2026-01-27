// src/pages/PendenciasView.jsx
import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { uid } from "../shared/utils";

import {
  Search,
  Plus,
  User,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";

// -----------------------------
// Utils
// -----------------------------
const cx = (...classes) => classes.filter(Boolean).join(" ");

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

const formatPhone = (v) => {
  const d = onlyDigits(v);
  if (!d) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
};

const formatCPF = (v) => {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const formatBRL = (value) =>
  (value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const alphaSortByName = (a, b) =>
  String(a?.name || "").localeCompare(String(b?.name || ""), "pt-BR", { sensitivity: "base" });

// ✅ HELPERS DE CÁLCULO E ALOCAÇÃO DE PAGAMENTO
const getPurchasePaid = (p) => {
  const paidAtSale = Number(p?.paidAtSale || 0);
  const payList = Array.isArray(p?.payments) ? p.payments : [];
  const paidAfter = payList.reduce((acc, x) => acc + (Number(x?.amount) || 0), 0);
  return paidAtSale + paidAfter;
};

const getPurchaseRemaining = (p) => {
  const total = Number(p?.total || 0);
  return Math.max(0, total - getPurchasePaid(p));
};

// Aloca um pagamento nas compras abertas (mais antiga primeiro)
const allocatePayment = (client, payment) => {
  const purchases = Array.isArray(client?.purchases) ? [...client.purchases] : [];
  let remainingPay = Math.max(0, Number(payment?.amount || 0));
  const nowISO = payment?.createdAt || new Date().toISOString();

  // ordena do mais antigo pro mais novo
  purchases.sort((a, b) =>
    `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`)
  );

  const updated = purchases.map((p) => ({ ...p }));

  for (let i = 0; i < updated.length; i++) {
    if (remainingPay <= 0) break;

    const p = updated[i];
    const isSettled = p.status === "settled" || Boolean(p.settledAt);
    if (isSettled) continue;

    const due = getPurchaseRemaining(p);
    if (due <= 0) {
      // já estava quitada, marca por segurança
      updated[i] = { ...p, status: "settled", settledAt: p.settledAt || nowISO };
      continue;
    }

    const applied = Math.min(due, remainingPay);
    remainingPay -= applied;

    const pPays = Array.isArray(p.payments) ? p.payments : [];
    const payRow = {
      id: payment.id,
      amount: applied,
      method: payment.method,
      date: payment.date,
      time: payment.time,
      createdAt: nowISO,
      // opcional: referencia
      ref: payment.ref || "pendencia_payment",
    };

    const nextPurchase = {
      ...p,
      payments: [payRow, ...pPays],
      updatedAt: new Date().toISOString(),
    };

    // se quitou, marca settle
    const afterDue = Math.max(0, Number(nextPurchase.total || 0) - getPurchasePaid(nextPurchase));
    if (afterDue <= 0) {
      nextPurchase.status = "settled";
      nextPurchase.settledAt = nowISO;
      nextPurchase.settledDate = payment.date;
      nextPurchase.settledTime = payment.time;
      nextPurchase.settledMethod = payment.method;
    } else {
      nextPurchase.status = "open";
    }

    updated[i] = nextPurchase;
  }

  return { purchases: updated, unallocated: remainingPay };
};

// -----------------------------
// UI mini-components
// -----------------------------
function Card({ children, className }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950",
        className
      )}
    >
      {children}
    </div>
  );
}

function SoftButton({ children, onClick, icon: Icon, className, tone = "neutral", disabled }) {
  const tones = {
    neutral:
      "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
    danger:
      "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300 dark:hover:bg-rose-950/30",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/30",
    brand:
      "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300 dark:hover:bg-blue-950/30",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
        tones[tone] || tones.neutral,
        className
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, icon: Icon, className, disabled, tone = "brand" }) {
  const tones = {
    brand: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30",
  };
  return (
    <motion.button
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

function Input({ label, value, onChange, type = "text", placeholder, right, onKeyDown, autoFocus }) {
  return (
    <label className="block space-y-1.5">
      {label && <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{label}</div>}
      <div className="relative">
        <input
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
        />
        {right ? <div className="absolute inset-y-0 right-3 flex items-center text-zinc-400">{right}</div> : null}
      </div>
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="block space-y-1.5">
      {label && <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{label}</div>}
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block space-y-1.5">
      {label && <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{label}</div>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    danger: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    brand: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };
  return <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}

// -----------------------------
// ModalShell (ATUALIZADO COM SCROLL + FOOTER)
// -----------------------------
function ModalShell({ title, subtitle, children, onClose, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.97, opacity: 0 }}
        className="
          w-full max-w-2xl
          overflow-hidden
          rounded-2xl bg-white shadow-2xl dark:bg-zinc-950
          max-h-[85vh]
          flex flex-col
        "
      >
        {/* HEADER (fixo) */}
        <div className="shrink-0 border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">{title}</h3>
              {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* BODY (rola) */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* FOOTER (fixo) */}
        {footer ? (
          <div className="shrink-0 border-t border-zinc-100 bg-white/80 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

// -----------------------------
// MAIN PAGE
// -----------------------------
export default function PendenciasView({ pendencias = [], onUpdate, onDelete }) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const [viewClient, setViewClient] = useState(null);
  const [editClient, setEditClient] = useState(null);
  const [viewPurchase, setViewPurchase] = useState(null);

  // States para os popups de pagamento
  const [payPartialOpen, setPayPartialOpen] = useState(false);
  const [payFullOpen, setPayFullOpen] = useState(false);

  // Cálculos financeiros
  const sumPurchases = (client) =>
    (client?.purchases || []).reduce((acc, p) => acc + (Number(p?.total) || 0), 0);
  const sumPayments = (client) =>
    (client?.payments || []).reduce((acc, pay) => acc + (Number(pay?.amount) || 0), 0);
  const getBalance = (client) => Math.max(0, sumPurchases(client) - sumPayments(client));

  const normalizedQuery = query.trim().toLowerCase();

  const sortedPendencias = useMemo(() => {
    const base = [...(pendencias || [])];
    base.sort(alphaSortByName);
    return base;
  }, [pendencias]);

  const suggestions = useMemo(() => {
    if (!normalizedQuery) return [];
    const list = sortedPendencias.filter((c) => String(c.name || "").toLowerCase().includes(normalizedQuery));
    return list.slice(0, 8);
  }, [sortedPendencias, normalizedQuery]);

  const filteredList = useMemo(() => {
    if (!normalizedQuery) return sortedPendencias;
    return sortedPendencias.filter((c) => String(c.name || "").toLowerCase().includes(normalizedQuery));
  }, [sortedPendencias, normalizedQuery]);

  const total = sortedPendencias.length;
  const high = sortedPendencias.filter((c) => c.priority === "alta").length;
  const medium = sortedPendencias.filter((c) => c.priority === "media").length;

  const addClient = (payload) => {
    const next = {
      id: uid(),
      createdAt: new Date().toISOString(),
      resolved: false,
      priority: payload.priority || "media",
      tag: payload.tag || "",
      purchases: [],
      payments: [],
      ...payload,
    };

    onUpdate?.((prev) => {
      const base = Array.isArray(prev) ? prev : pendencias || [];
      return [next, ...base];
    });
  };

  const updateClient = (id, patch) => {
    onUpdate?.((prev) => {
      const base = Array.isArray(prev) ? prev : pendencias || [];
      return base.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c));
    });
  };

  const removeClient = (id) => {
    if (onDelete) {
      onDelete(id);
    } else {
      // Fallback: se não tiver prop onDelete, faz atualização local apenas
      onUpdate?.((prev) => {
        const base = Array.isArray(prev) ? prev : pendencias || [];
        return base.filter((c) => c.id !== id);
      });
    }
  };

  // ✅ addPayment agora aloca pagamento nas compras (mantém histórico)
  const addPayment = (clientId, payment) => {
    onUpdate?.((prev) => {
      const base = Array.isArray(prev) ? prev : pendencias || [];

      const next = base.map((c) => {
        if (c.id !== clientId) return c;

        const clientPayments = Array.isArray(c.payments) ? c.payments : [];
        const nextClient = {
          ...c,
          payments: [payment, ...clientPayments],
          updatedAt: new Date().toISOString(),
        };

        // ✅ aloca o pagamento nas compras (mantém histórico)
        const alloc = allocatePayment(nextClient, payment);

        return {
          ...nextClient,
          purchases: alloc.purchases,
          // opcional: se sobrar valor não alocado, você pode guardar como "credit"
          credit: (Number(nextClient.credit || 0) + Number(alloc.unallocated || 0)),
        };
      });

      // Sincroniza o modal aberto na hora
      const updatedClient = next.find((c) => c.id === clientId);
      if (updatedClient) setTimeout(() => setViewClient(updatedClient), 0);

      return next;
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Pendências</h2>
              <Badge tone={total > 0 ? "warning" : "success"}>{total} cliente{total === 1 ? "" : "s"}</Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Cadastre e acompanhe clientes (cobrança, entrega, etc). Clientes sem pendência continuam na lista.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={high > 0 ? "danger" : "neutral"}>Alta: {high}</Badge>
              <Badge tone={medium > 0 ? "warning" : "neutral"}>Média: {medium}</Badge>
              <Badge tone="neutral">Baixa: {Math.max(0, total - high - medium)}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-[340px]">
              <Input
                label="Buscar cliente"
                value={query}
                onChange={setQuery}
                placeholder="Digite o nome do cliente..."
                right={<Search className="h-4 w-4" />}
              />
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    {suggestions.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setQuery(c.name || "")}
                        className="flex w-full items-center justify-between border-b border-zinc-100 px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/40"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-zinc-400" />
                          <span className="font-semibold">{c.name || "—"}</span>
                        </div>
                        <span className="text-xs text-zinc-500">{c.priority ? `Prioridade: ${c.priority}` : ""}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <PrimaryButton icon={Plus} onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
              Incluir novo cliente
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div>
            <div className="font-bold">Clientes</div>
            <div className="text-xs text-zinc-500">Ordem alfabética • Clique em “Ver” para detalhes.</div>
          </div>

          <SoftButton
            tone="brand"
            icon={Search}
            onClick={() => {
              if (!query) return;
              const first = filteredList?.[0];
              if (first) setViewClient(first);
            }}
            disabled={!query || filteredList.length === 0}
          >
            Abrir 1º resultado
          </SoftButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Prioridade</th>
                <th className="px-6 py-4">Status / Tag</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                    <div className="mx-auto max-w-md">
                      <div className="mb-2 text-lg font-bold text-zinc-700 dark:text-zinc-200">
                        Nenhum cliente encontrado
                      </div>
                      <div className="text-sm">
                        {query ? "Tente outro nome na busca." : "Clique em “Incluir novo cliente” para cadastrar."}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((c) => {
                  const saldo = getBalance(c);

                  return (
                    <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={cx(
                              "h-2 w-2 rounded-full",
                              c.priority === "alta"
                                ? "bg-rose-500"
                                : c.priority === "media"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            )}
                          />
                          <div className="font-semibold">{c.name || "—"}</div>
                        </div>
                        {c.address ? <div className="mt-1 text-xs text-zinc-500 line-clamp-1">{c.address}</div> : null}
                      </td>

                      <td className="px-6 py-4 text-zinc-500">
                        <div className="text-sm">{c.phone ? formatPhone(c.phone) : "—"}</div>
                        <div className="text-xs">{c.email || ""}</div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge
                          tone={c.priority === "alta" ? "danger" : c.priority === "media" ? "warning" : "success"}
                        >
                          {c.priority || "media"}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-zinc-500">
                        <div className="flex flex-col items-start gap-1">
                          <Badge tone={saldo > 0 ? "warning" : "success"}>
                            {saldo > 0 ? `Pendente: ${formatBRL(saldo)}` : "Sem pendência"}
                          </Badge>
                          {c.tag && <span className="text-xs text-zinc-400">{c.tag}</span>}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <SoftButton onClick={() => setViewClient(c)} icon={User}>
                            Ver
                          </SoftButton>

                          <SoftButton tone="brand" onClick={() => setEditClient(c)} icon={Pencil}>
                            Editar
                          </SoftButton>

                          <SoftButton
                            tone="danger"
                            onClick={() => {
                              const ok = confirm(`Remover "${c.name}" das pendências?`);
                              if (ok) removeClient(c.id);
                            }}
                            icon={Trash2}
                          >
                            Remover
                          </SoftButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE */}
      <AnimatePresence>
        {createOpen && (
          <ClientModal
            mode="create"
            initial={{
              name: "",
              address: "",
              cpf: "",
              phone: "",
              email: "",
              birthDate: "",
              note: "",
              tag: "",
              priority: "media",
            }}
            onClose={() => setCreateOpen(false)}
            onSave={(payload) => {
              if (!String(payload.name || "").trim()) return;
              addClient(payload);
              setCreateOpen(false);
              setQuery("");
            }}
          />
        )}
      </AnimatePresence>

      {/* VIEW (TIMELINE UNIFICADO) */}
      <AnimatePresence>
        {viewClient && (
          (() => {
            const totalCompras = sumPurchases(viewClient);
            const totalPago = sumPayments(viewClient);
            const saldo = Math.max(0, totalCompras - totalPago);

            const payments = Array.isArray(viewClient.payments) ? viewClient.payments : [];
            const purchases = Array.isArray(viewClient.purchases) ? viewClient.purchases : [];

            const timeline = [
              ...purchases.map((p) => ({
                kind: "purchase",
                id: p.id,
                date: p.date,
                time: p.time,
                code: p.code,
                total: Number(p.total || 0),
                itemsCount: p.itemsCount ?? (p.items?.length ?? 0),
                paidAtSale: Number(p.paidAtSale || 0),
                pendingAtSale:
                  Number(p.pendingAtSale || 0) ||
                  Math.max(0, Number(p.total || 0) - Number(p.paidAtSale || 0)),
                paidMethodAtSale: p.paidMethodAtSale || "",
                raw: p,
                // ✅ Novos campos de quitação
                status: p.status,
                settledDate: p.settledDate,
                settledTime: p.settledTime,
                settledMethod: p.settledMethod,
              })),

              ...payments.map((pay) => ({
                kind: "payment",
                id: pay.id,
                date: pay.date,
                time: pay.time,
                amount: Number(pay.amount || 0),
                method: pay.method || "—",
                raw: pay,
              })),
            ].sort((a, b) =>
              `${b.date || ""} ${b.time || ""}`.localeCompare(`${a.date || ""} ${a.time || ""}`)
            );

            return (
              <ModalShell
                title={`Pendências de: ${viewClient.name || "—"}`}
                subtitle="Extrato de compras e pagamentos."
                onClose={() => setViewClient(null)}
                footer={
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <SoftButton onClick={() => setViewClient(null)}>Fechar</SoftButton>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="mr-0 sm:mr-2">
                        <div className="text-xs text-zinc-500">Total da pendência</div>
                        <div className="text-lg font-extrabold">{formatBRL(saldo)}</div>
                        {(totalPago > 0 || totalCompras > 0) ? (
                          <div className="text-xs text-zinc-500">
                            Pago: {formatBRL(totalPago)} • Compras: {formatBRL(totalCompras)}
                          </div>
                        ) : null}
                      </div>

                      <SoftButton
                        tone="brand"
                        onClick={() => setPayPartialOpen(true)}
                      >
                        Pagamento Parcial
                      </SoftButton>

                      <PrimaryButton
                        tone="success"
                        onClick={() => setPayFullOpen(true)}
                      >
                        Pagamento
                      </PrimaryButton>

                      <SoftButton
                        tone="brand"
                        icon={Pencil}
                        onClick={() => {
                          setEditClient(viewClient);
                          setViewClient(null);
                        }}
                      >
                        Editar cliente
                      </SoftButton>
                    </div>
                  </div>
                }
              >
                <div className="space-y-3">
                  {timeline.length === 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                      Nenhum registro para este cliente.
                    </div>
                  ) : (
                    timeline.map((row) => {
                      if (row.kind === "payment") {
                        return (
                          <div
                            key={row.id}
                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-900/40 dark:bg-emerald-950/20"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-bold text-emerald-800 dark:text-emerald-200">Pagamento parcial</div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                  {row.date || "—"} {row.time || ""} • Forma: {row.method || "—"}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                                  - {formatBRL(row.amount || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // purchase
                      return (
                        <button
                          key={row.id}
                          onClick={() => setViewPurchase({ client: viewClient, purchase: row.raw })}
                          className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold">
                                Compra • {row.date || "—"} {row.time || ""}
                              </div>
                              <div className="text-xs text-zinc-500">
                                Código: {row.code || "—"} • Itens: {row.itemsCount}
                              </div>

                              {/* ✅ Mostra o que aconteceu na hora + badge de quitação */}
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge tone="brand">Total: {formatBRL(row.total)}</Badge>

                                {row.status === "settled" ? (
                                  <Badge tone="success">
                                    Quitada em {row.settledDate || "—"} {row.settledTime || ""} • {row.settledMethod || "—"}
                                  </Badge>
                                ) : (
                                  <Badge tone="warning">
                                    Em aberto • Restante: {formatBRL(getPurchaseRemaining(row))}
                                  </Badge>
                                )}

                                {Number(row.paidAtSale || 0) > 0 && (
                                  <div className="w-full mt-1 text-xs text-zinc-500">
                                    Parcial na hora: {formatBRL(row.paidAtSale)} • Pendente inicial: {formatBRL(row.pendingAtSale || 0)} • {row.paidMethodAtSale || ""}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-zinc-500">Clique para ver itens</div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ModalShell>
            );
          })()
        )}
      </AnimatePresence>

      {/* VIEW PURCHASE ITEMS (ITENS DA COMPRA) */}
      <AnimatePresence>
        {viewPurchase?.purchase && (
          <ModalShell
            title={`Itens da compra ${viewPurchase.purchase.code || ""}`}
            subtitle={`Cliente: ${viewPurchase.client?.name || ""} • ${viewPurchase.purchase.date || ""} ${viewPurchase.purchase.time || ""}`}
            onClose={() => setViewPurchase(null)}
            footer={
              <div className="flex justify-end">
                <SoftButton onClick={() => setViewPurchase(null)}>Fechar</SoftButton>
              </div>
            }
          >
            {/* Resumo do pagamento antes da tabela */}
            {(() => {
              const p = viewPurchase.purchase;
              const total = Number(p.total || 0);
              const paidAtSale = Number(p.paidAtSale || 0);
              const pendingAtSale =
                Number(p.pendingAtSale || 0) || Math.max(0, total - paidAtSale);

              return (
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-xs text-zinc-500">Data / Hora</div>
                    <div className="mt-1 font-bold">{p.date || "—"} {p.time || ""}</div>
                    <div className="text-xs text-zinc-400">Código: {p.code || "—"}</div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-xs text-zinc-500">Total</div>
                    <div className="mt-1 text-lg font-extrabold">{formatBRL(total)}</div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="text-xs text-zinc-500">Pagamento na hora</div>
                    <div className="mt-1 font-bold">
                      {paidAtSale > 0 ? formatBRL(paidAtSale) : "—"}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {p.paidMethodAtSale ? `Forma: ${p.paidMethodAtSale}` : ""}
                    </div>
                    <div className="mt-2 text-xs">
                      {pendingAtSale > 0 ? (
                        <Badge tone="warning">Virou pendência: {formatBRL(pendingAtSale)}</Badge>
                      ) : (
                        <Badge tone="success">Quitada na hora</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                    <th className="px-4 py-3 text-right">Unit</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(viewPurchase.purchase.items || []).map((it) => (
                    <tr key={it.id || `${it.productId}-${it.code}-${Math.random()}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{it.name || "—"}</div>
                        <div className="text-xs text-zinc-500">Código: {it.code || "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500">{String(it.qty ?? 0).replace(".", ",")}</td>
                      <td className="px-4 py-3 text-right text-zinc-500">{formatBRL(it.unitPrice || 0)}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatBRL(it.total || 0)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 font-bold" colSpan={3}>Total</td>
                    <td className="px-4 py-3 text-right text-lg font-extrabold">
                      {formatBRL(viewPurchase.purchase.total || 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* 8.1 Popup Pagamento Parcial */}
      <AnimatePresence>
        {payPartialOpen && viewClient && (
          <PaymentModal
            title="Pagamento Parcial"
            subtitle={`Cliente: ${viewClient.name || ""}`}
            totalDue={getBalance(viewClient)}
            mode="partial"
            onClose={() => setPayPartialOpen(false)}
            onConfirm={({ paidValue, method }) => {
              const now = new Date();
              const date = now.toISOString().slice(0, 10);
              const time = now.toTimeString().slice(0, 5);

              addPayment(viewClient.id, {
                id: uid(),
                type: "partial",
                amount: paidValue,
                method,
                date,
                time,
                createdAt: now.toISOString(),
              });

              setPayPartialOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* 8.2 Popup Pagamento Total */}
      <AnimatePresence>
        {payFullOpen && viewClient && (
          <PaymentModal
            title="Pagamento"
            subtitle={`Cliente: ${viewClient.name || ""}`}
            totalDue={getBalance(viewClient)}
            mode="full"
            onClose={() => setPayFullOpen(false)}
            onConfirm={({ paidValue, method }) => {
              const now = new Date();
              const date = now.toISOString().slice(0, 10);
              const time = now.toTimeString().slice(0, 5);

              // ✅ registra pagamento total e quita compras sem apagar histórico
              addPayment(viewClient.id, {
                id: uid(),
                type: "full_settlement",
                amount: paidValue,    // no seu modal full você já garante >= totalDue
                method,
                date,
                time,
                createdAt: now.toISOString(),
                ref: "full_settlement",
              });

              setPayFullOpen(false);
              setViewClient(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* EDIT */}
      <AnimatePresence>
        {editClient && (
          <ClientModal
            mode="edit"
            initial={{
              name: editClient.name || "",
              address: editClient.address || "",
              cpf: editClient.cpf || "",
              phone: editClient.phone || "",
              email: editClient.email || "",
              birthDate: editClient.birthDate || "",
              note: editClient.note || "",
              tag: editClient.tag || "",
              priority: editClient.priority || "media",
            }}
            onClose={() => setEditClient(null)}
            onSave={(payload) => {
              if (!String(payload.name || "").trim()) return;
              updateClient(editClient.id, payload);
              setEditClient(null);
            }}
            onRemove={() => {
              const ok = confirm(`Remover "${editClient.name}" das pendências?`);
              if (ok) removeClient(editClient.id);
              setEditClient(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* DICA */}
      <Card className="border-l-4 border-l-amber-500">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold">Dica rápida</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Use <b>Tag</b> para classificar (“Cobrança”, “Entrega”, “Orçamento”) e <b>Prioridade</b> para decidir o que fazer primeiro.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------
// Modal: Create / Edit
// -----------------------------
function ClientModal({ mode = "create", initial, onClose, onSave, onRemove }) {
  const [name, setName] = useState(initial.name || "");
  const [address, setAddress] = useState(initial.address || "");
  const [cpf, setCpf] = useState(initial.cpf || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [email, setEmail] = useState(initial.email || "");
  const [birthDate, setBirthDate] = useState(initial.birthDate || "");
  const [note, setNote] = useState(initial.note || "");
  const [tag, setTag] = useState(initial.tag || "");
  const [priority, setPriority] = useState(initial.priority || "media");

  const canSave = String(name || "").trim().length > 0;

  const payload = {
    name: String(name || "").trim(),
    address: String(address || "").trim(),
    cpf: onlyDigits(cpf),
    phone: onlyDigits(phone),
    email: String(email || "").trim(),
    birthDate: String(birthDate || "").trim(),
    note: String(note || "").trim(),
    tag: String(tag || "").trim(),
    priority,
  };

  return (
    <ModalShell
      title={mode === "create" ? "Incluir novo cliente" : "Editar cliente pendente"}
      subtitle="Todos os campos são opcionais (exceto nome)."
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SoftButton onClick={onClose}>Cancelar</SoftButton>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {mode === "edit" && onRemove ? (
              <SoftButton tone="danger" icon={Trash2} onClick={onRemove}>
                Remover
              </SoftButton>
            ) : null}

            <PrimaryButton
              tone="success"
              onClick={() => onSave(payload)}
              disabled={!canSave}
              icon={CheckCircle2}
            >
              {mode === "create" ? "Salvar cliente" : "Salvar alterações"}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Input autoFocus label="Nome" value={name} onChange={setName} placeholder="Ex: João da Silva" />
        <Select
          label="Prioridade"
          value={priority}
          onChange={setPriority}
          options={[
            { value: "alta", label: "Alta" },
            { value: "media", label: "Média" },
            { value: "baixa", label: "Baixa" },
          ]}
        />

        <Input label="Telefone" value={formatPhone(phone)} onChange={setPhone} placeholder="(67) 99999-9999" />
        <Input label="Email" value={email} onChange={setEmail} placeholder="cliente@email.com" />

        <Input label="CPF" value={formatCPF(cpf)} onChange={setCpf} placeholder="000.000.000-00" />
        <Input label="Data de nascimento" type="date" value={birthDate} onChange={setBirthDate} />

        <div className="md:col-span-2">
          <Input label="Endereço" value={address} onChange={setAddress} placeholder="Rua, número, bairro, cidade..." />
        </div>

        <Input label="Tag (opcional)" value={tag} onChange={setTag} placeholder="Ex: Cobrança / Entrega / Orçamento" />

        <div className="md:col-span-2">
          <TextArea label="Observação" value={note} onChange={setNote} placeholder="Anote o motivo da pendência..." />
        </div>
      </div>
    </ModalShell>
  );
}

// -----------------------------
// Componente de Modal de Pagamento
// -----------------------------
function parseMoneyBR(v) {
  const s = String(v ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function PaymentModal({ title, subtitle, totalDue, mode, onClose, onConfirm }) {
  const [method, setMethod] = useState("Dinheiro");
  const [valueStr, setValueStr] = useState("");

  const paidValue = parseMoneyBR(valueStr);
  const change = Math.max(0, paidValue - (Number(totalDue) || 0));
  const remainingAfter = Math.max(0, (Number(totalDue) || 0) - paidValue);

  const canConfirm =
    mode === "partial"
      ? paidValue > 0
      : paidValue >= (Number(totalDue) || 0); // pagamento total não permite menor que a pendência

  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <SoftButton onClick={onClose}>Cancelar</SoftButton>

          <PrimaryButton
            tone="success"
            disabled={!canConfirm}
            onClick={() => onConfirm({ paidValue, method })}
          >
            Confirmar
          </PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Total da pendência</div>
          <div className="mt-1 text-2xl font-extrabold">{formatBRL(totalDue || 0)}</div>

          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            {paidValue > 0 ? (
              <>
                <div>
                  {change > 0 ? (
                    <span className="font-bold">Troco: {formatBRL(change)}</span>
                  ) : (
                    <span>Restante: <b>{formatBRL(remainingAfter)}</b></span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-zinc-500">Informe o valor recebido.</span>
            )}
          </div>
        </div>

        <div className="grid gap-3">
          <Input
            label="Valor recebido"
            value={valueStr}
            onChange={setValueStr}
            placeholder="Ex: 50,00"
          />

          <Select
            label="Forma de pagamento"
            value={method}
            onChange={setMethod}
            options={[
              { value: "Dinheiro", label: "Dinheiro" },
              { value: "Pix", label: "Pix" },
              { value: "Cartão", label: "Cartão" },
              { value: "Boleto", label: "Boleto" },
              { value: "Transferência", label: "Transferência" },
              { value: "Outros", label: "Outros" },
            ]}
          />

          {mode === "full" && paidValue > 0 && paidValue < (Number(totalDue) || 0) ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
              Para <b>Pagamento</b>, o valor não pode ser menor que a pendência ({formatBRL(totalDue || 0)}).
            </div>
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}