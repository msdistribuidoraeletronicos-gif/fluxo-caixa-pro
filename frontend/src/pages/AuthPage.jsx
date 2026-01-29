// src/pages/AuthPage.jsx
import React, { useState } from "react";
import { Wallet, Eye, EyeOff, ArrowRight, UserPlus, LogIn } from "lucide-react";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | signup

  const [email, setEmail] = useState("");

  // ✅ senha da conta (Supabase Auth)
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // signup extras
  const [companyName, setCompanyName] = useState("");
  const [privacyPass, setPrivacyPass] = useState(""); // senha de privacidade (seu app)
  const [showPriv, setShowPriv] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleLogin = async () => {
    setMsg("");
    if (!email) return setMsg("Digite um email válido.");
    if (!password) return setMsg("Digite sua senha.");

    setLoading(true);
    try {
      await onLogin({
        email,
        password,
        shouldCreateUser: false,
      });
      // App.jsx vai detectar session e navegar
    } catch (e) {
      setMsg(e?.message || "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setMsg("");
    if (!email) return setMsg("Digite um email válido.");
    if (!password) return setMsg("Crie uma senha para sua conta.");
    if (String(password).length < 6)
      return setMsg("A senha precisa ter pelo menos 6 caracteres.");
    if (!companyName) return setMsg("Informe o nome da empresa.");
    if (!privacyPass) return setMsg("Crie uma senha de privacidade.");

    setLoading(true);
    try {
      await onLogin({
        email,
        password,
        shouldCreateUser: true,
        name: "Usuário",
        companyName,
        privacyPass,
      });
      setMsg("Conta criada! Você já pode entrar.");
    } catch (e) {
      setMsg(e?.message || "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading &&
    !!email &&
    !!password &&
    (mode === "login" || (mode === "signup" && !!companyName && !!privacyPass));

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
                autoComplete="email"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
              />
            </label>

            {/* ✅ Senha da conta (login e cadastro) */}
            <label className="block space-y-1.5">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                Senha
              </div>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPass ? "text" : "password"}
                  placeholder={
                    mode === "login"
                      ? "Digite sua senha"
                      : "Crie uma senha (mín. 6 caracteres)"
                  }
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-2.5 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  title={showPass ? "Ocultar" : "Mostrar"}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
                      {showPriv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              disabled={!canSubmit}
              onClick={mode === "login" ? handleLogin : handleSignup}
              className="mt-2 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
              <ArrowRight className="ml-2 inline h-4 w-4 opacity-80" />
            </button>

            <div className="pt-2 text-center text-xs text-zinc-500">
              {mode === "login"
                ? "Use seu email e senha para acessar."
                : "Crie sua conta com email e senha."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
