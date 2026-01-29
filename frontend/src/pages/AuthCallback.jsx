import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finishLogin = async () => {
      try {
        const href = window.location.href;
        const hasCode = href.includes("?code=");
        const hasHashTokens =
          window.location.hash.includes("access_token=") ||
          window.location.hash.includes("refresh_token=");

        // 1) Fluxo PKCE (code)
        if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) throw error;

          navigate("/", { replace: true });
          return;
        }

        // 2) Fluxo implicit (hash) — supabase lê o hash e cria session
        if (hasHashTokens) {
          // Em versões atuais, isso já “captura” o hash e cria a session
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (data?.session) {
            // limpa o hash da URL (opcional, deixa mais bonito)
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate("/", { replace: true });
            return;
          }
        }

        // 3) Fallback: se não achou nada, manda pro /auth
        navigate("/auth", { replace: true });
      } catch (e) {
        console.error("Auth callback error:", e?.message || e);
        navigate("/auth", { replace: true });
      }
    };

    finishLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-zinc-500">
      Finalizando login...
    </div>
  );
}
