// src/pages/AuthPage.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { saveProfile, saveCompany } from "../lib/db";
import { Wallet, Eye, EyeOff, ArrowRight, UserPlus, LogIn } from "lucide-react";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | signup

  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [privacyPass, setPrivacyPass] = useState(""); // ✅ camelCase no state
  const [showPriv, setShowPriv] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Guardamos o "cadastro pendente" até o usuário clicar no link e virar session
  const PENDING_KEY = "pending_signup_profile";

  // Este useEffect tenta rodar caso o componente monte e já exista sessão
  // (Dependendo da rota do App.jsx, a lógica principal de salvamento
  // pós-redirect pode precisar ficar no App.jsx, mas deixamos aqui como backup)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const userId = session?.user?.id;
      if (!userId) return;

      const pendingRaw = localStorage.getItem(PENDING_KEY);
      if (!pendingRaw) return;

      try {
        const pending = JSON.parse(pendingRaw);

        // 1. Salva a empresa
        if (pending.companyName) {
          await saveCompany(userId, {
            name: pending.companyName,
            cnpj: "",
            sector: "",
            city: "",
            startBalance: 0,
          });
        }

        // 2. Salva o perfil com a senha mapeada corretamente
        await saveProfile(userId, {
          name: "Usuário",
          company_name: pending.companyName || "",
          privacy_pass: pending.privacyPass || "", // ✅ Mapeia camelCase -> snake_case
        });

        // Limpa pendência
        localStorage.removeItem(PENDING_KEY);
      } catch (e) {
        console.error("Finalize signup error:", e);
      }
    })();
  }, []);

  const handleLogin = async () => {
    setMsg("");
    if (!email) return setMsg("Digite um email válido.");
    setLoading(true);
    try {
      // Login: apenas email
      // ✅ CORREÇÃO 1: Adicionado redirectTo
      await onLogin({
        email,
        shouldCreateUser: false,
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      setMsg("Enviamos um link. Verifique seu email.");
    } catch (e) {
      setMsg(e?.message || "Erro ao enviar link.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setMsg("");
    if (!email) return setMsg("Digite um email válido.");
    if (!companyName) return setMsg("Informe o nome da empresa.");
    // A senha de privacidade é opcional no banco, mas aqui forçamos criar uma boa prática
    // Se quiser opcional, remova este if.
    if (!privacyPass) return setMsg("Crie uma senha de privacidade.");

    setLoading(true);
    try {
      // Salva dados no localStorage para recuperar na volta do Magic Link
      localStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          companyName,
          privacyPass, // Salva como camelCase
        })
      );

      // Dispara o Magic Link
      // ✅ CORREÇÃO 2: Adicionado redirectTo
      await onLogin({
        email,
        shouldCreateUser: true,
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      setMsg("Conta iniciada! Verifique seu email para confirmar o acesso.");
    } catch (e) {
      setMsg(e?.message || "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20">
            <Wallet className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Fluxo Pro
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Entre ou crie sua conta para acessar o painel.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
          {/* Tabs */}
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            <button
              onClick={() => setMode("login")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-all ${
                mode === "login"
                  ? "bg-white shadow-sm dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <LogIn className="h-4 w-4" /> Entrar
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-all ${
                mode === "signup"
                  ? "bg-white shadow-sm dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <UserPlus className="h-4 w-4" /> Cadastrar
            </button>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Email
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
              />
            </label>

            {mode === "signup" && (
              <>
                {/* Empresa */}
                <label className="block space-y-1.5">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Nome da Empresa
                  </div>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Minha Empresa Ltda"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
                  />
                </label>

                {/* Senha de privacidade */}
                <label className="block space-y-1.5">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Senha de privacidade (mostrar valores)
                  </div>
                  <div className="relative">
                    <input
                      value={privacyPass}
                      onChange={(e) => setPrivacyPass(e.target.value)}
                      type={showPriv ? "text" : "password"}
                      placeholder="Crie uma senha para liberar valores"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPriv((v) => !v)}
                      className="absolute right-3 top-2.5 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      title={showPriv ? "Ocultar" : "Mostrar"}
                    >
                      {showPriv ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Usada apenas para desbloquear a visualização de saldos no painel.
                  </p>
                </label>
              </>
            )}

            {msg ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                {msg}
              </div>
            ) : null}

            <button
              disabled={
                loading ||
                !email ||
                (mode === "signup" && (!companyName || !privacyPass))
              }
              onClick={mode === "login" ? handleLogin : handleSignup}
              className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Aguarde..."
                : mode === "login"
                ? "Entrar com Magic Link"
                : "Cadastrar com Magic Link"}
              <ArrowRight className="ml-2 inline h-4 w-4 opacity-80" />
            </button>

            <div className="pt-2 text-center text-xs text-zinc-500">
              Ao clicar, você receberá um link no email para confirmar o acesso.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}