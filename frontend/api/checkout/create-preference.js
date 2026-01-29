import mercadopago from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY; // pode ser anon mesmo
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

const PLANS = {
  mensal:   { title: "Plano PRO Mensal",   price: 29.9 },
  trimestral:{ title: "Plano PRO Trimestral", price: 79.9 },
  anual:    { title: "Plano PRO Anual",    price: 249.9 },
  vitalicio:{ title: "Plano PRO Vitalício", price: 499.9 },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing Bearer token" });

    // Valida usuário via Supabase Auth usando o token do cliente
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const { planId } = req.body || {};
    const plan = PLANS[String(planId || "")];
    if (!plan) return res.status(400).json({ error: "Invalid planId" });

    mercadopago.configure({ access_token: MP_ACCESS_TOKEN });

    // URLs de retorno voltam pro seu app (mesmo domínio)
    const origin =
      req.headers["x-forwarded-proto"] && req.headers["x-forwarded-host"]
        ? `${req.headers["x-forwarded-proto"]}://${req.headers["x-forwarded-host"]}`
        : `https://${req.headers.host}`;

    const preference = {
      items: [
        {
          title: plan.title,
          quantity: 1,
          unit_price: Number(plan.price),
          currency_id: "BRL",
        },
      ],
      metadata: {
        user_id: userData.user.id,
        plan_id: planId,
      },
      back_urls: {
        success: `${origin}/?mp=success`,
        pending: `${origin}/?mp=pending`,
        failure: `${origin}/?mp=failure`,
      },
      auto_return: "approved",
      notification_url: `${origin}/api/mp/webhook`, // 👈 webhook no vercel
    };

    const result = await mercadopago.preferences.create(preference);

    return res.status(200).json({
      init_point: result?.body?.init_point,
      id: result?.body?.id,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
}
