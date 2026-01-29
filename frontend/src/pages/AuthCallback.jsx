// src/pages/AuthCallback.jsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AuthCallback({ onNavigate }) {
  const [status, setStatus] = useState("Processando login...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = url.hash;

        // 1. Troca de código (PKCE)
        const code = url.searchParams.get("code");
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }

        // 2. Verifica sessão ativa (Supabase processa o hash automaticamente no getSession)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (!session) {
          // Se não tem sessão, volta pro login
          onNavigate("auth");
          return;
        }

        // 3. Verifica se é Recuperação de Senha
        // O Supabase manda "type=recovery" no hash ou query param
        const isRecovery = 
          hash.includes("type=recovery") || 
          url.searchParams.get("type") === "recovery";

        // Limpa a URL para não ficar suja com tokens
        window.history.replaceState({}, document.title, "/");

        if (isRecovery) {
          setStatus("Redirecionando para criar nova senha...");
          // Manda para a rota de reset
          onNavigate("reset_password");
        } else {
          setStatus("Login confirmado! Redirecionando...");
          // Manda para o dashboard
          onNavigate("dashboard");
        }

      } catch (e) {
        console.error("Erro no callback:", e);
        onNavigate("auth");
      }
    };

    handleCallback();
  }, [onNavigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-500 font-medium">
      {status}
    </div>
  );
}