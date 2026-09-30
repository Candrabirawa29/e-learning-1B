"use client";

import * as React from "react";
import { updateProfileAction } from "@/actions/members";
import { changePasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { User, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const [name, setName] = React.useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama tampilan tidak boleh kosong.");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateProfileAction({ name: name.trim() });
      toast.success("Profil berhasil diperbarui!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui profil");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password baru minimal 8 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password baru tidak cocok.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const formData = new FormData();
      formData.set("newPassword", newPassword);
      formData.set("confirmPassword", confirmPassword);

      const res = await changePasswordAction(null, formData);
      if (!res.success) {
        toast.error(res.error || "Gagal mengubah password.");
      } else {
        toast.success("Password Anda berhasil diperbarui!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b pb-4">
        <h1 className="text-xl font-bold tracking-tight">Profil & Keamanan Akun</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kelola informasi nama tampilan dan kata sandi akses akun kelas Anda.
        </p>
      </div>

      <div className="space-y-5">
        {/* Profile Card */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Informasi Mahasiswa
            </CardTitle>
            <CardDescription className="text-xs">
              Ubah nama tampilan Anda agar mudah dikenali oleh pengurus dan dosen.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateProfile}>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="prof-name" className="text-xs font-medium">
                  Nama Lengkap / Nama Panggilan
                </Label>
                <Input
                  id="prof-name"
                  placeholder="Masukkan nama lengkap Anda..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingProfile}
                className="h-8 text-xs font-medium gap-1.5"
              >
                {isUpdatingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isUpdatingProfile ? "Menyimpan..." : "Simpan Profil"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Change Password Card */}
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-500" />
              Ganti Kata Sandi (Password)
            </CardTitle>
            <CardDescription className="text-xs">
              Perbarui password akun Anda secara mandiri demi keamanan.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdatePassword}>
            <CardContent className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="new-pw" className="text-xs font-medium">
                  Kata Sandi Baru (Min. 8 karakter)
                </Label>
                <Input
                  id="new-pw"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conf-pw" className="text-xs font-medium">
                  Konfirmasi Kata Sandi Baru
                </Label>
                <Input
                  id="conf-pw"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={isUpdatingPassword}
                className="h-8 text-xs font-medium gap-1.5"
              >
                {isUpdatingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isUpdatingPassword ? "Menyimpan..." : "Perbarui Password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
