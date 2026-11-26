"use client";

import * as React from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  AiPartnerConfig,
  PARTNER_AFFECTION_OPTIONS,
  PARTNER_EMOJI_OPTIONS,
  PARTNER_GENDER_OPTIONS,
  PARTNER_LANGUAGE_OPTIONS,
  PARTNER_PERSONALITY_OPTIONS,
  PARTNER_QUICK_USER_CALLS,
  normalizePartnerConfig,
} from "@/lib/analytics/ai-persona";
import { updateStudyPreferencesAction } from "@/actions/focus";
import { Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface PartnerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig: AiPartnerConfig;
  onSaved?: (config: AiPartnerConfig) => void;
}

export function PartnerConfigDialog({
  open,
  onOpenChange,
  initialConfig,
  onSaved,
}: PartnerConfigDialogProps) {
  const [config, setConfig] = React.useState<AiPartnerConfig>(() =>
    normalizePartnerConfig(initialConfig)
  );
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setConfig(normalizePartnerConfig(initialConfig));
    }
  }, [open, initialConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: AiPartnerConfig = {
      ...config,
      partnerName: config.partnerName.trim() || "Aya",
      userCall: config.userCall.trim() || "Sayang",
      customInstructions: config.customInstructions.trim().slice(0, 400),
    };
    setIsSaving(true);
    try {
      const res = await updateStudyPreferencesAction({
        aiMode: "PARTNER",
        aiPartnerConfig: cleaned,
      });
      if (res.success) {
        toast.success(`Konfigurasi ${cleaned.partnerName} tersimpan!`);
        onSaved?.(cleaned);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan konfigurasi mode pacar");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500/20" />
            Konfigurasi Mode Pacar (Study Partner)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sesuaikan nama, panggilan, tipe kepribadian, dan gaya chat pasangan belajarmu. Data belajar tetap dibaca akurat dari analitikmu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-1 text-xs">
          {/* Nama & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border bg-muted/30">
            <div className="space-y-1.5">
              <Label htmlFor="partner-name" className="text-[11px] font-medium text-foreground">
                Nama Panggilan AI
              </Label>
              <Input
                id="partner-name"
                value={config.partnerName}
                maxLength={30}
                onChange={(e) => setConfig((prev) => ({ ...prev, partnerName: e.target.value }))}
                placeholder="Mis. Aya, Zidan, Ren..."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partner-gender" className="text-[11px] font-medium text-foreground">
                Karakter / Gender
              </Label>
              <select
                id="partner-gender"
                value={config.gender}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    gender: e.target.value as AiPartnerConfig["gender"],
                  }))
                }
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PARTNER_GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2 pt-1 border-t">
              <Label htmlFor="partner-user-call" className="text-[11px] font-medium text-foreground">
                AI Memanggilmu Sebagai
              </Label>
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  id="partner-user-call"
                  value={config.userCall}
                  maxLength={25}
                  onChange={(e) => setConfig((prev) => ({ ...prev, userCall: e.target.value }))}
                  placeholder="Sayang / Kamu / Nama..."
                  className="h-8 text-xs flex-1 min-w-[140px]"
                />
                <div className="flex flex-wrap gap-1">
                  {PARTNER_QUICK_USER_CALLS.map((nick) => (
                    <button
                      key={nick}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, userCall: nick }))}
                      className={`px-2 py-1 rounded-md text-[10px] border transition-colors cursor-pointer ${
                        config.userCall === nick
                          ? "bg-rose-500/15 border-rose-500/50 text-rose-600 dark:text-rose-400 font-semibold"
                          : "bg-background hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {nick}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tipe Kepribadian */}
          <div className="space-y-2 p-3 rounded-xl border bg-muted/30">
            <span className="font-semibold text-xs text-foreground block">
              Tipe Kepribadian
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PARTNER_PERSONALITY_OPTIONS.map((opt) => {
                const selected = config.personality === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, personality: opt.value }))}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      selected
                        ? "border-rose-500/60 bg-rose-500/10 shadow-xs"
                        : "border-border bg-background hover:bg-muted/60"
                    }`}
                  >
                    <div className="font-semibold text-[11px] text-foreground flex items-center justify-between">
                      <span>{opt.label}</span>
                      {selected && <Sparkles className="h-3 w-3 text-rose-500" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gaya Bahasa, Kadar Kemesraan & Emoji */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border bg-muted/30">
            <div className="space-y-1">
              <Label htmlFor="partner-lang" className="text-[11px] font-medium text-foreground">
                Gaya Bahasa
              </Label>
              <select
                id="partner-lang"
                value={config.languageStyle}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    languageStyle: e.target.value as AiPartnerConfig["languageStyle"],
                  }))
                }
                className="w-full h-8 text-[11px] rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PARTNER_LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="partner-affection" className="text-[11px] font-medium text-foreground">
                Kadar Perhatian
              </Label>
              <select
                id="partner-affection"
                value={config.affectionLevel}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    affectionLevel: e.target.value as AiPartnerConfig["affectionLevel"],
                  }))
                }
                className="w-full h-8 text-[11px] rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PARTNER_AFFECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="partner-emoji" className="text-[11px] font-medium text-foreground">
                Emoji
              </Label>
              <select
                id="partner-emoji"
                value={config.emojiLevel}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    emojiLevel: e.target.value as AiPartnerConfig["emojiLevel"],
                  }))
                }
                className="w-full h-8 text-[11px] rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PARTNER_EMOJI_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Instruksi Kustom Tambahan */}
          <div className="space-y-1.5 p-3 rounded-xl border bg-muted/30">
            <div className="flex items-center justify-between">
              <Label htmlFor="partner-custom" className="text-[11px] font-medium text-foreground">
                Catatan Sifat / Kebiasaan Khusus (Opsional)
              </Label>
              <span className="text-[10px] text-muted-foreground font-mono">
                {config.customInstructions.length}/400
              </span>
            </div>
            <Textarea
              id="partner-custom"
              value={config.customInstructions}
              maxLength={400}
              rows={3}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, customInstructions: e.target.value }))
              }
              placeholder="Contoh: Suka bahas Teknik Informatika bareng, cerewet kalau aku lupa minum atau begadang lewat jam 11, selalu kasih apresiasi tiap streak bertambah..."
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSaving} className="text-xs gap-1.5">
              <Heart className="h-3.5 w-3.5" />
              {isSaving ? "Menyimpan..." : "Simpan & Pakai Mode Pacar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
