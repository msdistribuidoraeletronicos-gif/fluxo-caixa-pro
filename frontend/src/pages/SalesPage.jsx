// src/pages/SalesPage.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";

import {
  Card,
  Badge,
  SoftButton,
  PrimaryButton,
  Input,
  Select,
  cx,
  ModalShell,
} from "../shared/ui";

import { todayISO, parseNumber, formatBRL, uid } from "../shared/utils";

// -----------------------------
// VENDAS (Visão Geral e Histórico)
// -----------------------------
export function SalesView({ sales, onStart }) {
  const [viewSale, setViewSale] = useState(null);
  const today = todayISO();

  // KPIs baseados APENAS no dia de hoje
  const todaySales = (sales || []).filter((s) => s.date === today);
  const paidToday = todaySales.filter((s) => s.status !== "pending");
  const pendingToday = todaySales.filter((s) => s.status === "pending");

  const totalDay = paidToday.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalPendingDay = pendingToday.reduce(
    (sum, s) => sum + (s.total || 0),
    0
  );

  const historyList = (sales || []).slice(0, 50);

  // ✅ 1. Atalho ENTER para abrir o PDV
  useEffect(() => {
    const handler = (e) => {
      // não dispara se tiver modal aberto (detalhes da venda)
      if (viewSale) return;

      // evita em inputs (por segurança)
      const el = e.target;
      const tag = String(el?.tagName || "").toLowerCase();
      const typing =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el?.isContentEditable;
      if (typing) return;

      if (e.key === "Enter") {
        e.preventDefault();
        onStart?.(); // ✅ vai para o PDV
      }
    };

    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [onStart, viewSale]);

  return (
    <div className="grid gap-6">
      <Card className="text-center">
        <h2 className="text-xl font-bold">Vendas</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Faça vendas rápidas por código e acompanhe o dia.
        </p>

        <div className="mt-6 flex justify-center">
          <PrimaryButton onClick={onStart} className="px-8 py-3 text-base">
            Realizar Venda (ENTER)
          </PrimaryButton>
        </div>

        <div className="mt-6 text-sm text-zinc-500">
          Total recebido hoje:{" "}
          <span className="font-bold text-emerald-600">
            {formatBRL(totalDay)}
          </span>
          {" • "}
          Pendências hoje:{" "}
          <span className="font-bold text-amber-600">
            {formatBRL(totalPendingDay)}
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h3 className="font-bold">Últimas Vendas</h3>
          <p className="text-xs text-zinc-500">
            Mostrando os 50 registros mais recentes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Qtd. Itens</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4">Pagamento</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {historyList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-zinc-500">
                    Nenhuma venda registrada ainda.
                  </td>
                </tr>
              ) : (
                historyList.map((s) => {
                  const isToday = s.date === today;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setViewSale(s)}
                      className={cx(
                        "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                        isToday ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                      )}
                    >
                      <td className="px-6 py-4 text-zinc-500">
                        {isToday && (
                          <span
                            className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500"
                            title="Hoje"
                          />
                        )}
                        {isToday ? s.time : `${s.date.slice(5)} ${s.time}`}
                      </td>
                      <td className="px-6 py-4 font-medium">{s.code}</td>

                      <td className="px-6 py-4">
                        {s.status === "pending" ? (
                          <Badge tone="warning">PENDENTE</Badge>
                        ) : (
                          <Badge tone="success">PAGA</Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 text-zinc-500">
                        {s.itemsCount ??
                          (s.items || []).reduce(
                            (acc, it) => acc + Math.abs(Number(it.qty || 0)),
                            0
                          )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {formatBRL(s.total)}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const pays = Array.isArray(s.payments)
                            ? s.payments
                            : [];
                          const methods = pays.length
                            ? [
                                ...new Set(
                                  pays.map((p) => p.method).filter(Boolean)
                                ),
                              ].join(" + ")
                            : s.payment || "—";

                          return <Badge tone="brand">{methods || "—"}</Badge>;
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Detalhes da Venda */}
      <AnimatePresence>
        {viewSale && (
          <ModalShell
            title={`Venda ${viewSale.code || ""}`}
            subtitle={`${viewSale.date || ""} ${viewSale.time || ""}`}
            onClose={() => setViewSale(null)}
          >
            {(() => {
              const items = Array.isArray(viewSale.items) ? viewSale.items : [];
              const pays = Array.isArray(viewSale.payments)
                ? viewSale.payments
                : [];

              const timeline = [
                ...items.map((it) => ({
                  kind: "item",
                  id: it.id || uid(),
                  date: viewSale.date,
                  time: viewSale.time,
                  ...it,
                })),
                ...pays.map((p) => ({ kind: "payment", ...p })),
              ].sort((a, b) =>
                `${b.date || ""} ${b.time || ""}`.localeCompare(
                  `${a.date || ""} ${a.time || ""}`
                )
              );

              const paidTotal =
                viewSale.status === "pending"
                  ? 0
                  : pays.length
                  ? pays.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
                  : Number(viewSale.total || 0);

              const total = Number(viewSale.total || 0);

              return (
                <div className="space-y-3">
                  <div className="mb-2">
                    {viewSale.status === "pending" ? (
                      <Badge tone="warning">
                        VENDA PENDENTE (não entrou no caixa)
                      </Badge>
                    ) : (
                      <Badge tone="success">VENDA PAGA</Badge>
                    )}
                  </div>

                  {timeline.length === 0 ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                      Nenhum registro.
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
                                <div className="font-bold text-emerald-800 dark:text-emerald-200">
                                  Pagamento
                                </div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                  {row.date || "—"} {row.time || ""} • Forma:{" "}
                                  {row.method || "—"}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                                  {formatBRL(row.amount || 0)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={row.id}
                          className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900/40"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold">{row.name || "—"}</div>
                              <div className="text-xs text-zinc-500">
                                Código: {row.code || "—"} • Qtd:{" "}
                                {String(row.qty ?? 0).replace(".", ",")}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-extrabold">
                                {formatBRL(row.total || 0)}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {formatBRL(row.unitPrice || 0)} un
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div className="mt-6 flex items-center justify-between">
                    <SoftButton onClick={() => setViewSale(null)}>
                      Fechar
                    </SoftButton>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500">Total</div>
                      <div className="text-lg font-extrabold">
                        {formatBRL(total)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Pago: {formatBRL(paidTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------
// NAVEGAÇÃO DO PDV
// -----------------------------
export function POSNavigation({ active, onOpen }) {
  const items = [
    { key: "search", label: "Pesquisa (F3)" },
    { key: "discount", label: "Desconto (F4)" },
    { key: "return", label: "Troca (F5)" },
    { key: "partial", label: "Parcial (F6)" },
    { key: "pendencia", label: "Pendência (F8)" },
    { key: "finish", label: "Concluir (F12)" },
  ];

  return (
    <nav className="mt-6 flex overflow-x-auto border-b border-zinc-200 pb-1 dark:border-zinc-800">
      {items.map((n) => (
        <button
          key={n.key}
          onClick={() => onOpen(n.key)}
          className={cx(
            "flex min-w-[120px] flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition",
            active === n.key
              ? "border-blue-600 text-blue-500"
              : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          )}
        >
          {n.label}
        </button>
      ))}
    </nav>
  );
}

// -----------------------------
// PDV (POS View)
// -----------------------------
export function POSView({
  products,
  pendencias = [],
  onAddPendencia,
  onBack,
  onFinishSale,
  posModal,
  setPosModal,
}) {
  const [codeInput, setCodeInput] = useState("");
  const [cart, setCart] = useState([]);
  const [discountState, setDiscountState] = useState({
    mode: "none",
    scope: "total",
    value: 0,
    lineId: null,
  });
  const [payments, setPayments] = useState([]);
  const [qtyModal, setQtyModal] = useState({ open: false, prod: null });

  // --- NOVOS ESTADOS PARA CANCELAMENTO ---
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelQtyModal, setCancelQtyModal] = useState({
    open: false,
    line: null,
  });

  // ✅ 2. Ref para focar no input de código
  const codeInputRef = useRef(null);

  useEffect(() => {
    // sempre que entrar no PDV ou fechar modal, volta foco pro código
    if (
      !posModal &&
      !qtyModal.open &&
      !cancelModalOpen &&
      !cancelQtyModal.open
    ) {
      requestAnimationFrame(() => {
        codeInputRef.current?.focus();
        codeInputRef.current?.select?.();
      });
    }
  }, [posModal, qtyModal.open, cancelModalOpen, cancelQtyModal.open]);

  // abre “Deseja cancelar a venda?”
  const handleCancelClick = () => {
    if (!cart || cart.length === 0) {
      onBack?.();
      return;
    }
    setCancelModalOpen(true);
  };

  const openFinish = () => {
    if (cart.length === 0) return;
    setPosModal("finish");
  };

  // ✅ 3. Atalhos Globais do PDV (Corrigido para permitir F-keys enquanto digita)
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

    const isFnKey = (key) => /^F([1-9]|1[0-2])$/i.test(String(key || ""));

    const handler = (e) => {
      const k = String(e.key || "").toUpperCase();

      // ✅ sempre captura ESC (mesmo digitando)
      if (k === "ESCAPE") {
        e.preventDefault();

        if (cancelQtyModal.open)
          return setCancelQtyModal({ open: false, line: null });
        if (cancelModalOpen) return setCancelModalOpen(false);
        if (qtyModal.open) return setQtyModal({ open: false, prod: null });
        if (posModal) return setPosModal(null);

        return handleCancelClick();
      }

      // ✅ se estiver digitando, só deixa passar TECLAS DE FUNÇÃO (F1..F12)
      const typing = isTypingTarget(e.target);
      const fn = isFnKey(k);

      if (typing && !fn) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // se tiver modal aberto, deixa o modal tratar (mas F-keys ainda podem abrir, se quiser)
      if (posModal || qtyModal.open || cancelModalOpen || cancelQtyModal.open)
        return;

      // ✅ atalhos do menu do PDV
      if (k === "F3") {
        e.preventDefault();
        setPosModal("search");
        return;
      }
      if (k === "F4") {
        e.preventDefault();
        setPosModal("discount");
        return;
      }
      if (k === "F5") {
        e.preventDefault();
        setPosModal("return");
        return;
      }
      if (k === "F6") {
        e.preventDefault();
        setPosModal("partial");
        return;
      }
      if (k === "F8") {
        e.preventDefault();
        setPosModal("pendencia");
        return;
      }
      if (k === "F12") {
        e.preventDefault();
        openFinish();
        return;
      }
      if (k === "F9") {
        e.preventDefault();
        handleCancelClick();
        return;
      }
    };

    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [
    posModal,
    qtyModal.open,
    cancelModalOpen,
    cancelQtyModal.open,
    handleCancelClick,
    openFinish,
  ]);

  // cancelar item por quantidade
  const applyCancelItem = (lineId, qtyToCancel) => {
    const q = Math.max(0, Number(qtyToCancel || 0));
    if (!q) return;

    setCart((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const idx = list.findIndex((x) => x.id === lineId);
      if (idx < 0) return list;

      const line = { ...list[idx] };

      // Trabalha com quantidade positiva
      const currentQty = Math.abs(Number(line.qty || 0));
      const cancelQty = Math.min(currentQty, q);
      const newQty = currentQty - cancelQty;

      if (newQty <= 0) {
        list.splice(idx, 1);
        return list;
      }

      const sign = Number(line.qty || 0) < 0 ? -1 : 1;
      line.qty = sign * newQty;
      line.total = Number(line.unitPrice || 0) * line.qty;

      list[idx] = line;
      return list;
    });
  };

  // cancelar venda completa
  const cancelFullSale = () => {
    // Como tem confirmação no Modal (ENTER), aqui executamos direto
    setCart([]);
    setDiscountState({
      mode: "none",
      scope: "total",
      value: 0,
      lineId: null,
    });
    setPayments([]);
    setPosModal(null);

    setCancelModalOpen(false);
    setCancelQtyModal({ open: false, line: null });

    onBack?.();
  };

  const [savingPendencia, setSavingPendencia] = useState(false);

  const onlyDigits = (s) => String(s || "").replace(/\D/g, "");
  const normName = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const buildIdentityKey = (client) => {
    const cpf = onlyDigits(client?.cpf).slice(0, 11);
    if (cpf) return `cpf:${cpf}`;
    const phone = onlyDigits(client?.phone).slice(0, 11);
    if (phone) return `phone:${phone}`;
    const name = normName(client?.name);
    if (name) return `name:${name}`;
    return null;
  };

  const findByCode = (code) =>
    (products || []).find(
      (p) => String(p.code || "").trim() === String(code || "").trim()
    );

  const parseEntry = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return null;

    if (s.includes("*")) {
      const [qRaw, cRaw] = s.split("*");
      const qty = parseNumber(qRaw);
      const code = String(cRaw || "").trim();
      if (!code) return null;
      return { qty: qty > 0 ? qty : 1, code };
    }

    return { qty: 1, code: s };
  };

  const addProductLine = ({ prod, qty, negative = false }) => {
    const unit = Number(prod.price || 0);
    const q = negative ? -Math.abs(qty) : Math.abs(qty);

    setCart((prev) => {
      const list = Array.isArray(prev) ? [...prev] : [];
      const sameTypeSign = q < 0 ? -1 : 1;

      const idx = list.findIndex((x) => {
        const sign = Number(x.qty || 0) < 0 ? -1 : 1;
        return x.productId === prod.id && sign === sameTypeSign;
      });

      if (idx < 0) {
        const line = {
          id: uid(),
          productId: prod.id,
          code: prod.code,
          name: prod.name,
          qty: q,
          unitPrice: unit,
          total: unit * q,
          photo: prod.photo || "",
        };
        return [line, ...list];
      }

      const line = { ...list[idx] };
      line.qty = Number(line.qty || 0) + q;
      line.total = Number(line.unitPrice || 0) * Number(line.qty || 0);

      if (Number(line.qty || 0) === 0) {
        list.splice(idx, 1);
        return list;
      }

      list.splice(idx, 1);
      return [line, ...list];
    });
  };

  const addByInput = () => {
    const entry = parseEntry(codeInput);
    if (!entry) return;

    const prod = findByCode(entry.code);
    if (!prod) {
      alert(`Produto não encontrado para o código: ${entry.code}`);
      return;
    }

    addProductLine({ prod, qty: entry.qty, negative: false });
    setCodeInput("");
  };

  const removeLine = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const subtotal = cart.reduce((s, i) => s + (i.total || 0), 0);

  const discountValue = useMemo(() => {
    const { mode, scope, value, lineId } = discountState || {};
    const v = Number(value || 0);
    if (!mode || mode === "none" || v <= 0) return 0;

    if (scope === "item" && lineId) {
      const line = cart.find((x) => x.id === lineId);
      if (!line) return 0;
      const base = Math.max(0, line.total);
      if (mode === "amount") return Math.min(base, v);
      if (mode === "percent") return Math.min(base, (base * v) / 100);
      return 0;
    }

    const base = Math.max(0, subtotal);
    if (mode === "amount") return Math.min(base, v);
    if (mode === "percent") return Math.min(base, (base * v) / 100);
    return 0;
  }, [discountState, cart, subtotal]);

  const total = Math.max(0, subtotal - discountValue);

  const paidSoFar = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remaining = Math.max(0, total - paidSoFar);

  const finalize = (finalPayment) => {
    const now = new Date();
    const date = todayISO();
    const time = now.toTimeString().slice(0, 5);
    const saleCode = `V${now.getTime().toString().slice(-6)}`;

    const allPayments = [...payments];
    if (finalPayment?.amountCharged > 0) {
      const nowPay = new Date();
      const datePay = todayISO();
      const timePay = nowPay.toTimeString().slice(0, 5);

      allPayments.push({
        id: uid(),
        amount: finalPayment.amountCharged,
        method: finalPayment.method,
        date: datePay,
        time: timePay,
        at: nowPay.toISOString(),
      });
    }

    const sale = {
      id: uid(),
      date,
      time,
      code: saleCode,
      items: cart,
      itemsCount: cart.reduce((s, it) => s + Math.abs(Number(it.qty || 0)), 0),
      subtotal,
      discount: discountValue,
      total,
      payments: allPayments,
      payment: finalPayment?.method || (allPayments[0]?.method ?? "—"),
      paid: allPayments.reduce((s, p) => s + (p.amount || 0), 0),
      change: finalPayment?.change ?? 0,
      status: "paid",
    };

    setCart([]);
    setDiscountState({
      mode: "none",
      scope: "total",
      value: 0,
      lineId: null,
    });
    setPayments([]);
    setPosModal(null);

    onFinishSale(sale, sale.payment);
  };

  const applyPartial = ({ method, amount }) => {
    const amt = Math.max(0, Number(amount || 0));
    if (!amt) return;

    const charged = Math.min(remaining, amt);

    const now = new Date();
    const date = todayISO();
    const time = now.toTimeString().slice(0, 5);

    setPayments((prev) => [
      ...prev,
      {
        id: uid(),
        amount: charged,
        method,
        date,
        time,
        at: now.toISOString(),
      },
    ]);

    setPosModal(null);
  };

  const closeModal = () => {
    setPosModal(null);
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Realizar Venda</h2>
          <p className="text-sm text-zinc-500">
            Código + Enter. Produto por peso: <b>1,25*CODIGO</b>
          </p>
        </div>
        <SoftButton onClick={handleCancelClick}>Cancelar (F9/ESC)</SoftButton>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-3 md:items-end">
          <label className="block space-y-1.5 md:col-span-2">
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Código do produto
            </div>
            {/* ✅ Input principal com Ref e Foco */}
            <input
              ref={codeInputRef}
              autoFocus
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addByInput()}
              placeholder="Ex: 123  |  1,25*123"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>

          <PrimaryButton onClick={addByInput} className="w-full">
            Inserir
          </PrimaryButton>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Subtotal</div>
            <div className="mt-1 text-lg font-extrabold">
              {formatBRL(subtotal)}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Desconto</div>
            <div className="mt-1 text-lg font-extrabold">
              {formatBRL(discountValue)}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Pago (parcial)</div>
            <div className="mt-1 text-lg font-extrabold">
              {formatBRL(paidSoFar)}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="text-xs text-emerald-700 dark:text-emerald-200">
              Restante
            </div>
            <div className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-200">
              {formatBRL(remaining)}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div>
            <h3 className="font-bold">Itens da Venda</h3>
            <p className="text-xs text-zinc-500">
              Devolução entra negativa e subtrai do total.
            </p>
          </div>

          <div>
            <PrimaryButton
              onClick={() => {
                if (cart.length === 0)
                  return alert(
                    "Adicione itens no carrinho para concluir a venda."
                  );
                openFinish();
              }}
              tone="success"
            >
              Concluir Venda (F12)
            </PrimaryButton>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4 text-right">Qtd/Peso</th>
                <th className="px-6 py-4 text-right">Unit</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {cart.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-zinc-500"
                  >
                    Nenhum item ainda. Digite um código e pressione Enter.
                  </td>
                </tr>
              ) : (
                cart.map((i) => (
                  <tr
                    key={i.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {i.photo ? (
                          <img
                            src={i.photo}
                            alt={i.name}
                            className="h-10 w-10 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
                        )}

                        <div>
                          <div className="font-medium">{i.name}</div>
                          <div className="text-xs text-zinc-500">
                            Código: {i.code}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right text-zinc-500">
                      {String(i.qty).replace(".", ",")}
                    </td>

                    <td className="px-6 py-4 text-right text-zinc-500">
                      {formatBRL(i.unitPrice)}
                    </td>

                    <td
                      className={cx(
                        "px-6 py-4 text-right font-bold",
                        i.total < 0 ? "text-rose-500" : ""
                      )}
                    >
                      {formatBRL(i.total)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => removeLine(i.id)}
                        className="text-sm font-semibold text-rose-500 hover:text-rose-400"
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
        {/* ✅ MODAIS DE CANCELAMENTO INSERIDOS AQUI */}
        {cancelModalOpen && (
          <CancelSaleModal
            cart={cart}
            onClose={() => setCancelModalOpen(false)}
            onPickLine={(line) => setCancelQtyModal({ open: true, line })}
            onCancelFull={cancelFullSale}
          />
        )}

        {cancelQtyModal.open && (
          <CancelQuantityModal
            line={cancelQtyModal.line}
            onClose={() => setCancelQtyModal({ open: false, line: null })}
            onConfirm={(qty) => {
              applyCancelItem(cancelQtyModal.line?.id, qty);
              setCancelQtyModal({ open: false, line: null });
            }}
          />
        )}

        {posModal === "search" && (
          <SearchModal
            products={products || []}
            onClose={closeModal}
            onPick={(prod) => {
              setQtyModal({ open: true, prod });
              setPosModal(null);
            }}
          />
        )}

        {qtyModal.open && (
          <QuantityModal
            product={qtyModal.prod}
            onClose={() => setQtyModal({ open: false, prod: null })}
            onConfirm={(qty) => {
              addProductLine({
                prod: qtyModal.prod,
                qty,
                negative: false,
              });
              setQtyModal({ open: false, prod: null });
              closeModal();
            }}
          />
        )}

        {posModal === "discount" && (
          <DiscountModal
            cart={cart}
            current={discountState}
            onClose={closeModal}
            onApply={(next) => {
              setDiscountState(next);
              closeModal();
            }}
          />
        )}

        {posModal === "return" && (
          <ReturnModal
            products={products || []}
            onClose={closeModal}
            onReturn={(prod, qty) => {
              addProductLine({ prod, qty, negative: true });
              closeModal();
            }}
          />
        )}

        {posModal === "partial" && (
          <PartialModal
            remaining={remaining}
            onClose={closeModal}
            onConfirm={applyPartial}
          />
        )}

        {posModal === "pendencia" && (
          <PendenciaModal
            pendencias={pendencias}
            onClose={closeModal}
            onConfirm={async (client) => {
              if (!client?.id) return;
              if (savingPendencia) return;
              setSavingPendencia(true);

              try {
                const now = new Date();
                const paidAtSale = (payments || []).reduce(
                  (s, p) => s + (Number(p.amount) || 0),
                  0
                );

                const methodsAtSale = (payments || [])
                  .map((p) => p.method)
                  .filter(Boolean);

                const paidMethodAtSale = methodsAtSale.length
                  ? [...new Set(methodsAtSale)].join(" + ")
                  : "";

                const pendingAtSale = Math.max(0, total - paidAtSale);

                const purchase = {
                  id: uid(),
                  date: todayISO(),
                  time: now.toTimeString().slice(0, 5),
                  code: `P${now.getTime().toString().slice(-6)}`,
                  items: cart.map((i) => ({ ...i })),
                  itemsCount: cart.reduce(
                    (s, it) => s + Math.abs(Number(it.qty || 0)),
                    0
                  ),
                  subtotal,
                  discount: discountValue,
                  total,
                  createdAt: now.toISOString(),
                  paymentsAtSale: (payments || []).map((p) => ({ ...p })),
                  paidAtSale,
                  paidMethodAtSale,
                  pendingAtSale,
                  _dedupeKey: `${todayISO()}_${now
                    .toTimeString()
                    .slice(0, 5)}_${total}_${cart.length}`,
                };

                const identityKey = buildIdentityKey(client);

                const ok = window.confirm(
                  `Deseja anotar como pendente ao cliente "${client.name}"?`
                );
                if (!ok) return;

                onAddPendencia?.(client.id, purchase, {
                  identityKey,
                  clientSnapshot: {
                    id: client.id,
                    name: client.name,
                    phone: client.phone,
                    cpf: client.cpf,
                    email: client.email,
                  },
                });

                setCart([]);
                setDiscountState({
                  mode: "none",
                  scope: "total",
                  value: 0,
                  lineId: null,
                });
                setPayments([]);
                closeModal();
                onBack?.();
              } finally {
                setSavingPendencia(false);
              }
            }}
          />
        )}

        {posModal === "finish" && (
          <FinishModal
            remaining={remaining}
            onClose={() => {
              setPosModal(null);
            }}
            onConfirm={(payload) => finalize(payload)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------
// MODAIS DO POS (Com Foco e Atalhos)
// -----------------------------

function PendenciaModal({ pendencias = [], onClose, onConfirm }) {
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = pendencias || [];
    if (!s) return base.slice(0, 20);
    return base
      .filter((c) => String(c.name || "").toLowerCase().includes(s))
      .slice(0, 20);
  }, [pendencias, q]);

  // Exemplo simples de foco (Pendencia)
  const inputRef = useRef(null);
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  return (
    <ModalShell
      title="Anotar Pendência"
      subtitle="Pesquise e selecione o cliente pendente."
      onClose={onClose}
    >
      <div className="grid gap-3">
        <Input
          ref={inputRef}
          autoFocus
          label="Buscar cliente"
          value={q}
          onChange={setQ}
          placeholder="Digite o nome do cliente..."
        />

        <div className="max-h-[340px] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          {list.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500">
              Nenhum cliente encontrado.
            </div>
          ) : (
            list.map((c) => (
              <button
                key={c.id}
                onClick={() => onConfirm(c)}
                className="w-full border-b border-zinc-200 p-4 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
              >
                <div className="font-bold">{c.name || "—"}</div>
                <div className="text-xs text-zinc-500">
                  Compras pendentes:{" "}
                  {Array.isArray(c.purchases) ? c.purchases.length : 0}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <SoftButton onClick={onClose}>Fechar</SoftButton>
        </div>
      </div>
    </ModalShell>
  );
}

function QuantityModal({ product, onClose, onConfirm }) {
  const [qty, setQty] = useState("1");
  const maxQty = 999999; 

  const confirm = () => {
    const q = parseNumber(qty);
    if (!q || q <= 0) return;
    onConfirm(q);
  };

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        confirm();
        return;
      }
    };
    window.addEventListener("keydown", h, { passive: false });
    return () => window.removeEventListener("keydown", h);
  }, [onClose, qty]);

  return (
    <ModalShell
      title="Quantidade / Peso"
      subtitle={`Informe quanto será vendido: ${product?.name || ""}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">Produto</div>
          <div className="font-bold">{product?.name}</div>
          <div className="text-xs text-zinc-500">
            Código: {product?.code || "—"} • Preço:{" "}
            {formatBRL(product?.price || 0)}
          </div>
        </div>

        <Input
          autoFocus
          label="Quantidade / Peso"
          value={qty}
          onChange={setQty}
          placeholder="Ex: 1  |  2  |  1,25"
          right={<span className="text-xs">Enter</span>}
        />

        <div className="flex items-center justify-between">
          <SoftButton onClick={onClose}>Cancelar</SoftButton>
          <PrimaryButton tone="success" onClick={confirm}>
            Adicionar à venda
          </PrimaryButton>
        </div>
      </div>
    </ModalShell>
  );
}

// ✅ SearchModal com Ref e Foco
function SearchModal({ products, onClose, onPick }) {
  const [mode, setMode] = useState("name");
  const [q, setQ] = useState("");
  const qRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      qRef.current?.focus();
      qRef.current?.select?.();
    });
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", h, { passive: false });
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];

    return products.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const code = String(p.code || "").toLowerCase();
      const cat = String(p.category || "").toLowerCase();

      if (mode === "name") return name.includes(s);
      if (mode === "code") return code.includes(s);
      if (mode === "category") return cat.includes(s);
      return false;
    });
  }, [products, q, mode]);

  return (
    <ModalShell
      title="Pesquisa"
      subtitle="Busque por nome, código ou categoria."
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Tipo de pesquisa"
          value={mode}
          onChange={setMode}
          options={[
            { value: "name", label: "Nome" },
            { value: "code", label: "Código" },
            { value: "category", label: "Categoria" },
          ]}
        />
        <Input
          ref={qRef}
          autoFocus
          label="Buscar"
          value={q}
          onChange={setQ}
          placeholder="Digite para pesquisar..."
        />
      </div>

      <div className="mt-4 max-h-[340px] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        {list.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">
            Digite algo para ver resultados.
          </div>
        ) : (
          list.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="w-full border-b border-zinc-200 p-4 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-zinc-500">
                    Código: {p.code} • {p.category || "—"}
                  </div>
                </div>
                <div className="font-extrabold">{formatBRL(p.price)}</div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <SoftButton onClick={onClose}>Fechar (ESC)</SoftButton>
      </div>
    </ModalShell>
  );
}

// ✅ DiscountModal com Ref, Foco e Enter
function DiscountModal({ cart, current, onClose, onApply }) {
  const [mode, setMode] = useState(current?.mode || "amount");
  const [scope, setScope] = useState(current?.scope || "total");
  const [value, setValue] = useState(String(current?.value || ""));
  const [lineId, setLineId] = useState(
    current?.lineId || (cart[0]?.id ?? null)
  );

  const valueRef = useRef(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      valueRef.current?.focus();
      valueRef.current?.select?.();
    });
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onApply?.({
          mode,
          scope,
          value: parseNumber(value),
          lineId,
        });
      }
    };
    window.addEventListener("keydown", h, { passive: false });
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onApply, mode, scope, value, lineId]);

  return (
    <ModalShell
      title="Desconto"
      subtitle="Aplique por porcentagem ou valor. No total ou em um item."
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Tipo"
          value={mode}
          onChange={setMode}
          options={[
            { value: "amount", label: "Valor (R$)" },
            { value: "percent", label: "Porcentagem (%)" },
            { value: "none", label: "Sem desconto" },
          ]}
        />
        <Select
          label="Aplicar em"
          value={scope}
          onChange={setScope}
          options={[
            { value: "total", label: "Total da compra" },
            { value: "item", label: "Um produto" },
          ]}
        />
      </div>

      {scope === "item" && (
        <div className="mt-3">
          <Select
            label="Escolher item"
            value={lineId || ""}
            onChange={setLineId}
            options={cart.map((i) => ({
              value: i.id,
              label: `${i.name} (${formatBRL(i.total)})`,
            }))}
          />
        </div>
      )}

      <div className="mt-3">
        <Input
          ref={valueRef}
          autoFocus
          label={mode === "percent" ? "Desconto (%)" : "Desconto (R$)"}
          value={value}
          onChange={setValue}
          placeholder={mode === "percent" ? "Ex: 10" : "Ex: 5,00"}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <SoftButton onClick={onClose}>Cancelar (ESC)</SoftButton>
        <PrimaryButton
          tone="success"
          onClick={() =>
            onApply({
              mode,
              scope,
              value: parseNumber(value),
              lineId,
            })
          }
        >
          Aplicar (ENTER)
        </PrimaryButton>
      </div>
    </ModalShell>
  );
}

// ✅ ReturnModal com Ref e Foco
function ReturnModal({ products, onClose, onReturn }) {
  const [q, setQ] = useState("");
  const [qty, setQty] = useState("1");
  const qRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      qRef.current?.focus();
      qRef.current?.select?.();
    });
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", h, { passive: false });
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];

    return products.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const code = String(p.code || "").toLowerCase();
      return name.includes(s) || code.includes(s);
    });
  }, [products, q]);

  const qtyN = Math.max(0, parseNumber(qty)) || 1;

  return (
    <ModalShell
      title="Troca/Devolução"
      subtitle="Digite nome ou código. O item entra negativo e subtrai do total."
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <Input
          ref={qRef}
          autoFocus
          label="Produto (nome ou código)"
          value={q}
          onChange={setQ}
          placeholder="Ex: 123 ou Coca"
        />
        <Input
          label="Qtd/Peso (opcional)"
          value={qty}
          onChange={setQty}
          placeholder="Ex: 1 ou 1,25"
        />
      </div>

      <div className="mt-4 max-h-[320px] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        {list.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">
            Digite para listar produtos.
          </div>
        ) : (
          list.map((p) => (
            <button
              key={p.id}
              onClick={() => onReturn(p, qtyN)}
              className="w-full border-b border-zinc-200 p-4 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-zinc-500">Código: {p.code}</div>
                </div>
                <div className="font-extrabold text-rose-500">
                  -{formatBRL(Number(p.price || 0) * qtyN)}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <SoftButton onClick={onClose}>Fechar (ESC)</SoftButton>
      </div>
    </ModalShell>
  );
}

// ✅ PartialModal com F1..F5 e Enter
function PartialModal({ remaining, onClose, onConfirm }) {
  const [method, setMethod] = useState("Pix");
  const [amount, setAmount] = useState("");
  const amountRef = useRef(null);

  const focusAmount = () =>
    requestAnimationFrame(() => {
      amountRef.current?.focus();
      amountRef.current?.select?.();
    });

  useEffect(() => {
    focusAmount();
  }, []);

  useEffect(() => {
    const h = (e) => {
      const k = String(e.key || "").toUpperCase();

      if (k === "ESCAPE") {
        e.preventDefault();
        onClose?.();
        return;
      }

      // F1..F5 escolhe método e foca valor
      if (k === "F1") { e.preventDefault(); setMethod("Dinheiro"); focusAmount(); return; }
      if (k === "F2") { e.preventDefault(); setMethod("Cartão"); focusAmount(); return; }
      if (k === "F3") { e.preventDefault(); setMethod("Pix"); focusAmount(); return; }
      if (k === "F4") { e.preventDefault(); setMethod("Boleto"); focusAmount(); return; }
      if (k === "F5") { e.preventDefault(); setMethod("Cheque"); focusAmount(); return; }

      // ENTER confirma
      if (k === "ENTER") {
        e.preventDefault();
        const v = parseNumber(amount);
        if (v > 0) onConfirm?.({ method, amount: v });
      }
    };

    window.addEventListener("keydown", h, { passive: false });
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onConfirm, method, amount]);

  return (
    <ModalShell
      title="Acerto Parcial"
      subtitle="Registre um pagamento parcial e continue a venda."
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Forma de pagamento"
          value={method}
          onChange={(v) => {
            setMethod(v);
            focusAmount();
          }}
          options={[
            { value: "Dinheiro", label: "Dinheiro (F1)" },
            { value: "Cartão", label: "Cartão (F2)" },
            { value: "Pix", label: "Pix (F3)" },
            { value: "Boleto", label: "Boleto (F4)" },
            { value: "Cheque", label: "Cheque (F5)" },
          ]}
        />
        <Input
          ref={amountRef}
          autoFocus
          label="Valor pago agora (R$)"
          value={amount}
          onChange={setAmount}
          placeholder="Ex: 50,00"
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} // enter tratado global
        />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs text-zinc-500">Restante a pagar</div>
        <div className="text-xl font-extrabold">{formatBRL(remaining)}</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <SoftButton onClick={onClose}>Cancelar (ESC)</SoftButton>
        <PrimaryButton
          tone="success"
          onClick={() => onConfirm({ method, amount: parseNumber(amount) })}
          disabled={parseNumber(amount) <= 0}
        >
          Confirmar Parcial (ENTER)
        </PrimaryButton>
      </div>
    </ModalShell>
  );
}

// ✅ FinishModal com F1..F5 e Enter (sem Transferencia)
function FinishModal({ remaining, onClose, onConfirm }) {
  const [method, setMethod] = useState("Dinheiro");
  const [received, setReceived] = useState("");
  const receivedRef = useRef(null);

  const focusReceived = () =>
    requestAnimationFrame(() => {
      receivedRef.current?.focus();
      receivedRef.current?.select?.();
    });

  useEffect(() => {
    // se abrir em dinheiro, já foca
    focusReceived();
  }, []);

  const receivedN = parseNumber(received);
  const charged = remaining;
  const change = method === "Dinheiro" ? Math.max(0, receivedN - charged) : 0;
  const canFinish = method === "Dinheiro" ? receivedN >= charged : charged > 0;

  useEffect(() => {
    const h = (e) => {
      const k = String(e.key || "").toUpperCase();

      if (k === "ESCAPE") {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (k === "F1") { e.preventDefault(); setMethod("Dinheiro"); focusReceived(); return; }
      if (k === "F2") { e.preventDefault(); setMethod("Cartão"); return; }
      if (k === "F3") { e.preventDefault(); setMethod("Pix"); return; }
      if (k === "F4") { e.preventDefault(); setMethod("Boleto"); return; }
      if (k === "F5") { e.preventDefault(); setMethod("Cheque"); return; }

      if (k === "ENTER") {
        e.preventDefault();
        if (!canFinish) return;
        onConfirm?.({
          method,
          amountReceived: method === "Dinheiro" ? receivedN : charged,
          amountCharged: charged,
          change,
        });
      }
    };

    window.addEventListener("keydown", h, { passive: false });
    return () => window.removeEventListener("keydown", h);
  }, [onClose, onConfirm, method, receivedN, charged, change, canFinish]);

  return (
    <ModalShell
      title="Concluir Venda"
      subtitle="Escolha a forma de pagamento e confirme. Dinheiro calcula troco."
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Forma de pagamento"
          value={method}
          onChange={(v) => {
            setMethod(v);
            if (v === "Dinheiro") focusReceived();
          }}
          options={[
            { value: "Dinheiro", label: "Dinheiro (F1)" },
            { value: "Cartão", label: "Cartão (F2)" },
            { value: "Pix", label: "Pix (F3)" },
            { value: "Boleto", label: "Boleto (F4)" },
            { value: "Cheque", label: "Cheque (F5)" },
          ]}
        />

        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="text-xs text-emerald-700 dark:text-emerald-200">
            Valor a pagar
          </div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-200">
            {formatBRL(remaining)}
          </div>
        </div>
      </div>

      {method === "Dinheiro" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Input
            ref={receivedRef}
            autoFocus
            label="Valor recebido (R$)"
            value={received}
            onChange={setReceived}
            placeholder="Ex: 200,00"
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          />
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">Troco</div>
            <div className="text-xl font-extrabold">{formatBRL(change)}</div>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <SoftButton onClick={onClose}>Cancelar (ESC)</SoftButton>
        <PrimaryButton
          tone="success"
          onClick={() =>
            onConfirm({
              method,
              amountReceived: method === "Dinheiro" ? receivedN : charged,
              amountCharged: charged,
              change,
            })
          }
          disabled={!canFinish}
        >
          Finalizar (ENTER)
        </PrimaryButton>
      </div>
    </ModalShell>
  );
}

// ✅ CancelSaleModal (com setas UP/DOWN e ENTER)
function CancelSaleModal({ cart = [], onClose, onPickLine, onCancelFull }) {
  const lines = (cart || []).filter((l) => Math.abs(Number(l.qty || 0)) > 0);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [lines.length]);

  useEffect(() => {
    const h = (e) => {
      const k = e.key;

      if (k === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (k === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(lines.length - 1, i + 1));
        return;
      }

      if (k === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
        return;
      }

      // ENTER = cancelar venda completa
      if (k === "Enter") {
        e.preventDefault();
        onCancelFull?.();
        return;
      }

      // ESPAÇO = seleciona item para cancelar parcial
      if (k === " ") {
        e.preventDefault();
        const line = lines[idx];
        if (line) onPickLine?.(line);
        return;
      }
    };

    window.addEventListener("keydown", h, { passive: false });
    return () => window.removeEventListener("keydown", h);
  }, [lines, idx, onClose, onCancelFull, onPickLine]);

  return (
    <ModalShell
      title="Deseja cancelar a venda?"
      subtitle="Use ↑ ↓ para navegar. ENTER cancela venda completa. ESPAÇO cancela item."
      onClose={onClose}
    >
      <div className="grid gap-3">
        <div className="max-h-[340px] overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          {lines.length === 0 ? (
            <div className="p-4 text-sm text-zinc-500">
              Nenhum item para cancelar.
            </div>
          ) : (
            lines.map((i, iIdx) => (
              <button
                key={i.id}
                onClick={() => onPickLine?.(i)}
                className={cx(
                  "w-full border-b border-zinc-200 p-4 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50",
                  iIdx === idx ? "bg-blue-50/40 dark:bg-blue-900/20" : ""
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{i.name || "—"}</div>
                    <div className="text-xs text-zinc-500">
                      Código: {i.code || "—"} • Qtd:{" "}
                      {String(Math.abs(Number(i.qty || 0))).replace(".", ",")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold">
                      {formatBRL(i.total || 0)}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {formatBRL(i.unitPrice || 0)} un
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <SoftButton onClick={onClose}>Cancelar (ESC)</SoftButton>
          <PrimaryButton tone="danger" onClick={onCancelFull}>
            Cancelar venda completa (ENTER)
          </PrimaryButton>
        </div>
      </div>
    </ModalShell>
  );
}

// ✅ CancelQuantityModal (ESC/ENTER)
function CancelQuantityModal({ line, onClose, onConfirm }) {
  const [qty, setQty] = useState("1");
  const maxQty = Math.abs(Number(line?.qty || 0)) || 0;

  const confirm = () => {
    const q = parseNumber(qty);
    if (!q || q <= 0) return;
    const finalQty = Math.min(maxQty, q);
    onConfirm?.(finalQty);
  };

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (maxQty > 0) confirm();
        return;
      }
    };
    window.addEventListener("keydown", h, { passive: false });
    return () => window.removeEventListener("keydown", h);
  }, [onClose, maxQty, qty]);

  return (
    <ModalShell
      title="Quantidade a cancelar"
      subtitle={`Produto: ${line?.name || ""} (máx: ${String(maxQty).replace(
        ".",
        ","
      )})`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">Item selecionado</div>
          <div className="font-bold">{line?.name || "—"}</div>
          <div className="text-xs text-zinc-500">
            Código: {line?.code || "—"} • Unit: {formatBRL(line?.unitPrice || 0)}
          </div>
        </div>

        <Input
          autoFocus
          label="Quantidade / Peso para cancelar"
          value={qty}
          onChange={setQty}
          placeholder="Ex: 1  |  1,25"
          right={<span className="text-xs">Enter</span>}
        />

        <div className="flex items-center justify-between">
          <SoftButton onClick={onClose}>Cancelar (ESC)</SoftButton>
          <PrimaryButton tone="danger" onClick={confirm} disabled={maxQty <= 0}>
            Confirmar cancelamento (ENTER)
          </PrimaryButton>
        </div>
      </div>
    </ModalShell>
  );
}