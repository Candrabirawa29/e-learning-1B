"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, Loader2, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDeactivatedError = searchParams.get("error") === "deactivated";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    isDeactivatedError
      ? "Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi admin kelas jika Anda merasa ini adalah kekeliruan."
      : null
  );

  // Jika dialihkan karena dinonaktifkan, bersihkan sesi Supabase lokal
  React.useEffect(() => {
    if (isDeactivatedError) {
      const supabase = createClient();
      supabase.auth.signOut().catch(() => {});
    }
  }, [isDeactivatedError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("email", email.trim().toLowerCase());
      formData.set("password", password);

      const result = await loginAction(null, formData);

      if (!result.success) {
        setErrorMessage(result.error || "Gagal masuk. Periksa kembali email dan password Anda.");
        toast.error(result.error || "Gagal masuk.");
      } else if (result.redirectTo) {
        toast.success("Login berhasil! Mengalihkan...");
        router.push(result.redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan pada sistem.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="mx-auto h-10 w-10 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-sm tracking-tight mb-2">
          1B
        </div>
        <CardTitle className="text-lg font-bold tracking-tight">Masuk ke Kelas 1-B</CardTitle>
        <CardDescription className="text-xs">
          Gunakan email yang telah didaftarkan oleh Admin kelas.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3.5 text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium">
              Alamat Email Mahasiswa
            </Label>
            <div className="relative">
              <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nama@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-9 text-xs"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium">
                Kata Sandi
              </Label>
            </div>
            <PasswordInput
              id="password"
              leftIcon={<Lock className="h-4 w-4" />}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="p-2.5 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Akun Internal Kelas
            </div>
            <p>
              Pendaftaran akun baru dilakukan oleh Admin. Jika Anda lupa password, hubungi Admin kelas untuk melakukan reset.
            </p>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 text-xs font-medium gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isSubmitting ? "Memverifikasi..." : "Masuk"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-sm space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Portal Publik
        </Link>

        <React.Suspense fallback={<div className="h-64 rounded-xl border bg-card animate-pulse" />}>
          <LoginForm />
        </React.Suspense>

        <p className="text-center text-[11px] text-muted-foreground">
          Portal Mahasiswa & E-Learning Terpadu Kelas 1-B
        </p>
      </div>
    </div>
  );
}
