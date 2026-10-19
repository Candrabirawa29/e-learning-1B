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
import { FloatMode, AlertIntensity } from "@/types/focus";
import {
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  PictureInPicture2,
  BellRing,
} from "lucide-react";
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
  const { preferences, refreshPreferences, playTestAlarm, isPipSupported } = useFocusTimer();

  const [focusMin, setFocusMin] = React.useState<number>(25);
  const [shortBreakMin, setShortBreakMin] = React.useState<number>(5);
  const [longBreakMin, setLongBreakMin] = React.useState<number>(15);
  const [longBreakInterval, setLongBreakInterval] = React.useState<number>(4);
  const [weeklyTargetMin, setWeeklyTargetMin] = React.useState<number>(600);
  const [minActiveDayMin, setMinActiveDayMin] = React.useState<number>(25);
  const [aiConsent, setAiConsent] = React.useState<boolean>(false);
  const [floatMode, setFloatMode] = React.useState<FloatMode>(FloatMode.IN_APP);
  const [alertIntensity, setAlertIntensity] = React.useState<AlertIntensity>(AlertIntensity.NORMAL);
  const [soundVolume, setSoundVolume] = React.useState<number>(80);
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
      setFloatMode(preferences.floatMode || FloatMode.IN_APP);
      setAlertIntensity(preferences.alertIntensity || AlertIntensity.NORMAL);
      setSoundVolume(preferences.soundVolume ?? 80);
    }
  }, [preferences]);

  const handleTestSound = () => {
    playTestAlarm(alertIntensity, soundVolume);
  };

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
        floatMode,
        alertIntensity,
        soundVolume,
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
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Settings2 className="h-5 w-5 text-primary" />
            Pengaturan & Target Belajar Personal
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sesuaikan durasi siklus Pomodoro, peringatan audio akhir sesi, mode timer melayang, dan target mingguan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-1 text-xs">
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

          {/* Peringatan Akhir Sesi (Audio Alert & Volume) */}
          <div className="space-y-3 p-3 bg-muted/40 rounded-xl border">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <BellRing className="h-4 w-4 text-primary" />
                Peringatan Akhir Sesi (Web Audio)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestSound}
                className="h-7 px-2.5 text-[11px] font-medium gap-1 cursor-pointer"
                title="Dengarkan contoh bunyi alarm tiga nada"
              >
                <Play className="h-3 w-3 fill-current" />
                Tes Bunyi
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label htmlFor="pref-intensity" className="text-[11px] font-medium text-muted-foreground">
                  Intensitas Bunyi
                </Label>
                <select
                  id="pref-intensity"
                  value={alertIntensity}
                  onChange={(e) => setAlertIntensity(e.target.value as AlertIntensity)}
                  className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                >
                  <option value={AlertIntensity.SOFT}>Lembut (Soft - Nada halus)</option>
                  <option value={AlertIntensity.NORMAL}>Normal (Standar)</option>
                  <option value={AlertIntensity.STRONG}>Kuat (Strong - Nada tegas)</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pref-volume" className="text-[11px] font-medium text-muted-foreground">
                    Volume ({soundVolume}%)
                  </Label>
                  {soundVolume === 0 ? (
                    <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <input
                  id="pref-volume"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value, 10))}
                  className="w-full h-8 accent-primary cursor-pointer"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Bunyi pola tiga nada akan berulang saat target tercapai hingga ditutup (maks 60 detik).
            </p>
          </div>

          {/* Mode Timer Melayang */}
          <div className="space-y-2 p-3 bg-muted/40 rounded-xl border">
            <Label htmlFor="pref-float-mode" className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <PictureInPicture2 className="h-4 w-4 text-primary" />
              Mode Timer Melayang
            </Label>

            <select
              id="pref-float-mode"
              value={floatMode}
              onChange={(e) => setFloatMode(e.target.value as FloatMode)}
              className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
            >
              <option value={FloatMode.IN_APP}>Widget Melayang Dalam Aplikasi</option>
              {isPipSupported && (
                <option value={FloatMode.PIP}>
                  Document Picture-in-Picture (Jendela OS Luar Browser)
                </option>
              )}
              <option value={FloatMode.OFF}>Nonaktif (Sembunyikan Timer Melayang)</option>
            </select>
            <p className="text-[10px] text-muted-foreground">
              {floatMode === FloatMode.PIP
                ? "Membuka jendela kecil independen di atas aplikasi lain yang tetap aktif saat berpindah tab."
                : floatMode === FloatMode.IN_APP
                ? "Menampilkan floating badge di sudut kanan bawah saat membuka halaman selain Ruang Fokus."
                : "Timer hanya tampil saat membuka halaman Ruang Fokus."}
            </p>
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
