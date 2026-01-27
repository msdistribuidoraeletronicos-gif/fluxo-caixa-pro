import express from "express";
import mercadopago from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
});

const PLAN_MAP = {
  mensal:     { title: "Plano Mensal",     price: 89.90,  days: 30 },
  trimestral: { title: "Plano Trimestral", price: 199.99, days: 90 },
  anual:      { title: "Plano Anual",      price: 899.99, days: 365 },
  vitalicio:  { title: "Plano Vitalício",  price: 1890.90, days: null },
};

// helper: calcula ends_at
function computeEndsAt(planId) {
  const p = PLAN_MAP[planId];
  if (!p) return null;
  if (p.days === null) return null; // vitalício
  const d = new Date();
  d.setDate(d.getDate() + p.days);
  return d.toISOString();
}

// 1) Cria checkout
router.post("/create-checkout", async (req, res) => {
  try {
    const { planId, userId } = req.body;

    const plan = PLAN_MAP[planId];
    if (!plan) return res.status(400).json({ error: "Plano inválido" });

    const preference = {
      items: [
        {
          title: plan.title,
          quantity: 1,
          unit_price: Number(plan.price),
          currency_id: "BRL",
        },
      ],
      metadata: { user_id: userId, plan_id: planId },
      notification_url: `${process.env.APP_URL}/api/mp/webhook`,
      back_urls: {
        success: `${process.env.APP_URL}/?mp=success`,
        failure: `${process.env.APP_URL}/?mp=failure`,
        pending: `${process.env.APP_URL}/?mp=pending`,
      },
      auto_return: "approved",
    };

    const resp = await mercadopago.preferences.create(preference);

    // grava pagamento criado (opcional)
    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      plan_id: planId,
      mp_preference_id: resp.body.id,
      status: "created",
      amount: Number(plan.price),
      raw: resp.body,
    });

    return res.json({ init_point: resp.body.init_point });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Erro ao criar checkout" });
  }
});

// 2) Webhook MP
router.post("/webhook", async (req, res) => {
  try {
    // MercadoPago manda algo como { type, data: { id } }
    const { type, data } = req.body || {};
    if (type !== "payment") return res.sendStatus(200);

    const paymentId = data?.id;
    if (!paymentId) return res.sendStatus(200);

    const payment = await mercadopago.payment.findById(paymentId);
    const p = payment.body;

    const status = p.status; // approved, rejected, etc
    const meta = p.metadata || {};
    const userId = meta.user_id;
    const planId = meta.plan_id;

    // log payment
    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      plan_id: planId,
      mp_payment_id: String(paymentId),
      status,
      amount: Number(p.transaction_amount || 0),
      raw: p,
    });

    if (status !== "approved") return res.sendStatus(200);

    const endsAt = computeEndsAt(planId);

    // Atualiza assinatura do usuário
    // Aqui: mantém 1 registro "mais recente" por user (você já busca order created_at desc limit 1)
    await supabaseAdmin.from("user_subscriptions").insert({
      user_id: userId,
      status: "active",
      plan_id: planId,
      current_period_started_at: new Date().toISOString(),
      current_period_ends_at: endsAt, // null para vitalício
      trial_started_at: null,
      trial_ends_at: null,
    });

    return res.sendStatus(200);
  } catch (e) {
    console.error(e);
    return res.sendStatus(200);
  }
});

export default router;
