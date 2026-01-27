// src/views/ProductsView.jsx
import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as XLSX from "xlsx";
import { Plus, Pencil, Trash2 } from "lucide-react";

import {
  Card,
  SoftButton,
  PrimaryButton,
  Input,
  Select,
  ModalShell,
  Badge,
  cx,
} from "../shared/ui";

import { parseNumber, formatBRL, uid } from "../shared/utils";

console.log(
  ">>> ProductsView.jsx carregado (src/views/ProductsView.jsx) <<<"
);

// -----------------------------
// HELPER: Campos Faltando
// -----------------------------
const missingFields = (p) => {
  const miss = [];
  if (!String(p.name ?? "").trim()) miss.push("Nome");
  if (p.price === null || p.price === undefined || p.price === "") miss.push("Venda");
  if (p.cost === null || p.cost === undefined || p.cost === "") miss.push("Custo");
  if (!String(p.category ?? "").trim()) miss.push("Categoria");
  return miss;
};

// -----------------------------
// CSV & XLSX Parsers
// -----------------------------
async function parseXLSX(file) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!json.length) return { hdrs: [], rows: [] };
  const headers = Object.keys(json[0]);
  return { hdrs: headers, rows: json };
}

function parseCSV(text) {
  const t = String(text || "").trim();
  
  // ✅ Melhoria na detecção: se tiver TAB, usa TAB. Se tiver ';', usa ';'. Senão usa ','.
  // Isso ajuda no suporte a TSV e TXT variados.
  let sep = ",";
  if (t.includes("\t")) {
    sep = "\t";
  } else if (t.includes(";")) {
    sep = ";";
  }

  const lines = t.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { hdrs: [], rows: [] };

  const parseLine = (line) => {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === sep && !inQ) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const hdrs = parseLine(lines[0]);
  const rows = lines.slice(1).map((l) => {
    const cols = parseLine(l);
    const obj = {};
    hdrs.forEach((h, i) => (obj[h] = cols[i] ?? ""));
    return obj;
  });

  return { hdrs, rows };
}

function getVal(row, idxOrNull, headers) {
  if (idxOrNull === null || idxOrNull === undefined) return "";
  const key = headers ? headers[idxOrNull] : null;
  return key ? row[key] : "";
}

