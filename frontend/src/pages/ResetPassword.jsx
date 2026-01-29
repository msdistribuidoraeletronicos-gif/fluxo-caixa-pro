// src/pages/ResetPassword.jsx
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { 
  Card, 
  Input, 
  PrimaryButton, 
  SoftButton 
} from "../shared/ui"; // Ajuste o caminho conforme sua estrutura

import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ResetPassword({ onNavigate }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async () => {
    if (!password) return setError("Digite uma nova senha.");
    if (password.length < 6) return setError("A senha deve ter no mínimo 6 caracteres.");

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      
      // Opcional: Redirecionar automaticamente após alguns segundos
      setTimeout(() => {
        onNavigate("dashboard");
      }, 2000);

    } catch (e) {
      setError(e.message || "Erro ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Card className="w-full max-w-md text-center py-10">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">Senha atualizada!</h2>
          <p className="text-zinc-500 mt-2">
            Sua senha foi alterada com sucesso. Você já está logado.
          </p>
          <div className="mt-6">
            <PrimaryButton 
              tone="success" 
              onClick={() => onNavigate("dashboard")}
              className="w-full justify-center"
            >
              Ir para o Dashboard
            </PrimaryButton>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Nova Senha
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Digite sua nova senha abaixo para recuperar o acesso à conta.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Nova Senha"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={setPassword}
          />

          <PrimaryButton
            onClick={handleUpdatePassword}
            disabled={loading}
            className="w-full justify-center"
          >
            {loading ? "Atualizando..." : "Confirmar Nova Senha"}
          </PrimaryButton>

          <SoftButton 
            onClick={() => onNavigate("auth")} 
            className="w-full justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Login
          </SoftButton>
        </div>
      </Card>
    </div>
  );
}