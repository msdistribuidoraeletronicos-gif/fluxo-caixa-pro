import "dotenv/config";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const app = express();

// --- Middlewares ---
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/webhook")) {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      req.rawBody = data;
      try {
        req.body = data ? JSON.parse(data) : {};
      } catch {
        req.body = {};
      }
      next();
    });
  } else {
    express.json()(req, res, next);
  }
});

app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
      ].filter(Boolean);

      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
  })
);

// --- Supabase Setup ---
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Helpers ---
function addMonthsKeepingAnchor(date, months, anchorDay) {
  const base = new Date(date);
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(anchorDay, lastDay));
  target.setHours(23, 59, 59, 999);
  return target;
}

async function getUserFromAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user || null;
}

async function mpFetch(path, opts = {}) {
  const url = `https://api.mercadopago.com${path}`;
  const r = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });

  const json = await r.json().catch(() => ({}));

  if (!r.ok) {
    const cause = Array.isArray(json?.cause)
      ? json.cause.map((c) => `${c?.description || c?.code}`).join(" | ")
      : "";
    const msg = json?.message || json?.error || "Erro Mercado Pago";
    throw new Error(`${msg} (${r.status})${cause ? ` -> ${cause}` : ""}`);
  }
  return json;
}

// --- Rotas ---
app.get("/me/subscription", async (req, res) => {
  try {
    const user = await getUserFromAuth(req);
    if (!user) return res.status(401).json({ error: "Não autenticado" });

    const { data, error } = await supabaseAdmin
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    res.json({ subscription: data?.[0] || null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/plans", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) throw error;
    res.json({ plans: data || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/checkout/create-preference", async (req, res) => {
  try {
    const user = await getUserFromAuth(req);
    if (!user) return res.status(401).json({ error: "Não autenticado" });

    const { planId } = req.body || {};
    if (!planId) return res.status(400).json({ error: "planId obrigatório" });

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (planErr) throw planErr;
    if (!plan || !plan.is_active) {
      return res.status(404).json({ error: "Plano inválido ou inativo" });
    }

    const FRONTEND = (process.env.FRONTEND_URL || "http://localhost:5173").trim();

    // ✅ NA VERCEL: BACKEND_PUBLIC_URL PRECISA SER A URL PÚBLICA DA API
    const BACKEND_PUBLIC = (process.env.BACKEND_PUBLIC_URL || "").trim();
    if (!BACKEND_PUBLIC) {
      return res.status(500).json({ error: "BACKEND_PUBLIC_URL não configurada" });
    }

    const successUrl = new URL("/?mp=success", FRONTEND).toString();
    const failureUrl = new URL("/?mp=failure", FRONTEND).toString();
    const pendingUrl = new URL("/?mp=pending", FRONTEND).toString();
    const notifyUrl = new URL("/webhook/mercadopago", BACKEND_PUBLIC).toString();

    const externalRef = `${user.id}:${plan.id}:${Date.now()}`;

    const payload = {
      external_reference: externalRef,
      items: [
        {
          title: plan.title || plan.name || `Plano ${plan.id}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(plan.price),
        },
      ],
      payer: { email: user.email },
      back_urls: { success: successUrl, failure: failureUrl, pending: pendingUrl },
      auto_return: "approved",
      notification_url: notifyUrl,
      metadata: { user_id: user.id, plan_id: plan.id },
    };

    const preference = await mpFetch("/checkout/preferences", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await supabaseAdmin.from("user_subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      status: "pending",
      mp_preference_id: preference.id,
      mp_status: "pending",
    });

    res.json({
      preferenceId: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (e) {
    console.error("Erro Create Preference:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/webhook/mercadopago", async (req, res) => {
  try {
    const body = req.body || {};
    const paymentId = body?.data?.id;
    const topic = body?.type;

    res.status(200).json({ ok: true });

    if (!paymentId || topic !== "payment") return;

    const payment = await mpFetch(`/v1/payments/${paymentId}`, { method: "GET" });

    const userId = payment?.metadata?.user_id;
    const planId = payment?.metadata?.plan_id;
    if (!userId || !planId) return;

    const mpStatus = payment.status;
    const isApproved = mpStatus === "approved";

    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    const now = new Date();
    const anchorDay = now.getDate();
    let nextEnd = null;

    if (plan?.billing_period !== "vitalicio") {
      const months =
        plan.billing_period === "mensal" ? 1 :
        plan.billing_period === "trimestral" ? 3 :
        plan.billing_period === "anual" ? 12 : 1;

      nextEnd = addMonthsKeepingAnchor(now, months, anchorDay);
    }

    const updateData = {
      status: isApproved ? "active" : "pending",
      mp_payment_id: String(paymentId),
      mp_status: mpStatus,
      updated_at: new Date().toISOString(),
      current_period_ends_at: isApproved && nextEnd ? nextEnd.toISOString() : null,
      anchor_day: isApproved ? anchorDay : null,
      current_period_starts_at: isApproved ? now.toISOString() : null,
      last_payment_at: isApproved ? now.toISOString() : null,
      trial_ends_at: null,
    };

    if (!isApproved) {
      delete updateData.anchor_day;
      delete updateData.current_period_starts_at;
      delete updateData.last_payment_at;
      delete updateData.current_period_ends_at;
    }

    await supabaseAdmin
      .from("user_subscriptions")
      .update(updateData)
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .eq("status", "pending");

    if (isApproved) {
      await supabaseAdmin.from("profiles").update({ plan_id: planId }).eq("id", userId);
    }
  } catch (e) {
    console.error("WEBHOOK ERROR:", e);
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

export default app;
