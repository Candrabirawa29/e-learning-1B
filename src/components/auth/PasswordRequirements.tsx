"use client";

import * as React from "react";
import { evaluatePasswordRules } from "@/lib/auth/password-rules";
import { Check, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password?: string;
  confirmPassword?: string;
  className?: string;
}

export function PasswordRequirements({
  password = "",
  confirmPassword,
  className,
}: PasswordRequirementsProps) {
  const evaluation = React.useMemo(
    () => evaluatePasswordRules(password, confirmPassword),
    [password, confirmPassword]
  );

  const { rules, metCount, totalCount, isAllMet } = evaluation;

  // Level kekuatan kata sandi untuk bar
  const strengthColor = React.useMemo(() => {
    if (metCount === 0) return "bg-muted";
    if (metCount === 1) return "bg-red-500";
    if (metCount === 2) return "bg-orange-500";
    if (metCount === 3) return "bg-amber-500";
    return "bg-emerald-500";
  }, [metCount]);

  const strengthLabel = React.useMemo(() => {
    if (!password) return "Belum diisi";
    if (metCount <= 1) return "Sangat Lemah";
    if (metCount === 2) return "Cukup";
    if (metCount === 3) return "Kuat";
    return "Sangat Aman & Lengkap";
  }, [password, metCount]);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/60 p-3 space-y-2.5 transition-all duration-300",
        className
      )}
    >
      {/* Header bar kekuatan kata sandi */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          {isAllMet ? (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 animate-in zoom-in-50 duration-200" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span>Keamanan Kata Sandi</span>
        </div>
        <span
          className={cn(
            "text-[10px] font-semibold transition-colors duration-200",
            metCount === 0
              ? "text-muted-foreground"
              : metCount <= 1
              ? "text-red-500"
              : metCount <= 3
              ? "text-amber-500"
              : "text-emerald-500"
          )}
        >
          {strengthLabel} ({metCount}/{totalCount})
        </span>
      </div>

      {/* Progress Bar 4 Segmen */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {Array.from({ length: 4 }).map((_, idx) => {
          const isFilled = idx < metCount;
          return (
            <div
              key={idx}
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-out",
                isFilled ? strengthColor : "bg-muted/80"
              )}
            />
          );
        })}
      </div>

      {/* Daftar Kriteria Sesuai Zod */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
        {rules.map((rule) => {
          return (
            <div
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition-all duration-300",
                rule.isMet
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : "text-red-500/90 dark:text-red-400/90"
              )}
            >
              <div
                className={cn(
                  "h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                  rule.isMet
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 scale-105"
                    : "bg-red-500/15 text-red-500"
                )}
              >
                {rule.isMet ? (
                  <Check className="h-2.5 w-2.5 stroke-[2.5] animate-in zoom-in-75 duration-200" />
                ) : (
                  <X className="h-2.5 w-2.5 stroke-[2.5]" />
                )}
              </div>
              <span className="leading-tight">{rule.label}</span>
            </div>
          );
        })}
      </div>

      {/* Indikator Konfirmasi Kata Sandi (Jika disediakan) */}
      {confirmPassword !== undefined && confirmPassword.length > 0 && (
        <div
          className={cn(
            "pt-1 border-t flex items-center gap-1.5 text-[11px] transition-all duration-300",
            evaluation.isConfirmMatching
              ? "text-emerald-600 dark:text-emerald-400 font-medium"
              : "text-red-500/90 dark:text-red-400/90"
          )}
        >
          <div
            className={cn(
              "h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
              evaluation.isConfirmMatching
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-red-500/15 text-red-500"
            )}
          >
            {evaluation.isConfirmMatching ? (
              <Check className="h-2.5 w-2.5 stroke-[2.5]" />
            ) : (
              <X className="h-2.5 w-2.5 stroke-[2.5]" />
            )}
          </div>
          <span>
            {evaluation.isConfirmMatching
              ? "Konfirmasi kata sandi cocok"
              : "Konfirmasi kata sandi belum cocok"}
          </span>
        </div>
      )}
    </div>
  );
}
