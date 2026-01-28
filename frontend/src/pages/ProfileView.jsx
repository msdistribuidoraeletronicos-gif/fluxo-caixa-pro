// src/pages/ProfileView.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Eye, EyeOff, Lock, Building2, Wallet } from "lucide-react";
import { Card, Input, PrimaryButton, SoftButton, Badge } from "../shared/ui";

// ----------------------------------------------------------------------------
// ✅ HELPERS LOCAIS (Backup & Formatação)
// ----------------------------------------------------------------------------

const parseNumber = (v) => {
  const s = String(v ?? "")
    .replace(/[^0-9.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const safeText = (s) =>
  String(s ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  })[c]);

// baixa arquivo no browser
const downloadTextFile = (
  filename,
  content,
  mime = "text/plain;charset=utf-8"
) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

// ----------------------------------------------------------------------------
// COMPONENTE PRINCIPAL
// ----------------------------------------------------------------------------
export default function ProfileView({
  company,
  user,
  onSave,
  // ✅ Novos dados para backup
  transactions = [],
  products = [],
  pendencias = [],
  sales = [],
  goal = {},
  achievements = {},
}) {
  // --------------------------------------------------------------------------
  // STATES: Configurações da Empresa
  // --------------------------------------------------------------------------
  const [c, setC] = useState(() => ({
    name: company?.name || "Minha Empresa",
    cnpj: company?.cnpj || "",
    sector: company?.sector || "",
    city: company?.city || "",
    startBalance: Number(company?.startBalance ?? 0),
  }));

  const existingPass = useMemo(() => (user?.privacyPass || "").trim(), [user]);
  const [newPass, setNewPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  // --------------------------------------------------------------------------
  // STATES: Backup Selection
  // --------------------------------------------------------------------------
  const [bkAll, setBkAll] = useState(true);
  const [bkTx, setBkTx] = useState(true);
  const [bkProducts, setBkProducts] = useState(true);
  const [bkPend, setBkPend] = useState(true);
  const [bkSales, setBkSales] = useState(true);
  const [bkGoal, setBkGoal] = useState(true);
  const [bkReports, setBkReports] = useState(true);

  // Sincroniza "Tudo" com os outros
  useEffect(() => {
    if (!bkAll) return;
    setBkTx(true);
    setBkProducts(true);
    setBkPend(true);
    setBkSales(true);
    setBkGoal(true);
    setBkReports(true);
  }, [bkAll]);

  // --------------------------------------------------------------------------
  // LÓGICA DE BACKUP (JSON + HTML)
  // --------------------------------------------------------------------------
  const buildBackupObject = () => {
    const pickReports = bkReports; // “relatórios” = dados base

    const data = {
      app: "Fluxo Pro",
      version: 1,
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id || null,
        name: user?.name || "Usuário",
        companyName: c?.name || "Minha Empresa",
      },
      company: c,
      achievements: achievements || {},
    };

    if (bkAll || bkTx || pickReports) data.transactions = transactions || [];
    if (bkAll || bkProducts || pickReports) data.products = products || [];
    if (bkAll || bkPend) data.pendencias = pendencias || [];
    if (bkAll || bkSales || pickReports) data.sales = sales || [];
    if (bkAll || bkGoal) data.goal = goal || {};

    return data;
  };

  const buildPrettyHTML = (backupObj) => {
    const tx = backupObj.transactions || [];
    const prods = backupObj.products || [];
    const pend = backupObj.pendencias || [];
    const sls = backupObj.sales || [];
    const g = backupObj.goal || {};

    const totalIn = tx
      .filter((x) => x.kind === "in")
      .reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalOut = tx
      .filter((x) => x.kind === "out")
      .reduce((s, x) => s + Number(x.amount || 0), 0);
    const balance = totalIn - totalOut;

    const paidSales = sls.filter((s) => s.status !== "pending");
    const pendingSales = sls.filter((s) => s.status === "pending");
    const totalSalesPaid = paidSales.reduce(
      (a, s) => a + Number(s.total || 0),
      0
    );

    const lowStock = (prods || []).filter(
      (p) =>
        p.type !== "service" &&
        Number(p.stock || 0) <= Number(p.minStock || 0) &&
        Number(p.minStock || 0) > 0
    );

    // tabelas (mostra só um “top” pra não ficar gigante no HTML)
    const txTop = [...tx]
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 40);
    const salesTop = [...sls]
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 40);
    const prodTop = [...prods].slice(0, 60);

    const embeddedJSON = safeText(JSON.stringify(backupObj, null, 2));

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Backup Fluxo Pro</title>
<style>
  :root{
    --bg:#f4f4f5; --card:#ffffff; --text:#18181b; --muted:#71717a;
    --border:#e4e4e7; --brand:#2563eb; --ok:#16a34a; --warn:#f59e0b; --bad:#e11d48;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto; background:var(--bg); color:var(--text);}
  .wrap{max-width:980px;margin:0 auto;padding:24px}
  .topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
  .title{font-size:22px;font-weight:800;letter-spacing:-.02em}
  .sub{margin-top:6px;color:var(--muted);font-size:13px;line-height:1.35}
  .pill{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);background:#fff;padding:8px 12px;border-radius:999px;font-size:12px;color:var(--muted)}
  .grid{display:grid;gap:14px}
  .grid3{grid-template-columns:repeat(3,1fr)}
  .card{background:var(--card); border:1px solid var(--border); border-radius:18px; padding:16px}
  .h{font-weight:800}
  .kpi{font-size:20px;font-weight:900;margin-top:8px}
  .muted{color:var(--muted);font-size:12px}
  .badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700}
  .b-brand{background:rgba(37,99,235,.10); color:var(--brand); border:1px solid rgba(37,99,235,.22)}
  .b-ok{background:rgba(22,163,74,.10); color:var(--ok); border:1px solid rgba(22,163,74,.22)}
  .b-warn{background:rgba(245,158,11,.12); color:var(--warn); border:1px solid rgba(245,158,11,.26)}
  .b-bad{background:rgba(225,29,72,.10); color:var(--bad); border:1px solid rgba(225,29,72,.22)}
  table{width:100%;border-collapse:collapse}
  th,td{padding:10px 12px;border-bottom:1px solid var(--border);text-align:left;font-size:13px}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);background:#fafafa}
  .sectionTitle{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 10px}
  .small{font-size:11px;color:var(--muted)}
  details{border:1px solid var(--border);border-radius:14px;background:#fff;overflow:hidden}
  summary{cursor:pointer;padding:12px 14px;font-weight:800}
  pre{margin:0;padding:14px;background:#0b0b0f;color:#e5e7eb;overflow:auto;font-size:12px;line-height:1.4}
  @media(max-width:860px){.grid3{grid-template-columns:1fr}}
</style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div>
        <div class="title">Backup Fluxo Pro</div>
        <div class="sub">
          Empresa: <b>${safeText(
            backupObj.user?.companyName || "Minha Empresa"
          )}</b><br/>
          Usuário: <b>${safeText(
            backupObj.user?.name || "Usuário"
          )}</b><br/>
          Gerado em: <b>${safeText(
            new Date(backupObj.exportedAt).toLocaleString("pt-BR")
          )}</b>
        </div>
      </div>
      <div class="pill">
        Versão do backup: <b>${safeText(backupObj.version)}</b>
      </div>
    </div>

    <div class="grid grid3">
      <div class="card">
        <div class="sectionTitle">
          <div class="h">Resumo de Caixa</div>
          <span class="badge b-brand">Movimentações: ${tx.length}</span>
        </div>
        <div class="muted">Entradas</div>
        <div class="kpi" style="color:var(--ok)">${safeText(
          fmtBRL(totalIn)
        )}</div>
        <div class="muted" style="margin-top:10px">Saídas</div>
        <div class="kpi" style="color:var(--bad)">${safeText(
          fmtBRL(totalOut)
        )}</div>
        <div class="muted" style="margin-top:10px">Saldo calculado</div>
        <div class="kpi">${safeText(fmtBRL(balance))}</div>
      </div>

      <div class="card">
        <div class="sectionTitle">
          <div class="h">Vendas</div>
          <span class="badge b-ok">Recebidas: ${paidSales.length}</span>
        </div>
        <div class="muted">Total (recebidas)</div>
        <div class="kpi" style="color:var(--ok)">${safeText(
          fmtBRL(totalSalesPaid)
        )}</div>
        <div class="muted" style="margin-top:10px">Pendentes</div>
        <div class="kpi" style="color:var(--warn)">${
          pendingSales.length
        }</div>
      </div>

      <div class="card">
        <div class="sectionTitle">
          <div class="h">Estoque</div>
          <span class="badge ${lowStock.length ? "b-warn" : "b-ok"}">${
      lowStock.length ? "Atenção" : "Ok"
    }</span>
        </div>
        <div class="muted">Produtos cadastrados</div>
        <div class="kpi">${prods.length}</div>
        <div class="muted" style="margin-top:10px">Baixo estoque (<= mínimo)</div>
        <div class="kpi" style="color:var(--warn)">${lowStock.length}</div>
      </div>
    </div>

    ${
      Object.keys(g || {}).length
        ? `
    <div class="card" style="margin-top:14px">
      <div class="sectionTitle">
        <div class="h">Meta</div>
        <span class="small">Período: ${safeText(
          g.period ?? "—"
        )} | Valor: ${safeText(fmtBRL(g.value || 0))}</span>
      </div>
      <div class="muted">Observação: este backup salva o andamento da meta como configuração. O progresso é calculado pelos seus movimentos/vendas.</div>
    </div>`
        : ""
    }

    ${
      txTop.length
        ? `
    <div class="card" style="margin-top:14px">
      <div class="sectionTitle">
        <div class="h">Últimas movimentações (top ${txTop.length})</div>
        <span class="small">Mostrando uma amostra para ficar legível</span>
      </div>
      <table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>
          ${txTop
            .map(
              (t) => `
            <tr>
              <td>${safeText(t.date)}</td>
              <td>${safeText(t.description)}</td>
              <td>${safeText(t.kind === "in" ? "Entrada" : "Saída")}</td>
              <td style="text-align:right;font-weight:800">${safeText(
                fmtBRL(t.amount)
              )}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>`
        : ""
    }

    ${
      salesTop.length
        ? `
    <div class="card" style="margin-top:14px">
      <div class="sectionTitle">
        <div class="h">Últimas vendas (top ${salesTop.length})</div>
        <span class="small">Mostrando uma amostra para ficar legível</span>
      </div>
      <table>
        <thead><tr><th>Data</th><th>Código</th><th>Status</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${salesTop
            .map(
              (s) => `
            <tr>
              <td>${safeText(s.date)} ${safeText(s.time || "")}</td>
              <td>${safeText(s.code || "—")}</td>
              <td>${safeText(
                s.status === "pending" ? "PENDENTE" : "RECEBIDA"
              )}</td>
              <td style="text-align:right;font-weight:800">${safeText(
                fmtBRL(s.total)
              )}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>`
        : ""
    }

    ${
      prodTop.length
        ? `
    <div class="card" style="margin-top:14px">
      <div class="sectionTitle">
        <div class="h">Produtos (top ${prodTop.length})</div>
        <span class="small">Amostra para leitura rápida</span>
      </div>
      <table>
        <thead><tr><th>Nome</th><th>Código</th><th>Tipo</th><th style="text-align:right">Estoque</th></tr></thead>
        <tbody>
          ${prodTop
            .map(
              (p) => `
            <tr>
              <td>${safeText(p.name || "—")}</td>
              <td>${safeText(p.code || "—")}</td>
              <td>${safeText(p.type || "product")}</td>
              <td style="text-align:right;font-weight:800">${safeText(
                p.stock ?? 0
              )}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>`
        : ""
    }

    ${
      pend.length
        ? `
    <div class="card" style="margin-top:14px">
      <div class="sectionTitle">
        <div class="h">Pendências</div>
        <span class="badge b-warn">Total: ${pend.length}</span>
      </div>
      <div class="muted">Pendências podem conter compras e pagamentos. Para ver todos os detalhes, use o backup técnico (JSON) abaixo.</div>
    </div>`
        : ""
    }

    <div style="margin-top:14px"></div>
    <details>
      <summary>Backup técnico (JSON) embutido (para restauração)</summary>
      <pre>${embeddedJSON}</pre>
    </details>

    <div class="muted" style="margin-top:10px">
      Dica: este arquivo é seu backup visual. Se você quiser restaurar no futuro, a gente pode criar a função “Importar backup”.
    </div>
  </div>
</body>
</html>`;
  };

  // --------------------------------------------------------------------------
  // RENDERIZAÇÃO
  // --------------------------------------------------------------------------
  return (
    <div className="grid gap-6">
      <Card className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Configurações</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Ajuste os dados do seu negócio e a senha de privacidade
              (opcional).
            </p>
          </div>

          <Badge tone={existingPass ? "brand" : "warning"}>
            <Lock className="h-4 w-4" />
            {existingPass
              ? "Privacidade ativa"
              : "Sem senha de privacidade"}
          </Badge>
        </div>

        {/* Dados da empresa */}
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nome Fantasia"
            value={c.name}
            onChange={(v) => setC((p) => ({ ...p, name: v }))}
            placeholder="Ex: MS Distribuidora"
            right={<Building2 className="h-4 w-4" />}
          />

          <Input
            label="Cidade"
            value={c.city}
            onChange={(v) => setC((p) => ({ ...p, city: v }))}
            placeholder="Ex: Anastácio - MS"
          />

          <Input
            label="Setor"
            value={c.sector}
            onChange={(v) => setC((p) => ({ ...p, sector: v }))}
            placeholder="Ex: Varejo / Alimentação / Serviços"
          />

          <Input
            label="CNPJ (opcional)"
            value={c.cnpj}
            onChange={(v) => setC((p) => ({ ...p, cnpj: v }))}
            placeholder="00.000.000/0000-00"
          />

          <Input
            label="Saldo Inicial (R$)"
            value={String(c.startBalance ?? "")}
            onChange={(v) =>
              setC((p) => ({ ...p, startBalance: parseNumber(v) }))
            }
            placeholder="Ex: 1000"
            right={<Wallet className="h-4 w-4" />}
          />
        </div>

        <hr className="my-6 border-zinc-100 dark:border-zinc-800" />

        {/* Privacidade */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-bold">
                Senha de privacidade (opcional)
              </div>
              <div className="text-xs text-zinc-500">
                Ela serve para <b>mostrar valores</b> e (se você quiser)
                bloquear a página de Configurações.
                <br />
                Se você deixar vazio, <b>não altera</b> a senha atual.
              </div>
            </div>
          </div>

          <div className="relative">
            <Input
              label={
                existingPass
                  ? "Nova senha (opcional)"
                  : "Criar senha (opcional)"
              }
              value={newPass}
              onChange={setNewPass}
              type={showPass ? "text" : "password"}
              placeholder={
                existingPass ? "Deixe vazio para manter" : "Crie uma senha"
              }
            />

            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-[38px] rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              title={showPass ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPass ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {existingPass ? (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
              ✅ Já existe uma senha de privacidade ativa. Para trocar, digite
              uma nova e clique em <b>Salvar</b>.
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              ⚠️ Você ainda não criou senha de privacidade. Por enquanto, o
              app <b>não vai pedir senha</b> para mostrar valores.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <SoftButton
            onClick={() => {
              // reset visual do campo da senha (não mexe na senha real)
              setNewPass("");
            }}
          >
            Limpar senha digitada
          </SoftButton>

          <PrimaryButton
            tone="success"
            onClick={() => {
              const nextPass = (newPass || "").trim();

              // mantém senha antiga se não digitou nova
              const finalPass = nextPass ? nextPass : user?.privacyPass || "";

              onSave?.(c, {
                name: user?.name || "Usuário",
                companyName: c?.name || "Minha Empresa",
                privacyPass: finalPass,
              });

              setNewPass("");
            }}
          >
            Salvar Alterações
          </PrimaryButton>
        </div>
      </Card>

      {/* --------------------------------------------------------- */}
      {/* ✅ CARD DE BACKUP (ATUALIZADO UI) */}
      {/* --------------------------------------------------------- */}
      <Card className="mx-auto w-full max-w-2xl">
        <div className="mb-4">
          <h3 className="text-base font-extrabold">Backup</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Gere um backup em formato <b>visual (bonito)</b> e também um
            arquivo <b>técnico (JSON)</b> para segurança.
          </p>
        </div>

        <div className="grid gap-3">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div>
              <div className="font-bold">Tudo</div>
              <div className="text-xs text-zinc-500">
                Inclui todos os módulos
              </div>
            </div>
            <input
              type="checkbox"
              checked={bkAll}
              onChange={(e) => setBkAll(e.target.checked)}
              className="h-5 w-5"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <div className="font-bold">Movimentações</div>
                <div className="text-xs text-zinc-500">
                  Entradas e saídas
                </div>
              </div>
              <input
                type="checkbox"
                checked={bkTx}
                onChange={(e) => {
                  setBkAll(false);
                  setBkTx(e.target.checked);
                }}
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <div className="font-bold">Produtos</div>
                <div className="text-xs text-zinc-500">
                  Estoque e cadastro
                </div>
              </div>
              <input
                type="checkbox"
                checked={bkProducts}
                onChange={(e) => {
                  setBkAll(false);
                  setBkProducts(e.target.checked);
                }}
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <div className="font-bold">Pendências</div>
                <div className="text-xs text-zinc-500">
                  Clientes e compras
                </div>
              </div>
              <input
                type="checkbox"
                checked={bkPend}
                onChange={(e) => {
                  setBkAll(false);
                  setBkPend(e.target.checked);
                }}
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <div className="font-bold">Vendas</div>
                <div className="text-xs text-zinc-500">
                  Recebidas e pendentes
                </div>
              </div>
              <input
                type="checkbox"
                checked={bkSales}
                onChange={(e) => {
                  setBkAll(false);
                  setBkSales(e.target.checked);
                }}
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <div className="font-bold">Metas</div>
                <div className="text-xs text-zinc-500">
                  Configuração da meta
                </div>
              </div>
              <input
                type="checkbox"
                checked={bkGoal}
                onChange={(e) => {
                  setBkAll(false);
                  setBkGoal(e.target.checked);
                }}
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <div className="font-bold">Relatórios</div>
                <div className="text-xs text-zinc-500">
                  Inclui dados-base (tx/vendas/produtos)
                </div>
              </div>
              <input
                type="checkbox"
                checked={bkReports}
                onChange={(e) => {
                  setBkAll(false);
                  setBkReports(e.target.checked);
                }}
                className="h-5 w-5"
              />
            </label>
          </div>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <SoftButton
              onClick={() => {
                setBkAll(true);
              }}
            >
              Marcar tudo
            </SoftButton>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {/* BACKUP PARA ANÁLISE */}
            <button
              onClick={() => {
                const data = buildBackupObject();
                const html = buildPrettyHTML(data);
                const stamp = new Date().toISOString().slice(0, 10);
                downloadTextFile(
                  `backup_analise_${stamp}.html`,
                  html,
                  "text/html;charset=utf-8"
                );
              }}
              className="flex flex-col gap-1 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
            >
              <div className="text-sm font-extrabold text-blue-700 dark:text-blue-300">
                📊 Backup para Análise
              </div>
              <div className="text-xs text-blue-700/80 dark:text-blue-200/70">
                Arquivo visual para abrir no navegador e analisar dados,
                gráficos e informações da empresa.
              </div>
            </button>

            {/* BACKUP DE SEGURANÇA */}
            <button
              onClick={() => {
                const obj = buildBackupObject();
                const stamp = new Date().toISOString().slice(0, 10);

                // HTML visual
                const html = buildPrettyHTML(obj);
                downloadTextFile(
                  `backup_seguranca_${stamp}.html`,
                  html,
                  "text/html;charset=utf-8"
                );

                // JSON técnico
                const json = JSON.stringify(obj, null, 2);
                downloadTextFile(
                  `backup_seguranca_${stamp}.json`,
                  json,
                  "application/json;charset=utf-8"
                );
              }}
              className="flex flex-col gap-1 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50"
            >
              <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                🔐 Backup de Segurança
              </div>
              <div className="text-xs text-emerald-700/80 dark:text-emerald-200/70">
                Gera backup completo (visual + arquivo técnico para restauração
                futura).
              </div>
            </button>
          </div>

          <div className="text-xs text-zinc-500">
            O arquivo <b>.html</b> abre com um relatório visual (cards e
            tabelas). O <b>.json</b> é para restauração futura.
          </div>
        </div>
      </Card>
    </div>
  );
}