"use client";

import * as React from "react";
import { changePasswordAction, logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { isPasswordFullyCompliant } from "@/lib/auth/password-rules";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, KeyRound, Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPasswordFullyCompliant(newPassword)) {
      setErrorMessage("Kata sandi baru belum memenuhi seluruh kriteria keamanan di bawah.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("newPassword", newPassword);
      formData.set("confirmPassword", confirmPassword);

      const result = await changePasswordAction(null, formData);

      if (!result.success) {
        setErrorMessage(result.error || "Gagal memperbarui password.");
        toast.error(result.error || "Gagal memperbarui password.");
      } else if (result.redirectTo) {
        toast.success("Password baru berhasil disimpan! Akun Anda aktif.");
        router.push(result.redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="shadow-sm border">
          <CardHeader className="space-y-1 text-center pb-4">
            <div className="mx-auto h-10 w-10 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
              <KeyRound className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-bold tracking-tight">
              Wajib Ganti Password Awal
            </CardTitle>
            <CardDescription className="text-xs">
              Demi keamanan akun Anda, silakan buat kata sandi baru sebelum dapat mengakses fitur Kelas 1-B.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3.5 text-xs">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-600 dark:text-red-400 text-xs">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-xs font-medium">
                  Kata Sandi Baru
                </Label>
                <PasswordInput
                  id="new-password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  placeholder="Buat kata sandi baru..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Indikator Animasi Kebutuhan Password Sesuai Zod */}
              <PasswordRequirements
                password={newPassword}
                confirmPassword={confirmPassword}
              />

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-xs font-medium">
                  Konfirmasi Kata Sandi Baru
                </Label>
                <PasswordInput
                  id="confirm-password"
                  leftIcon={<Lock className="h-4 w-4" />}
                  placeholder="Ulangi kata sandi baru..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 text-xs font-medium gap-1.5"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isSubmitting ? "Menyimpan Password..." : "Simpan & Aktifkan Akun"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <form action={logoutAction} className="text-center">
          <Button variant="ghost" size="sm" type="submit" className="text-xs text-muted-foreground hover:text-foreground">
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Keluar dari Sesi Ini
          </Button>
        </form>
      </div>
    </div>
  );
}
