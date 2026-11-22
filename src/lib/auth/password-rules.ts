/**
 * Logika evaluasi kepatuhan kata sandi berdasarkan skema Zod changePasswordSchema.
 * Digunakan bersama antara komponen UI interaktif dan validasi server.
 */

export interface PasswordRuleItem {
  id: "min8" | "hasUpper" | "hasLower" | "hasNumber";
  label: string;
  isMet: boolean;
}

export interface PasswordEvaluationResult {
  rules: PasswordRuleItem[];
  metCount: number;
  totalCount: number;
  isAllMet: boolean;
  score: number; // 0 - 100
  isConfirmMatching?: boolean;
}

export function evaluatePasswordRules(
  password: string = "",
  confirmPassword?: string
): PasswordEvaluationResult {
  const min8 = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const rules: PasswordRuleItem[] = [
    {
      id: "min8",
      label: "Minimal 8 karakter",
      isMet: min8,
    },
    {
      id: "hasUpper",
      label: "Setidaknya 1 huruf besar (A-Z)",
      isMet: hasUpper,
    },
    {
      id: "hasLower",
      label: "Setidaknya 1 huruf kecil (a-z)",
      isMet: hasLower,
    },
    {
      id: "hasNumber",
      label: "Setidaknya 1 angka (0-9)",
      isMet: hasNumber,
    },
  ];

  const metCount = rules.filter((r) => r.isMet).length;
  const totalCount = rules.length;
  const isAllMet = metCount === totalCount;
  const score = Math.round((metCount / totalCount) * 100);

  let isConfirmMatching: boolean | undefined = undefined;
  if (confirmPassword !== undefined) {
    isConfirmMatching = Boolean(password && confirmPassword && password === confirmPassword);
  }

  return {
    rules,
    metCount,
    totalCount,
    isAllMet,
    score,
    isConfirmMatching,
  };
}

export function isPasswordFullyCompliant(password: string = ""): boolean {
  return evaluatePasswordRules(password).isAllMet;
}
