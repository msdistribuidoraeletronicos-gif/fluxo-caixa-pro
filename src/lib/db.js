// src/lib/db.js
import { supabase } from "./supabaseClient";

// ------------------------------------------------------------------
// HELPERS: Resiliência (ANTI-DUPLICAÇÃO)
// ------------------------------------------------------------------

function stripNullish(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

function errText(error) {
  try {
    return JSON.stringify(
      {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        status: error?.status,
      },
      null,
      2
    );
  } catch {
    return String(error?.message || error);
  }
}

async function tryUpsert(table, payload, onConflict) {
  return await supabase
    .from(table)
    .upsert(payload, { onConflict })
    .select("*")
    .single();
}

function parseOnConflictCols(onConflict) {
  return String(onConflict || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * ✅ HISTÓRICO IMUTÁVEL (sales/transactions):
 * NÃO USE insert() com retries, porque qualquer erro “intermediário” pode gerar duplicação.
 * Aqui fazemos UPSERT por "id" => idempotente (repetir a mesma operação não duplica).
 */
async function upsertHistoryWithFallback(
  table,
  basePayload,
  optionalKeys = [],
  onConflict = "id"
) {
  const full = stripNullish(basePayload);
  const attempts = [];

  attempts.push({ label: "full", payload: full });

  if (optionalKeys.length) {
    const reduced = { ...full };
    for (const k of optionalKeys) delete reduced[k];
    attempts.push({ label: "no_optional", payload: reduced });
  }

  attempts.push({
    label: "no_client_id",
    payload: (() => {
      const p = { ...(attempts.at(-1)?.payload || full) };
      delete p.client_id;
      return p;
    })(),
  });

  // (mantemos id SEMPRE — ele é a âncora para não duplicar)
  let lastError = null;

  for (const a of attempts) {
    const r = await tryUpsert(table, a.payload, onConflict);
    if (!r.error) return r.data;

    lastError = r.error;
    console.warn(
      `[${table}] upsertHistory attempt "${a.label}" failed:\n${errText(r.error)}`,
      { payload: a.payload, onConflict }
    );
  }

  console.error(`[${table}] upsertHistory failed FINAL:\n${errText(lastError)}`, {
    basePayload: full,
    onConflict,
  });
  throw lastError;
}

/**
 * Upsert resiliente (para tabelas editáveis: pendencias, etc.)
 *
 * ✅ Regra: se o onConflict NÃO inclui "id", NÃO envie "id" no payload.
 */
async function upsertWithFallback(
  table,
  basePayload,
  onConflict,
  optionalKeys = []
) {
  const conflictCols = parseOnConflictCols(onConflict);
  const conflictHasId = conflictCols.includes("id");

  const fullRaw = stripNullish(basePayload);
  const full = { ...fullRaw };

  // ✅ Se o conflito não é por id, removemos id do payload
  if (!conflictHasId) delete full.id;

  const MIN = stripNullish({
    user_id: full.user_id,
    identity_key: conflictCols.includes("identity_key")
      ? full.identity_key
      : undefined,
    name: full.name,
    id: conflictHasId ? full.id : undefined,
  });

  const attempts = [];

  attempts.push({ label: "full", payload: full });

  if (optionalKeys.length) {
    const reduced = { ...full };
    for (const k of optionalKeys) delete reduced[k];
    if (!conflictHasId) delete reduced.id;
    attempts.push({ label: "no_optional", payload: reduced });
  }

  attempts.push({ label: "minimal", payload: MIN });

  let lastError = null;

  for (const a of attempts) {
    const r = await tryUpsert(table, a.payload, onConflict);
    if (!r.error) return r.data;

    lastError = r.error;
    console.warn(
      `[${table}] upsert attempt "${a.label}" failed:\n${errText(r.error)}`,
      { payload: a.payload, onConflict }
    );
  }

  console.error(`[${table}] upsert failed FINAL:\n${errText(lastError)}`, {
    basePayload: full,
    onConflict,
  });
  throw lastError;
}

// ------------------------------------------------------------------
// HELPERS: Tipos
// ------------------------------------------------------------------

function toTextOrNull(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function toTextOrEmpty(v) {
  return String(v ?? "").trim();
}

function toNullableNumber(v) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.,-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toNullableInt(v) {
  const n = toNullableNumber(v);
  if (n === null) return null;
  const i = Math.floor(n);
  return Number.isFinite(i) ? i : null;
}

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

// ------------------------------------------------------------------
// SECTION 1: PRODUTOS (Cadastro Editável)
// ------------------------------------------------------------------

export async function upsertProduct(userId, p) {
  const price = p.price === 0 ? 0 : toNullableNumber(p.price);
  const cost = p.cost === 0 ? 0 : toNullableNumber(p.cost);

  const marginBRL = price !== null && cost !== null ? price - cost : null;
  const marginPct =
    price !== null && cost !== null && price > 0
      ? ((price - cost) / price) * 100
      : null;

  const payload = {
    id: p.id || crypto.randomUUID(),
    user_id: userId,
    name: toTextOrEmpty(p.name),
    code: toTextOrNull(p.code),
    type: toTextOrEmpty(p.type) || "product",
    price,
    cost,
    stock: toNullableInt(p.stock),
    min_stock: toNullableInt(p.minStock ?? p.min_stock),
    expiry_date: toTextOrNull(p.expiryDate ?? p.expiry_date),
    category: toTextOrEmpty(p.category),
    notes: toTextOrEmpty(p.notes),
    photo: toTextOrEmpty(p.photo),
    margin_pct: marginPct,
    margin_brl: marginBRL,
    updated_at: new Date().toISOString(),
    created_at: p.createdAt || p.created_at || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("products")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProduct(userId, productId) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("user_id", userId)
    .eq("id", productId);

  if (error) throw error;
}

// ------------------------------------------------------------------
// SECTION 2: PENDÊNCIAS (Cadastro Editável)
// ------------------------------------------------------------------

export async function upsertPendencia(userId, c) {
  const phone = toTextOrNull(c.phone);
  const email = toTextOrNull(c.email);
  const cpf = toTextOrNull(c.cpf);
  const address = toTextOrNull(c.address);
  const tag = toTextOrNull(c.tag);
  const note = toTextOrNull(c.note);

  const identityKey = toTextOrNull(c.identityKey ?? c.identity_key);

  // ✅ CORREÇÃO:
  // - Se tem ID UUID válido => prioriza atualizar por ID (não duplica).
  // - Se não tem ID => tenta usar (user_id, identity_key) para evitar duplicidade.
  // - Se não tem nem ID nem identity_key => cai no "id" e gera um novo.
  const hasValidId = isUuid(c.id);
  const conflict = hasValidId
    ? "id"
    : identityKey
    ? "user_id,identity_key"
    : "id";

  const basePayload = {
    // Se conflito for "id", precisa enviar id (existente ou novo)
    id: hasValidId ? c.id : conflict === "id" ? crypto.randomUUID() : undefined,

    user_id: userId,

    name: toTextOrEmpty(c.name),
    phone,
    email,
    cpf,
    address,
    tag,
    priority: toTextOrNull(c.priority) || "media",
    note,

    identity_key: identityKey,

    purchases: Array.isArray(c.purchases) ? c.purchases : [],
    payments: Array.isArray(c.payments) ? c.payments : [],

    resolved: Boolean(c.resolved),
    resolved_at: c.resolvedAt || c.resolved_at || null,

    created_at: c.createdAt || c.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const OPTIONAL = [
    "phone",
    "email",
    "cpf",
    "address",
    "tag",
    "priority",
    "note",
    "identity_key",
    "purchases",
    "payments",
    "resolved",
    "resolved_at",
    "created_at",
    "updated_at",
  ];

  return await upsertWithFallback("pendencias", basePayload, conflict, OPTIONAL);
}

// ✅ Atualizado conforme solicitado: apenas ID
export async function deletePendencia(id) {
  const { error } = await supabase
    .from('pendencias')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ------------------------------------------------------------------
// SECTION 3: TRANSACTIONS (Histórico Imutável) ✅ ANTI-DUPLICAÇÃO
// ------------------------------------------------------------------

export async function insertTransaction(userId, t) {
  const basePayload = {
    id: t.id || crypto.randomUUID(), // ✅ sempre fixo => idempotente
    user_id: userId,
    date: t.date,
    kind: t.kind,
    category: t.category,
    description: t.description,
    amount: Number(t.amount || 0),
    method: t.method || "Manual",
    status: t.status || "posted",
    created_at: t.created_at || new Date().toISOString(),
  };

  const OPTIONAL = ["method", "status", "created_at"];
  return await upsertHistoryWithFallback(
    "transactions",
    basePayload,
    OPTIONAL,
    "id"
  );
}

export async function reverseTransaction(userId, originalTx) {
  const payload = {
    id: crypto.randomUUID(),
    user_id: userId,
    date: originalTx.date,
    kind: originalTx.kind === "in" ? "out" : "in",
    category: "reversal",
    description: `ESTORNO: ${originalTx.description}`,
    amount: Number(originalTx.amount || 0),
    method: "System",
    status: "reversal",
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ------------------------------------------------------------------
// SECTION 4: SALES (Histórico Imutável) ✅ ANTI-DUPLICAÇÃO
// ------------------------------------------------------------------

export async function insertSale(userId, s) {
  const basePayload = {
    id: s.id || crypto.randomUUID(), // ✅ sempre fixo => idempotente
    user_id: userId,
    date: s.date,
    time: s.time || null,
    code: s.code || null,
    status: s.status || "paid",
    total: Number(s.total || 0),
    items: Array.isArray(s.items) ? s.items : [],
    payments: Array.isArray(s.payments) ? s.payments : [],
    items_count: Number(s.itemsCount ?? s.items_count ?? 0),
    payment: s.payment || null,
    client_id: s.clientId || s.client_id || null,
    paid_at_sale: Number(s.paidAtSale || 0),
    pending_at_sale: Number(s.pendingAtSale || 0),
    created_at: s.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const OPTIONAL = [
    "payments",
    "items_count",
    "payment",
    "client_id",
    "paid_at_sale",
    "pending_at_sale",
    "created_at",
    "updated_at",
    "time",
    "code",
    "status",
  ];

  return await upsertHistoryWithFallback("sales", basePayload, OPTIONAL, "id");
}

export async function cancelSale(userId, saleId) {
  const { data, error } = await supabase
    .from("sales")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", saleId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

// ------------------------------------------------------------------
// SECTION 5: GOALS (Meta Ativa por Usuário) ✅ SEM DUPLICAR
// ------------------------------------------------------------------
export async function upsertGoal(userId, goal) {
  const payload = {
    user_id: userId,
    value: Number(goal?.value || 0),
    period: String(goal?.period || "1"),
    start_date: goal?.startDate || null, // YYYY-MM-DD
    daily_sales_target: Number(goal?.dailySalesTarget || 0),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("goals")
    .upsert(payload, { onConflict: "user_id" }) // ✅ 1 por usuário
    .select("*")
    .single();

  if (error) throw error;

  // normaliza pro formato do seu app
  return {
    value: Number(data.value || 0),
    period: String(data.period || "1"),
    startDate: data.start_date ? String(data.start_date) : null,
    dailySalesTarget: Number(data.daily_sales_target || 0),
  };
}

export async function loadGoal(userId) {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    value: Number(data.value || 0),
    period: String(data.period || "1"),
    startDate: data.start_date ? String(data.start_date) : null,
    dailySalesTarget: Number(data.daily_sales_target || 0),
  };
}

// ------------------------------------------------------------------
// SECTION 6: LOADERS
// ------------------------------------------------------------------

export async function loadSubscription(userId) {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function loadAll(userId) {
  const [
    companyRes,
    txRes,
    productsRes,
    pendRes,
    salesRes,
    achRes,
    profileRes,
    subRes,
    goalRes, // ✅ add
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true }),
    supabase
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("pendencias")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("achievements")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    // ✅ goal
    supabase.from("goals").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  if (companyRes.error) throw companyRes.error;
  if (txRes.error) throw txRes.error;
  if (productsRes.error) throw productsRes.error;
  if (pendRes.error) throw pendRes.error;
  if (salesRes.error) throw salesRes.error;
  if (achRes.error) throw achRes.error;
  if (profileRes.error) throw profileRes.error;
  if (subRes.error) throw subRes.error;
  if (goalRes.error) throw goalRes.error;

  let company = companyRes.data;
  if (!company) {
    const created = await supabase
      .from("companies")
      .insert({ user_id: userId, name: "Minha Empresa", start_balance: 1000 })
      .select("*")
      .single();
    if (created.error) throw created.error;
    company = created.data;
  }

  let achievements = achRes.data;
  if (!achievements) {
    const created = await supabase
      .from("achievements")
      .insert({
        user_id: userId,
        last_login: new Date().toISOString().slice(0, 10),
      })
      .select("*")
      .single();
    if (created.error) throw created.error;
    achievements = created.data;
  }

  // ✅ Prepara o objeto goal
  const goal = goalRes.data
    ? {
        value: Number(goalRes.data.value || 0),
        period: String(goalRes.data.period || "1"),
        startDate: goalRes.data.start_date
          ? String(goalRes.data.start_date)
          : null,
        dailySalesTarget: Number(goalRes.data.daily_sales_target || 0),
      }
    : null;

  return {
    company,
    transactions: txRes.data || [],
    products: productsRes.data || [],
    pendencias: pendRes.data || [],
    sales: salesRes.data || [],
    achievements,
    profile: profileRes.data || null,
    subscription: subRes.data || null,
    goal, // ✅ aqui
  };
}

// ------------------------------------------------------------------
// SECTION 7: COMPANY & PROFILE
// ------------------------------------------------------------------

export async function saveCompany(userId, company) {
  const payload = {
    user_id: userId,
    name: company.name,
    cnpj: company.cnpj || "",
    sector: company.sector || "",
    city: company.city || "",
    start_balance: Number(company.startBalance ?? company.start_balance ?? 0),
  };
  const { data, error } = await supabase
    .from("companies")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId, patch) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ------------------------------------------------------------------
// SECTION 8: LEGACY / BULK
// ------------------------------------------------------------------

async function deleteMissingByIds(table, userId, ids) {
  const clean = (ids || []).filter(Boolean).map(String).filter(isUuid);
  if ((ids || []).length > 0 && clean.length === 0) return;
  if (clean.length === 0) return;

  // ✅ PostgREST "in" precisa de aspas
  const list = clean.map((x) => `"${x}"`).join(",");

  const { error } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId)
    .not("id", "in", `(${list})`);

  if (error) throw error;
}

export async function replaceProducts(userId, products) {
  const items = products || [];
  const normalized = items.map((p) => {
    const price = p.price === 0 ? 0 : toNullableNumber(p.price);
    const cost = p.cost === 0 ? 0 : toNullableNumber(p.cost);

    const marginBRL = price !== null && cost !== null ? price - cost : null;
    const marginPct =
      price !== null && cost !== null && price > 0
        ? ((price - cost) / price) * 100
        : null;

    return {
      id: p.id || crypto.randomUUID(),
      user_id: userId,
      name: toTextOrEmpty(p.name),
      code: toTextOrNull(p.code),
      type: toTextOrEmpty(p.type) || "product",
      price,
      cost,
      stock: toNullableInt(p.stock),
      min_stock: toNullableInt(p.minStock ?? p.min_stock),
      expiry_date: toTextOrNull(p.expiryDate ?? p.expiry_date),
      category: toTextOrEmpty(p.category),
      notes: toTextOrEmpty(p.notes),
      photo: toTextOrEmpty(p.photo),
      margin_pct: marginPct,
      margin_brl: marginBRL,
      created_at: p.createdAt || p.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  if (!normalized.length) return [];

  const { data, error } = await supabase
    .from("products")
    .upsert(normalized, { onConflict: "id" })
    .select("*");

  if (error) throw error;
  return data || [];
}