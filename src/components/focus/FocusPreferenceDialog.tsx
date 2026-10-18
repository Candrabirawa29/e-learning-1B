"use client";

import * as React from "react";
import { useFocusTimer } from "./FocusTimerContext";
import { updateStudyPreferencesAction } from "@/actions/focus";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface FocusPreferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function FocusPreferenceDialog({
  open,
  onOpenChange,
  onSaved,
}: FocusPreferenceDialogProps) {
  const { preferences, refreshPreferences } = useFocusTimer();

  const [focusMin, setFocusMin] = React.useState<number>(25);
  const [shortBreakMin, setShortBreakMin] = React.useState<number>(5);
  const [longBreakMin, setLongBreakMin] = React.useState<number>(15);
  const [longBreakInterval, setLongBreakInterval] = React.useState<number>(4);
  const [weeklyTargetMin, setWeeklyTargetMin] = React.useState<number>(600);
  const [minActiveDayMin, setMinActiveDayMin] = React.useState<number>(25);
  const [aiConsent, setAiConsent] = React.useState<boolean>(false);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (preferences) {
      setFocusMin(Math.round(preferences.focusDuration / 60));
      setShortBreakMin(Math.round(preferences.shortBreakDuration / 60));
      setLongBreakMin(Math.round(preferences.longBreakDuration / 60));
      setLongBreakInterval(preferences.longBreakInterval);
      setWeeklyTargetMin(preferences.weeklyTargetMin);
      setMinActiveDayMin(preferences.minActiveDayMin);
      setAiConsent(preferences.aiConsent);
    }
  }, [preferences]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateStudyPreferencesAction({
        focusDuration: focusMin * 60,
        shortBreakDuration: shortBreakMin * 60,
        longBreakDuration: longBreakMin * 60,
        longBreakInterval,
        weeklyTargetMin,
        minActiveDayMin,
        aiConsent,
      });
      await refreshPreferences();
      toast.success("Preferensi belajar berhasil diperbarui!");
      onSaved?.();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan preferensi");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Settings2 className="h-5 w-5 text-primary" />
            Pengaturan & Target Belajar Personal
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sesuaikan durasi siklus Pomodoro, target belajar mingguan, dan privasi asisten AI.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2 text-xs">
          {/* Durasi Pomodoro */}
          <div className="space-y-3 p-3 bg-muted/40 rounded-xl border">
            <span className="font-semibold text-xs text-foreground block">
              Durasi Siklus Belajar
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pref-focus" className="text-[11px] font-medium text-muted-foreground">
                  Fokus (Menit)
                </Label>
                <Input
                  id="pref-focus"
                  type="number"
                  min={1}
                  max={240}
                  value={focusMin}
                  onChange={(e) => setFocusMin(parseInt(e.target.value, 10) || 1)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pref-short-break" className="text-[11px] font-medium text-muted-foreground">
                  Istirahat Pendek (Menit)
                </Label>
                <Input
                  id="pref-short-break"
                  type="number"
                  min={1}
                  max={60}
                  value={shortBreakMin}
                  onChange={(e) => setShortBreakMin(parseInt(e.target.value, 10) || 1)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pref-long-break" className="text-[11px] font-medium text-muted-foreground">
                  Istirahat Panjang (Menit)
                </Label>
                <Input
                  id="pref-long-break"
                  type="number"
                  min={1}
                  max={120}
                  value={longBreakMin}
                  onChange={(e) => setLongBreakMin(parseInt(e.target.value, 10) || 1)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pref-interval" className="text-[11px] font-medium text-muted-foreground">
                  Interval Istirahat Panjang
                </Label>
                <Input
                  id="pref-interval"
                  type="number"
                  min={1}
                  max={12}
                  value={longBreakInterval}
                  onChange={(e) => setLongBreakInterval(parseInt(e.target.value, 10) || 4)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Target Mingguan & Ambang Hari Aktif */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border">
            <div className="space-y-1">
              <Label htmlFor="pref-weekly" className="text-[11px] font-medium text-muted-foreground">
                Target Mingguan (Menit)
              </Label>
              <Input
                id="pref-weekly"
                type="number"
                min={30}
                max={10080}
                step={30}
                value={weeklyTargetMin}
                onChange={(e) => setWeeklyTargetMin(parseInt(e.target.value, 10) || 600)}
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                {Math.floor(weeklyTargetMin / 60)} jam {weeklyTargetMin % 60}m / minggu
              </span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pref-min-active" className="text-[11px] font-medium text-muted-foreground">
                Ambang Hari Aktif (Menit)
              </Label>
              <Input
                id="pref-min-active"
                type="number"
                min={5}
                max={240}
                value={minActiveDayMin}
                onChange={(e) => setMinActiveDayMin(parseInt(e.target.value, 10) || 25)}
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Minimal durasi untuk streak
              </span>
            </div>
          </div>

          {/* AI Consent Toggle */}
          <div className="p-3 rounded-xl border bg-card space-y-2">
            <div className="flex items-start gap-2.5">
              <input
                id="pref-ai-consent"
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="space-y-1">
                <Label htmlFor="pref-ai-consent" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Izinkan Asisten AI Study Analyst (Gemini)
                </Label>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Dengan mengaktifkan ini, ringkasan durasi belajar dan target Anda dapat dianalisis oleh AI Study Coach.
                  Catatan pribadi, nama, dan email Anda <strong>tidak pernah dikirim</strong> ke AI.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSaving} className="text-xs">
              Simpan Pengaturan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
