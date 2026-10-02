"use client";

import { clearViewAsAction } from "@/actions/auth";
import { stopImpersonateAction } from "@/actions/members";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserCheck, ArrowLeft, X } from "lucide-react";
import { useTransition } from "react";

interface ViewAsBannerProps {
  viewAsRole: string;
  isImpersonating?: boolean;
  impersonatedUser?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export function ViewAsBanner({
  viewAsRole,
  isImpersonating,
  impersonatedUser,
}: ViewAsBannerProps) {
  const [isPending, startTransition] = useTransition();

  const handleExit = () => {
    startTransition(async () => {
      if (isImpersonating) {
        await stopImpersonateAction();
      } else {
        await clearViewAsAction();
      }
    });
  };

  if (isImpersonating && impersonatedUser) {
    return (
      <div className="bg-blue-500/10 border-b border-blue-500/30 px-4 py-2.5 text-blue-950 dark:text-blue-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              <strong>Mode Masuk Mahasiswa:</strong> Anda sedang masuk & bertindak sebagai{" "}
              <span className="font-semibold underline text-foreground">
                {impersonatedUser.name || impersonatedUser.email.split("@")[0]}
              </span>{" "}
              <span className="text-muted-foreground text-xs font-mono">({impersonatedUser.email})</span>{" "}
              • Role: <span className="font-semibold uppercase">{viewAsRole}</span>.
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleExit}
            disabled={isPending}
            className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isPending ? "Kembali..." : "Kembali ke Akun Admin"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-amber-900 dark:text-amber-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Mode Pratinjau (View-As):</strong> Anda sedang melihat antarmuka sebagai{" "}
            <span className="font-semibold underline uppercase">{viewAsRole}</span>. Seluruh aksi perubahan data diblokir.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExit}
          disabled={isPending}
          className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20 text-amber-900 dark:text-amber-100"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          {isPending ? "Keluar..." : "Keluar Pratinjau"}
        </Button>
      </div>
    </div>
  );
}
