"use client";

import * as React from "react";
import { createMemberAction } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@prisma/client";
import { UserPlus, Loader2, KeyRound, Info } from "lucide-react";
import { toast } from "sonner";

export function CreateMemberDialog() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>(Role.MEMBER);
  const [customPassword, setCustomPassword] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nama lengkap mahasiswa wajib diisi.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Alamat email tidak valid.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMemberAction({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        password: customPassword.trim() || undefined,
      });

      toast.success(res.message);
      setOpen(false);
      setName("");
      setEmail("");
      setRole(Role.MEMBER);
      setCustomPassword("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan mahasiswa");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="h-8 text-xs gap-1.5 font-medium shrink-0">
            <UserPlus className="h-3.5 w-3.5" />
            Tambah Mahasiswa
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Tambah Mahasiswa Baru
          </DialogTitle>
          <DialogDescription className="text-xs">
            Daftarkan mahasiswa baru ke dalam database Kelas 1-B dan buatkan akun login Supabase Auth secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mem-name" className="text-xs font-medium">
              Nama Lengkap Mahasiswa <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mem-name"
              placeholder="Contoh: Muhammad Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mem-email" className="text-xs font-medium">
              Email Mahasiswa <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mem-email"
              type="email"
              placeholder="Contoh: budisantoso@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-8 text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Digunakan mahasiswa untuk masuk ke portal e-learning Kelas 1-B.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Peran / Role</Label>
              <Select value={role} onValueChange={(val) => { if (val) setRole(val as Role); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Role.MEMBER} className="text-xs">
                    MEMBER (Mahasiswa Reguler)
                  </SelectItem>
                  <SelectItem value={Role.PJ} className="text-xs">
                    PJ (Penanggung Jawab Matkul)
                  </SelectItem>
                  <SelectItem value={Role.ADMIN} className="text-xs">
                    ADMIN (Pengurus Utama)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mem-pw" className="text-xs font-medium flex items-center gap-1">
                <KeyRound className="h-3 w-3 text-muted-foreground" />
                Password Awal (Opsional)
              </Label>
              <Input
                id="mem-pw"
                type="text"
                placeholder="Default: pwuinjkt"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-muted/50 border rounded text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Info className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Ketentuan Akun Baru:</span>
            </div>
            <p>
              Mahasiswa akan dibuatkan status <span className="font-semibold text-foreground">Wajib Ganti Password</span> saat pertama kali login ke sistem demi keamanan privasi masing-masing mahasiswa.
            </p>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs h-8 gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Daftarkan Mahasiswa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
