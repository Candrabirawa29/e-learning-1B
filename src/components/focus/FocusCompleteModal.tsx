"use client";

import * as React from "react";
import { useFocusTimer } from "./FocusTimerContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Coffee } from "lucide-react";

interface FocusCompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FocusCompleteModal({
  open,
  onOpenChange,
}: FocusCompleteModalProps) {
  const {
    activeSession,
    elapsedSec,
    complete,
    startBreak,
    completedCycles,
    preferences,
  } = useFocusTimer();

  const [note, setNote] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (activeSession?.note) {
      setNote(activeSession.note);
    } else {
      setNote("");
    }
  }, [activeSession?.note]);

  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;

  const nextCycle = completedCycles + 1;
  const longInterval = preferences?.longBreakInterval || 4;
  const isLongBreak = nextCycle % longInterval === 0;

  const handleSaveOnly = async () => {
    setIsSubmitting(true);
    try {
      await complete(note.trim() || undefined);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndBreak = async () => {
    setIsSubmitting(true);
    try {
      await complete(note.trim() || undefined);
      onOpenChange(false);
      startBreak(isLongBreak ? "LONG_BREAK" : "SHORT_BREAK");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-lg font-bold">
            Sesi Fokus Berhasil Selesai! 🎉
          </DialogTitle>
          <DialogDescription className="text-xs">
            Waktu belajar Anda berhasil tercatat secara privat ke dalam analitik belajar personal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Summary Box */}
          <div className="p-3 bg-muted/50 rounded-xl border flex flex-col items-center justify-center text-center">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              Total Waktu Fokus
            </span>
            <div className="font-mono text-3xl font-extrabold text-foreground mt-0.5">
              {minutes > 0 ? `${minutes}m ` : ""}
              {seconds}s
            </div>
            {activeSession?.course && (
              <Badge variant="outline" className="mt-2 text-[10px]">
                {activeSession.course.name}
              </Badge>
            )}
          </div>

          {/* Notes field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="complete-note" className="text-xs font-medium">
                Catatan Sesi (Opsional)
              </Label>
              <span className="text-[10px] text-muted-foreground">{note.length}/500</span>
            </div>
            <Textarea
              id="complete-note"
              placeholder="Apa yang berhasil Anda pelajari atau selesaikan dalam sesi ini?"
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs min-h-[64px]"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2 pt-1">
            <Button
              type="button"
              onClick={handleSaveAndBreak}
              disabled={isSubmitting}
              className="w-full text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Coffee className="h-3.5 w-3.5" />
              Simpan & Mulai {isLongBreak ? "Istirahat Panjang (15m)" : "Istirahat Pendek (5m)"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSaveOnly}
              disabled={isSubmitting}
              className="w-full text-xs"
            >
              Simpan Tanpa Istirahat
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
