"use client";

import { clearViewAsAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { useTransition } from "react";

interface ViewAsBannerProps {
  viewAsRole: string;
}

export function ViewAsBanner({ viewAsRole }: ViewAsBannerProps) {
  const [isPending, startTransition] = useTransition();

  const handleExit = () => {
    startTransition(async () => {
      await clearViewAsAction();
    });
  };

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
