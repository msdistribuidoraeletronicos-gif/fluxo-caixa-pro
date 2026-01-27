// src/pages/SalesPage.jsx (ou onde estiver seu POSView)
import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  User, 
  CreditCard, 
  Check, 
  X 
} from "lucide-react";

import {
  Card,
  PrimaryButton,
  SoftButton,
  Input,
  Select,
  Badge,
  cx
} from "../shared/ui"; // Ajuste o caminho conforme sua estrutura

import { formatBRL, uid, parseNumber } from "../shared/utils";

// =========================================================
// ✅ POSView: Frente de Caixa Blindado
// =========================================================
export function POSView({
  products = [],
  pendencias = [], // usado se você quiser puxar pendências
  sales = [],      // histórico (opcional aqui)
  onBack,
  onFinishSale,    // versão nova
  onFinish,        // versão antiga (compatibilidade)
  onCancelSale,
}) {
  // ✅ 1. Compatibilidade de Callback
  // Aceita qualquer um dos dois nomes para não quebrar versões antigas
  const finishCb = onFinishSale || onFinish;

  // Estados do POS
  const [items, setItems] = useState([]);
  const [term, setTerm] = useState("");
  const [clientId, setClientId] = useState("");
  const [payment, setPayment] = useState("money"); // money, card, pix...
  const [money, setMoney] = useState(""); // Valor recebido em dinheiro
  
  // Estado de carregamento para evitar duplo clique
  const [finishing, setFinishing] = useState(false);

  // Filtro de produtos
  const filteredProducts = useMemo(() => {
    if (!term) return [];
    const lower = term.toLowerCase();
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(lower) ||
        (p.code || "").toLowerCase().includes(lower)
    ).slice(0, 10); // limita a 10 sugestões
  }, [term, products]);

  // Totais
  const total = useMemo(
    () => items.reduce((acc, it) => acc + it.total, 0),
    [items]
  );
  
  const troco = useMemo(() => {
    const paid = parseNumber(money);
    return payment === "money" && paid > total ? paid - total : 0;
  }, [money, total, payment]);

  // Ações do Carrinho
  const addItem = (prod) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === prod.id
            ? { ...i, qtd: i.qtd + 1, total: (i.qtd + 1) * i.price }
            : i
        );
      }
      return [
        ...prev,
        {
          id: uid(),
          productId: prod.id,
          name: prod.name,
          price: Number(prod.price || 0),
          qtd: 1,
          total: Number(prod.price || 0),
        },
      ];
    });
    setTerm(""); // limpa busca
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // ✅ 3. Handler Seguro de Conclusão
  const handleConclude = async () => {
    if (finishing) return;

    // Validação de callback
    if (typeof finishCb !== "function") {
      console.error("POSView: callback onFinishSale/onFinish não fornecido.");
      alert("Erro interno: callback de venda não configurado.");
      return;
    }

    // Validação de itens
    if (!items.length) {
      alert("O carrinho está vazio.");
      return;
    }

    // Monta o payload da venda
    const salePayload = {
      items: items.map(i => ({
        id: i.productId,
        name: i.name,
        qty: i.qtd,
        price: i.price,
        total: i.total
      })),
      total,
      payment,
      status: "paid", // ou "pending" dependendo da lógica
      clientId,
      paidAtSale: payment === "money" ? parseNumber(money) : total,
      // outros campos necessários...
    };

    try {
      setFinishing(true);
      await finishCb(salePayload); // Chama o App.jsx
    } catch (e) {
      console.error("POSView: erro ao finalizar", e);
      alert(e?.message || "Falha ao concluir venda.");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col gap-6 md:flex-row">
      {/* Lado Esquerdo: Carrinho e Busca */}
      <div className="flex flex-1 flex-col gap-4">
        <Card className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              autoFocus
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900"
              placeholder="Buscar produto (nome ou código)..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            {/* Sugestões */}
            {term && filteredProducts.length > 0 && (
              <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    className="flex w-full items-center justify-between border-b border-zinc-100 px-4 py-3 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                  >
                    <div>
                      <div className="font-bold">{p.name}</div>
                      <div className="text-xs text-zinc-500">
                        {p.code ? `Ref: ${p.code}` : "Sem código"}
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600">
                      {formatBRL(p.price)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de Itens */}
          <div className="flex-1 overflow-y-auto pr-2">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-zinc-400">
                <ShoppingCart className="mb-2 h-10 w-10 opacity-20" />
                <p>Carrinho vazio</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-xs text-zinc-500">
                        {item.qtd}x {formatBRL(item.price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold">{formatBRL(item.total)}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-zinc-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Lado Direito: Pagamento e Totais */}
      <div className="flex w-full flex-col gap-4 md:w-96">
        <Card className="flex h-full flex-col justify-between p-6">
          <div className="space-y-6">
            <div>
              <div className="text-sm text-zinc-500">Total a Pagar</div>
              <div className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {formatBRL(total)}
              </div>
            </div>

            <div className="space-y-3">
              <Select
                label="Forma de Pagamento"
                value={payment}
                onChange={setPayment}
                options={[
                  { value: "money", label: "Dinheiro" },
                  { value: "card", label: "Cartão de Crédito/Débito" },
                  { value: "pix", label: "Pix" },
                ]}
              />

              {payment === "money" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <Input
                    label="Valor Recebido"
                    placeholder="0,00"
                    value={money}
                    onChange={setMoney}
                  />
                  {troco > 0 && (
                    <div className="mt-2 flex justify-between rounded-lg bg-emerald-100 p-3 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                      <span className="font-bold">Troco:</span>
                      <span className="font-bold">{formatBRL(troco)}</span>
                    </div>
                  )}
                </div>
              )}

              <Input
                label="Cliente (Opcional)"
                placeholder="Nome ou CPF"
                value={clientId}
                onChange={setClientId}
                icon={User}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {/* ✅ 2. Botão com type="button" e disabled={finishing} */}
            <PrimaryButton
              type="button" 
              onClick={handleConclude}
              disabled={finishing || items.length === 0}
              className="h-12 w-full text-lg shadow-xl shadow-blue-500/10"
            >
              {finishing ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>
                  Finalizando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="h-5 w-5" /> Concluir Venda
                </span>
              )}
            </PrimaryButton>

            <SoftButton onClick={onBack} disabled={finishing}>
              Voltar / Cancelar
            </SoftButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Pequeno componente de navegação se precisar
export function POSNavigation({ active, onOpen }) {
  if (active) return null; // Se o modal tá aberto, esconde o botão flutuante
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <button
        onClick={() => onOpen("pos")}
        className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-4 text-lg font-bold text-white shadow-2xl shadow-blue-600/30 transition-transform hover:scale-105 hover:bg-blue-500 active:scale-95"
      >
        <ShoppingCart className="h-6 w-6" />
        Abrir Caixa
      </button>
    </div>
  );
}

export const SalesView = ({ sales = [], onStart }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Vendas Realizadas</h2>
          <p className="text-sm text-zinc-500">Histórico recente</p>
        </div>
        <PrimaryButton onClick={onStart}>Nova Venda</PrimaryButton>
      </div>
      
      <Card className="p-0 overflow-hidden">
        {sales.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            Nenhuma venda registrada hoje.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3">Hora</th>
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Itens</th>
                <th className="px-6 py-3 text-right">Total</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-6 py-3 text-zinc-500">{s.time}</td>
                  <td className="px-6 py-3 font-medium">{s.code || s.id.slice(0, 6)}</td>
                  <td className="px-6 py-3">{s.itemsCount} itens</td>
                  <td className="px-6 py-3 text-right font-bold">{formatBRL(s.total)}</td>
                  <td className="px-6 py-3 text-center">
                    <Badge tone={s.status === 'paid' ? 'success' : 'warning'}>
                      {s.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};