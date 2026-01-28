import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const finishLogin = async () => {
      // Tenta finalizar a sessão a partir do link de confirmação
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      if (!error) {
        navigate("/", { replace: true });
      } else {
        console.error("Auth callback error:", error.message);
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
