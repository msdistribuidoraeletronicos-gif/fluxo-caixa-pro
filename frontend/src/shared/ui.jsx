// src/shared/ui.jsx
import React, { forwardRef } from "react"; // ✅ Adicionado forwardRef
import { motion } from "framer-motion";
import { ChevronRight, Eye, EyeOff } from "lucide-react";

// helper robusto para classes condicionais
export const cx = (...classes) => classes.filter(Boolean).join(" ");

// -----------------------------
// ✅ 1. Helpers de Plano
// -----------------------------
const PLAN_BADGE = {
  mensal: { label: "PRO Mensal", color: "bg-blue-600" },
  trimestral: { label: "PRO Trimestral", color: "bg-emerald-600" },
  anual: { label: "PRO Anual", color: "bg-indigo-600" },
  vitalicio: { label: "PRO Vitalício", color: "bg-amber-500" },
};

const getPlanBadge = (sub) => {
  if (!sub) return null;

  if (sub.kind === "trial") {
    return {
      label: `Teste: ${sub.trialDaysLeft} dia(s)`,
      color: sub.trialDaysLeft <= 1 ? "bg-red-500" : "bg-amber-500",
    };
  }

  if (sub.kind === "active") {
    return (
      PLAN_BADGE[sub.planId] || {
        label: "PRO",
        color: "bg-blue-600",
      }
    );
  }

  return {
    label: "Bloqueado",
    color: "bg-zinc-600",
  };
};

// -----------------------------
// Header
// -----------------------------
export function Header({
  user,
  achievements,
  dark,
  setDark,
  onLogout,
  hidden,
  onToggleHidden,
  subscriptionSummary,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Painel de Caixa
        </div>

        <div className="text-2xl font-extrabold">
          Olá, {user?.name || "Usuário"}
        </div>

        <div className="mt-1 text-sm text-zinc-500">
          Empresa: {user?.companyName || "Minha Empresa"} • Nível{" "}
          {achievements?.level || 1}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* 🔒 Privacidade */}
        <button
          onClick={onToggleHidden}
          className="rounded-xl bg-zinc-800/60 p-2 text-white hover:bg-zinc-700 transition-colors"
          title="Ocultar valores"
        >
          {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        {/* ⭐ Selo do plano */}
        {subscriptionSummary && (() => {
          const badge = getPlanBadge(subscriptionSummary);
          if (!badge) return null;

          return (
            <div
              className={`
                ${badge.color}
                px-3 py-1
                rounded-full
                text-xs
                font-bold
                text-white
                shadow-md
                flex items-center gap-1
                animate-fade-in
              `}
            >
              👑 {badge.label}
            </div>
          );
        })()}

        {/* 🌗 Tema */}
        <button
          onClick={() => setDark(!dark)}
          className="rounded-xl bg-zinc-800/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          {dark ? "Modo claro" : "Modo escuro"}
        </button>

        {/* 🚪 Logout */}
        <button
          onClick={onLogout}
          className="rounded-xl bg-red-600/90 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-sm"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

// -----------------------------
// Buttons (Padrão)
// -----------------------------

export function PrimaryButton({
  children,
  onClick,
  icon: Icon,
  className,
  disabled,
  tone = "brand",
  type = "button",
}) {
  const tones = {
    brand: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30",
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
        tones[tone] || tones.brand,
        className
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </motion.button>
  );
}

export function SoftButton({
  children,
  onClick,
  icon: Icon,
  className,
  type = "button",
  disabled,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

// -----------------------------
// Card
// -----------------------------
export function Card({ children, className, highlight }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-zinc-950",
        highlight
          ? "border-blue-200 ring-4 ring-blue-50 dark:border-blue-900 dark:ring-blue-900/20"
          : "border-zinc-200 dark:border-zinc-800",
        className
      )}
    >
      {children}
    </div>
  );
}

// -----------------------------
// Badge (Componente Genérico)
// -----------------------------
export function Badge({ children, tone = "neutral", size = "sm" }) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    success:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    danger:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    warning:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    brand:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  };

  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        tones[tone] || tones.neutral,
        sizes[size] || sizes.sm
      )}
    >
      {children}
    </span>
  );
}

// -----------------------------
// Input (ATUALIZADO com forwardRef)
// -----------------------------
export const Input = forwardRef(function Input(
  {
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    right,
    className = "",
    ...props
  },
  ref
) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          {label}
        </div>
      )}

      <div className="relative group">
        <input
          ref={ref} // ✅ ESSENCIAL para o foco automático
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange && onChange(e.target.value)}
          className={cx(
            "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-700 dark:focus:ring-blue-900/30",
            className
          )}
          {...props}
        />

        {right && (
          <div className="absolute inset-y-0 right-3 flex items-center text-zinc-400">
            {right}
          </div>
        )}
      </div>
    </label>
  );
});

// -----------------------------
// Select
// -----------------------------
export function Select({ label, value, onChange, options }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          {label}
        </div>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
      </div>
    </label>
  );
}

// -----------------------------
// ModalShell (Padrão)
// -----------------------------
export function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  footer,
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className={cx(
          // ✅ vira "coluna" e limita altura total
          "w-full rounded-2xl bg-white shadow-2xl dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800",
          "flex flex-col",
          // ✅ tamanho padrão (mesmo em telas menores)
          "max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)]",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        {/* Header (não rola) */}
        <div className="p-5 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold">{title}</div>
              {subtitle ? (
                <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
              ) : null}
            </div>

            <button
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm font-bold opacity-60 hover:opacity-100"
              aria-label="Fechar modal"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ✅ Conteúdo rola aqui (se passar do limite) */}
        <div className="p-5 pt-4 overflow-y-auto min-h-0">{children}</div>

        {/* Footer (não rola) */}
        {footer ? (
          <div className="p-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            {footer}
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}