// -----------------------------
// PRODUCTS VIEW
// -----------------------------
export default function ProductsView({ products, onUpdate }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const sorted = useMemo(() => {
    return [...(products || [])].sort((a, b) =>
      String(b.createdAt || b.created_at || "").localeCompare(
        String(a.createdAt || a.created_at || "")
      )
    );
  }, [products]);

  const incompleteCount = useMemo(
    () => (products || []).filter((p) => missingFields(p).length > 0).length,
    [products]
  );

  const removeProduct = (id) => {
    if (typeof onUpdate === "function") {
      onUpdate((prev) => (prev || []).filter((p) => p.id !== id));
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Produtos & Serviços</h2>
          <p className="text-sm text-zinc-500">
            Cadastre seu catálogo e acompanhe margem automaticamente.
          </p>
        </div>

        <div className="flex gap-2">
          <SoftButton onClick={() => setImportOpen(true)}>
            Cadastro automático
          </SoftButton>
          <PrimaryButton
            icon={Plus}
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            Cadastrar novo
          </PrimaryButton>
        </div>
      </div>

      {incompleteCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-amber-900 dark:text-amber-100">
                ⚠️ Produtos com dados faltando
              </div>
              <div className="text-sm text-amber-700 dark:text-amber-200/80">
                Existem {incompleteCount} item(ns) incompletos (sem preço, custo ou categoria).
                Você pode editar quando quiser.
              </div>
            </div>
            <Badge tone="warning">{incompleteCount} incompleto(s)</Badge>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-right">Custo</th>
                <th className="px-6 py-4 text-right">Venda</th>
                <th className="px-6 py-4 text-right">Margem</th>
                <th className="px-6 py-4 text-right">Estoque</th>
                <th className="px-6 py-4 text-right">Validade</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    <p className="mb-2 text-lg">
                      Nenhum produto/serviço cadastrado.
                    </p>
                    <p className="text-xs">
                      Clique em “Cadastrar novo” para começar.
                    </p>
                  </td>
                </tr>
              ) : (
                sorted.map((p) => {
                  const exp = p.expiryDate || p.expiry_date;
                  const missing = missingFields(p);

                  return (
                    <tr
                      key={p.id}
                      className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.photo ? (
                            <img
                              src={p.photo}
                              alt={p.name}
                              className="h-10 w-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900" />
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                {p.name || <span className="text-zinc-400 italic">Sem nome</span>}
                              </span>
                              {missing.length > 0 && (
                                <span title={`Faltando: ${missing.join(", ")}`}>
                                  <Badge tone="warning">Incompleto</Badge>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {p.code ? `Código: ${p.code}` : "Sem código"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-zinc-500">
                        <Badge tone="brand">
                          {p.type === "service" ? "Serviço" : "Produto"}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-zinc-500">
                        {p.category || "—"}
                      </td>

                      <td className="px-6 py-4 text-right text-zinc-500">
                        {p.cost !== null ? formatBRL(p.cost) : "—"}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {p.price !== null ? formatBRL(p.price) : "—"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Badge
                          tone={
                            !Number.isFinite(p.marginPct)
                              ? "default"
                              : p.marginPct >= 30
                              ? "success"
                              : p.marginPct >= 15
                              ? "warning"
                              : "danger"
                          }
                        >
                          {Number.isFinite(p.marginPct)
                            ? `${p.marginPct.toFixed(1)}%`
                            : "—"}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Badge
                          tone={
                            (p.stock ?? 0) <= (p.minStock ?? 0)
                              ? "danger"
                              : (p.stock ?? 0) <= (p.minStock ?? 0) + 5
                              ? "warning"
                              : "success"
                          }
                        >
                          {p.stock ?? 0}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right text-zinc-500">
                        {exp ? (
                          <span className="whitespace-nowrap">
                            {exp.split("-").reverse().join("/")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              setEditing(p);
                              setModalOpen(true);
                            }}
                            className="text-sm font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeProduct(p.id)}
                            className="text-sm font-semibold text-rose-500 hover:text-rose-400 flex items-center gap-1"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      <AnimatePresence>
        {modalOpen && (
          <ProductModal
            initial={editing}
            onClose={() => setModalOpen(false)}
            onSave={(prod) => {
              if (editing) {
                onUpdate((prev) =>
                  (prev || []).map((p) => (p.id === prod.id ? prod : p))
                );
              } else {
                onUpdate((prev) => [...(prev || []), prod]);
              }
              setModalOpen(false);
              setEditing(null);
            }}
          />
        )}

        {importOpen && (
          <ImportProductsModal
            onClose={() => setImportOpen(false)}
            onImport={(newProducts) => {
              onUpdate((prev) => [...(prev || []), ...newProducts]);
              setImportOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// -----------------------------
// MODAL: CRIAR/EDITAR
// -----------------------------
function ProductModal({ onClose, onSave, initial }) {
  const [type, setType] = useState(initial?.type || "product");
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [cost, setCost] = useState(
    initial?.cost !== null && initial?.cost !== undefined
      ? String(initial.cost).replace(".", ",")
      : ""
  );
  const [price, setPrice] = useState(
    initial?.price !== null && initial?.price !== undefined
      ? String(initial.price).replace(".", ",")
      : ""
  );
  const [code, setCode] = useState(initial?.code || "");
  const [photo, setPhoto] = useState(initial?.photo || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [stock, setStock] = useState(
    initial?.stock !== undefined ? String(initial.stock) : ""
  );
  const [minStock, setMinStock] = useState(
    initial?.minStock !== undefined ? String(initial.minStock) : "5"
  );
  const [expiryDate, setExpiryDate] = useState(
    initial?.expiryDate || initial?.expiry_date || ""
  );

  const costN = useMemo(() => (cost ? parseNumber(cost) : null), [cost]);
  const priceN = useMemo(() => (price ? parseNumber(price) : null), [price]);

  const marginPct = useMemo(() => {
    if (priceN === null || costN === null || priceN <= 0) return null;
    return ((priceN - costN) / priceN) * 100;
  }, [costN, priceN]);

  const marginBRL = useMemo(() => {
    if (priceN === null || costN === null) return null;
    return priceN - costN;
  }, [costN, priceN]);

  const handlePhoto = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name) return;

    onSave({
      id: initial?.id || uid(),
      createdAt: initial?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      type,
      name,
      category,
      cost: costN,
      price: priceN,
      marginPct,
      marginBRL,
      code,
      photo,
      notes,
      stock: Math.max(0, Math.floor(parseNumber(stock))),
      minStock: Math.max(0, Math.floor(parseNumber(minStock))),
      expiryDate: expiryDate || "",
    });
  };

  return (
    <ModalShell
      title={initial ? "Editar produto/serviço" : "Cadastrar produto/serviço"}
      subtitle="Informe custo e venda para calcular margem automaticamente."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-zinc-500 hover:text-zinc-800"
          >
            Cancelar
          </button>
          <PrimaryButton
            onClick={handleSave}
            tone="success"
            disabled={!name}
          >
            {initial ? "Salvar Alterações" : "Salvar"}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo"
            value={type}
            onChange={setType}
            options={[
              { value: "product", label: "Produto" },
              { value: "service", label: "Serviço" },
            ]}
          />
          <Input
            label="Código (SKU)"
            value={code}
            onChange={setCode}
            placeholder="Ex: 001-A"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nome"
            value={name}
            onChange={setName}
            placeholder="Ex: Camisa Polo / Corte de cabelo"
          />
          <Input
            label="Categoria"
            value={category}
            onChange={setCategory}
            placeholder="Ex: Roupas / Beleza"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Valor de custo (R$)"
            value={cost}
            onChange={setCost}
            placeholder="0,00"
          />
          <Input
            label="Valor de venda (R$)"
            value={price}
            onChange={setPrice}
            placeholder="0,00"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Estoque atual (unidades)"
            value={stock}
            onChange={setStock}
            placeholder="Ex: 30"
          />
          <Input
            label="Avisar quando abaixo de (mínimo)"
            value={minStock}
            onChange={setMinStock}
            placeholder="Ex: 5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Validade (opcional)"
            value={expiryDate}
            onChange={setExpiryDate}
            placeholder="AAAA-MM-DD"
            type="date"
          />
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold text-zinc-500">Avisos</div>
            <div className="mt-1 text-xs text-zinc-500">
              O Dashboard avisa quando faltar 5 dias e 1 dia para vencer.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold text-zinc-500">
              Margem (R$)
            </div>
            <div
              className={cx(
                "mt-1 text-lg font-extrabold",
                marginBRL === null
                  ? "text-zinc-400"
                  : marginBRL >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              )}
            >
              {marginBRL !== null ? formatBRL(marginBRL) : "—"}
            </div>
            <div className="mt-1 text-xs text-zinc-500">Venda - Custo</div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs font-semibold text-zinc-500">
              Margem (%)
            </div>
            <div
              className={cx(
                "mt-1 text-lg font-extrabold",
                marginPct === null
                  ? "text-zinc-400"
                  : marginPct >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              )}
            >
              {marginPct !== null ? `${marginPct.toFixed(1)}%` : "—"}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              (Venda - Custo) / Venda
            </div>
          </div>
        </div>

        <label className="block space-y-1.5">
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Foto do produto
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhoto(e.target.files?.[0])}
              className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-900 dark:file:text-zinc-200"
            />
            {photo ? (
              <img
                src={photo}
                alt="preview"
                className="h-12 w-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800"
              />
            ) : null}
          </div>
        </label>

        <Input
          label="Observações (opcional)"
          value={notes}
          onChange={setNotes}
          placeholder="Ex: fornecedor, variações, etc."
        />
      </div>
    </ModalShell>
  );
}

// -----------------------------
// MODAL: IMPORTAÇÃO AUTOMÁTICA
// -----------------------------
function ImportProductsModal({ onClose, onImport }) {
  const [draftRows, setDraftRows] = useState([]);

  console.log(">>> ImportProductsModal FINAL montado <<<");

  const dangerCell = (val) => String(val ?? "").trim() === "";

  const norm = (s) =>
    String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const autoMap = (hdrs) => {
    const hdrNorm = hdrs.map((h) => norm(h));
    const find = (cands) => {
      const candNorm = cands.map(norm);
      const idx = hdrNorm.findIndex((h) =>
        candNorm.some((c) => h === c || h.includes(c))
      );
      return idx >= 0 ? idx : null;
    };

    return {
      type: find(["tipo", "type"]),
      name: find([
        "nome",
        "produto",
        "descricao",
        "descrição",
        "item",
        "name",
      ]),
      code: find([
        "codigo",
        "código",
        "sku",
        "code",
        "ean",
        "barcode",
        "barra",
      ]),
      category: find(["categoria", "category", "grupo", "setor"]),
      price: find([
        "preco",
        "preço",
        "valor",
        "valor venda",
        "preco venda",
        "venda",
        "price",
      ]),
      cost: find(["custo", "valor custo", "preco custo", "cost"]),
      stock: find(["estoque", "stock", "qtd", "quantidade", "saldo"]),
      minStock: find([
        "estoque minimo",
        "estoque mínimo",
        "minstock",
        "min stock",
        "minimo",
        "mínimo",
      ]),
      notes: find(["obs", "observacao", "observação", "notes"]),
      expiryDate: find([
        "validade",
        "vencimento",
        "data validade",
        "expiry",
        "expiration",
      ]),
    };
  };

  const updateDraft = (id, patch) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  // ✅ Função readFile atualizada com suporte a TSV e TXT
  const readFile = async (file) => {
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    let result;

    if (ext === "csv") {
      const text = await file.text();
      result = parseCSV(text);
    } else if (ext === "tsv") {
      const text = await file.text();
      // Troca TAB por ; e deixa o parseCSV detectar
      result = parseCSV(text.replace(/\t/g, ";")); 
    } else if (ext === "txt") {
      const text = await file.text();
      // tenta como CSV de qualquer jeito (muitas vezes é export “texto” separado por virgula ou ponto e virgula)
      result = parseCSV(text);
    } else if (ext === "xlsx" || ext === "xls") {
      result = await parseXLSX(file);
    } else {
      alert("Formato inválido. Envie CSV, TSV, TXT ou Excel (.xlsx/.xls)");
      return;
    }

    const { hdrs, rows } = result;
    const m = autoMap(hdrs);

    const p = rows.slice(0, 50).map((r) => ({
      id: uid(),
      type: String(getVal(r, m.type, hdrs) || "")
        .toLowerCase()
        .includes("serv")
        ? "service"
        : "product",
      name: String(getVal(r, m.name, hdrs) || "").trim(),
      code: String(getVal(r, m.code, hdrs) || "").trim(),
      category: String(getVal(r, m.category, hdrs) || "").trim(),
      cost: String(getVal(r, m.cost, hdrs) ?? "").trim(),
      price: String(getVal(r, m.price, hdrs) ?? "").trim(),
      stock: Math.max(0, Math.floor(parseNumber(getVal(r, m.stock, hdrs)))),
      minStock: Math.max(
        0,
        Math.floor(parseNumber(getVal(r, m.minStock, hdrs)) || 5)
      ),
      notes: String(getVal(r, m.notes, hdrs) || "").trim(),
      expiryDate: String(getVal(r, m.expiryDate, hdrs) ?? "").trim(),
      __raw: r,
    }));

    setDraftRows(p);
  };

  const buildProducts = () => {
    const cleanDraft = draftRows.filter((r) => {
      const any =
        String(r.name ?? "").trim() ||
        String(r.code ?? "").trim() ||
        String(r.category ?? "").trim() ||
        String(r.price ?? "").trim() ||
        String(r.cost ?? "").trim();
      return Boolean(any);
    });

    const prods = cleanDraft.map((r) => {
      const price = String(r.price ?? "").trim() ? parseNumber(r.price) : null;
      const cost = String(r.cost ?? "").trim() ? parseNumber(r.cost) : null;

      const marginBRL =
        price !== null && cost !== null ? price - cost : null;
      const marginPct =
        price !== null && cost !== null && price > 0
          ? ((price - cost) / price) * 100
          : null;

      return {
        id: uid(),
        createdAt: new Date().toISOString(),
        type: r.type || "product",
        name: String(r.name || "").trim(),
        code: String(r.code || "").trim(),
        category: String(r.category || "").trim(),
        price,
        cost,
        marginBRL,
        marginPct,
        stock: Math.max(0, Math.floor(Number(r.stock || 0))),
        minStock: Math.max(0, Math.floor(Number(r.minStock || 5))),
        notes: String(r.notes || "").trim(),
        photo: "",
        expiryDate: String(r.expiryDate || "").trim(),
      };
    });

    onImport(prods);
  };

  return (
    <ModalShell
      title="Cadastro automático"
      subtitle="Envie um arquivo. Edite os dados abaixo antes de importar."
      onClose={onClose}
      footer={
        draftRows.length > 0 ? (
          <div className="flex items-center justify-between">
            <SoftButton onClick={onClose}>Cancelar</SoftButton>
            <PrimaryButton tone="success" onClick={buildProducts}>
              Confirmar Importação
            </PrimaryButton>
          </div>
        ) : (
          <div className="flex justify-end">
            <SoftButton onClick={onClose}>Fechar</SoftButton>
          </div>
        )
      }
    >
      <div className="space-y-4">
        <label className="block space-y-1.5">
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Arquivo (CSV, Excel, TXT, TSV)
          </div>
          {/* ✅ Input com accept atualizado */}
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.txt,.tsv"
            onChange={(e) => readFile(e.target.files?.[0])}
            className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 dark:file:bg-zinc-900 dark:file:text-zinc-200"
          />
          <div className="text-xs text-zinc-500">
            Dica: colunas comuns: nome, codigo/sku, preco, custo, categoria,
            estoque, validade.
          </div>
        </label>

        {draftRows.length > 0 && (
          <Card className="p-4">
            <div className="font-bold mb-2">Editor de Importação (Top 50)</div>
            <div className="text-xs text-zinc-500 mb-3">
              Campos em vermelho estão vazios (0 é aceito e não marca vermelho).
            </div>

            <div className="overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800 max-h-[50vh]">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-3 min-w-[180px]">Nome</th>
                    <th className="px-4 py-3 min-w-[110px]">Código</th>
                    <th className="px-4 py-3 text-right min-w-[110px]">
                      Custo
                    </th>
                    <th className="px-4 py-3 text-right min-w-[110px]">
                      Venda
                    </th>
                    <th className="px-4 py-3 min-w-[140px]">Categoria</th>
                    <th className="px-4 py-3 min-w-[140px]">Validade</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {draftRows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2">
                        <input
                          value={r.name || ""}
                          onChange={(e) =>
                            updateDraft(r.id, { name: e.target.value })
                          }
                          className={cx(
                            "w-full rounded-lg border px-2 py-1 bg-white dark:bg-zinc-950",
                            dangerCell(r.name)
                              ? "border-rose-400"
                              : "border-zinc-200 dark:border-zinc-800"
                          )}
                          placeholder="Nome"
                        />
                      </td>

                      <td className="px-4 py-2">
                        <input
                          value={r.code || ""}
                          onChange={(e) =>
                            updateDraft(r.id, { code: e.target.value })
                          }
                          className={cx(
                            "w-full rounded-lg border px-2 py-1 bg-white dark:bg-zinc-950",
                            dangerCell(r.code)
                              ? "border-rose-400"
                              : "border-zinc-200 dark:border-zinc-800"
                          )}
                          placeholder="Código"
                        />
                      </td>

                      <td className="px-4 py-2 text-right">
                        <input
                          value={r.cost ?? ""}
                          onChange={(e) =>
                            updateDraft(r.id, { cost: e.target.value })
                          }
                          className={cx(
                            "w-full rounded-lg border px-2 py-1 text-right bg-white dark:bg-zinc-950",
                            dangerCell(r.cost)
                              ? "border-rose-400"
                              : "border-zinc-200 dark:border-zinc-800"
                          )}
                          placeholder="0,00"
                        />
                      </td>

                      <td className="px-4 py-2 text-right">
                        <input
                          value={r.price ?? ""}
                          onChange={(e) =>
                            updateDraft(r.id, { price: e.target.value })
                          }
                          className={cx(
                            "w-full rounded-lg border px-2 py-1 text-right bg-white dark:bg-zinc-950",
                            dangerCell(r.price)
                              ? "border-rose-400"
                              : "border-zinc-200 dark:border-zinc-800"
                          )}
                          placeholder="0,00"
                        />
                      </td>

                      <td className="px-4 py-2">
                        <input
                          value={r.category || ""}
                          onChange={(e) =>
                            updateDraft(r.id, { category: e.target.value })
                          }
                          className={cx(
                            "w-full rounded-lg border px-2 py-1 bg-white dark:bg-zinc-950",
                            dangerCell(r.category)
                              ? "border-rose-400"
                              : "border-zinc-200 dark:border-zinc-800"
                          )}
                          placeholder="Categoria"
                        />
                      </td>

                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={r.expiryDate || ""}
                          onChange={(e) =>
                            updateDraft(r.id, { expiryDate: e.target.value })
                          }
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1 bg-white dark:bg-zinc-950 dark:border-zinc-800"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </ModalShell>
  );
}