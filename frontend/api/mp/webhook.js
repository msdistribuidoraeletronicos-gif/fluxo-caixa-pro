import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Mercado Pago manda POST (normalmente)
  if (req.method !== "POST") return res.status(200).send("ok");

  try {
    const body = req.body || {};

    // Aqui você vai buscar o pagamento/preference no MP se quiser confirmar.
    // E então atualizar sua tabela de "subscription" no Supabase.
    // Como cada projeto seu pode estar com schema diferente, deixo o padrão:

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Exemplo: salvar log bruto do webhook (opcional)
    await supabaseAdmin.from("mp_webhook_logs").insert({
      payload: body,
      created_at: new Date().toISOString(),
    });

    // TODO: você implementa:
    // - consultar pagamento no MP
    // - identificar user_id e plan_id via metadata
    // - atualizar subscription.status = 'active' etc.

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ received: true }); // MP costuma pedir 200 pra não ficar reenviando sem parar
  }
}
