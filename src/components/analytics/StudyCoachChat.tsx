"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { SafeMarkdown } from "@/components/glossary/SafeMarkdown";
import { PartnerConfigDialog } from "@/components/analytics/PartnerConfigDialog";
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  ShieldCheck,
  Heart,
  SlidersHorizontal,
  Infinity as InfinityIcon,
} from "lucide-react";
import { updateStudyPreferencesAction } from "@/actions/focus";
import { StudyPreferenceDto } from "@/types/focus";
import { AiChatMessageDto, AiQuotaStatusDto } from "@/types/analytics";
import { AiPartnerConfig, AiPersonaModeType } from "@/lib/analytics/ai-persona";
import { toast } from "sonner";

interface StudyCoachChatProps {
  preferences: StudyPreferenceDto;
  initialHistory: {
    coach: AiChatMessageDto[];
    partner: AiChatMessageDto[];
  };
  initialQuota: AiQuotaStatusDto;
  onPreferencesUpdated?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SAMPLE_PROMPTS_COACH = [
  "Bagaimana tren konsistensi belajarku minggu ini?",
  "Mata kuliah apa yang paling banyak menghabiskan waktu fokusku?",
  "Kapan jam dan hari paling produktifku?",
  "Beri rekomendasi pembagian sesi Pomodoro untuk tugas mendatang",
];

const SAMPLE_PROMPTS_PARTNER = [
  "Gimana progres belajarku minggu ini menurutmu?",
  "Aku lagi capek nugas, semangatin sekaligus aturin sesi Pomodoro dong",
  "Matkul apa yang paling sering aku kerjain belakangan ini?",
  "Cek tugas kuliah yang deadline-nya paling dekat dong",
];

function formatMessageTime(isoDate?: string): string {
  const date = isoDate ? new Date(isoDate) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function mapHistoryToMessages(items: AiChatMessageDto[]): ChatMessage[] {
  return items.map((item) => ({
    id: item.id,
    role: item.role,
    content: item.content,
    timestamp: formatMessageTime(item.createdAt),
  }));
}

export function StudyCoachChat({
  preferences,
  initialHistory,
  initialQuota,
  onPreferencesUpdated,
}: StudyCoachChatProps) {
  const [activeMode, setActiveMode] = React.useState<AiPersonaModeType>(preferences.aiMode || "COACH");
  const [partnerConfig, setPartnerConfig] = React.useState<AiPartnerConfig>(preferences.aiPartnerConfig);
  const [histories, setHistories] = React.useState<{
    COACH: ChatMessage[];
    PARTNER: ChatMessage[];
  }>(() => ({
    COACH: mapHistoryToMessages(initialHistory.coach),
    PARTNER: mapHistoryToMessages(initialHistory.partner),
  }));
  const [quota, setQuota] = React.useState<AiQuotaStatusDto>(initialQuota);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [includeNotes, setIncludeNotes] = React.useState(false);
  const [isConsentUpdating, setIsConsentUpdating] = React.useState(false);
  const [isPartnerConfigOpen, setIsPartnerConfigOpen] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const msgCounterRef = React.useRef<number>(0);

  React.useEffect(() => {
    setActiveMode(preferences.aiMode || "COACH");
    setPartnerConfig(preferences.aiPartnerConfig);
  }, [preferences.aiMode, preferences.aiPartnerConfig]);

  React.useEffect(() => {
    setQuota(initialQuota);
  }, [initialQuota]);

  // Sinkronkan riwayat terbaru dari server saat komponen mount kembali (mis. setelah pindah tab Dashboard <-> AI)
  React.useEffect(() => {
    if (!preferences.aiConsent) return;
    let cancelled = false;
    fetch("/api/study-coach", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (Array.isArray(data.coach) && Array.isArray(data.partner)) {
          setHistories({
            COACH: mapHistoryToMessages(data.coach),
            PARTNER: mapHistoryToMessages(data.partner),
          });
        }
        if (data.quota) {
          setQuota(data.quota);
        }
      })
      .catch(() => {
        // Biarkan state SSR awal jika gagal fetch latar
      });
    return () => {
      cancelled = true;
    };
  }, [preferences.aiConsent]);

  const currentMessages = histories[activeMode];

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, isLoading, activeMode]);

  const handleEnableConsent = async () => {
    setIsConsentUpdating(true);
    try {
      const res = await updateStudyPreferencesAction({
        aiConsent: true,
      });
      if (res.success) {
        toast.success("Persetujuan AI berhasil diaktifkan!");
        onPreferencesUpdated?.();
      }
    } catch {
      toast.error("Terjadi kesalahan saat memperbarui preferensi");
    } finally {
      setIsConsentUpdating(false);
    }
  };

  const handleSwitchMode = async (mode: AiPersonaModeType) => {
    if (mode === activeMode || isLoading) return;
    setActiveMode(mode);
    try {
      await updateStudyPreferencesAction({ aiMode: mode });
      onPreferencesUpdated?.();
    } catch {
      // Tetap izinkan pratinjau mode di sesi client bila View-As memblokir mutasi DB
    }
  };

  const handleSendMessage = React.useCallback(
    async (textToSend?: string) => {
      const text = (textToSend || input).trim();
      if (!text || isLoading) return;

      const sendMode = activeMode;
      msgCounterRef.current += 1;
      const userMsgId = `user-${Date.now()}-${msgCounterRef.current}`;
      const nowTime = formatMessageTime();
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: text,
        timestamp: nowTime,
      };

      const existingMessages = histories[sendMode];
      const payloadMessages = [...existingMessages, userMsg];

      msgCounterRef.current += 1;
      const botMsgId = `assistant-${Date.now()}-${msgCounterRef.current}`;

      setHistories((prev) => ({
        ...prev,
        [sendMode]: [
          ...prev[sendMode],
          userMsg,
          {
            id: botMsgId,
            role: "assistant",
            content: "",
            timestamp: nowTime,
          },
        ],
      }));
      setInput("");
      setIsLoading(true);

      const updateAssistantMessage = (content: string) => {
        setHistories((prev) => ({
          ...prev,
          [sendMode]: prev[sendMode].map((m) =>
            m.id === botMsgId ? { ...m, content } : m
          ),
        }));
      };

      try {
        const response = await fetch("/api/study-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: payloadMessages.map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.content,
            })),
            includeNotes,
            mode: sendMode,
          }),
        });

        // Perbarui tampilan kuota dari response header jika tersedia
        const headerUnlimited = response.headers.get("X-Ai-Quota-Unlimited");
        const headerRemaining = response.headers.get("X-Ai-Quota-Remaining");
        const headerUsed = response.headers.get("X-Ai-Quota-Used");
        if (headerUnlimited !== null) {
          const isUnlimited = headerUnlimited === "true";
          setQuota((prev) => ({
            isUnlimited,
            limit: isUnlimited ? null : prev.limit ?? 20,
            used: headerUsed ? Number(headerUsed) : prev.used + 1,
            remaining: isUnlimited
              ? null
              : headerRemaining !== null && headerRemaining !== "unlimited"
              ? Number(headerRemaining)
              : prev.remaining,
          }));
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 429) {
            toast.error("Batas 20 pesan per hari telah tercapai.");
            setQuota((prev) => ({ ...prev, remaining: 0 }));
            updateAssistantMessage(
              "Batas kuota 20 pesan harian untuk AI Study Analyst telah tercapai. Kuota Anda akan direset otomatis besok (WIB)."
            );
            return;
          }

          if (errorData.consentRequired) {
            toast.error("Persetujuan AI diperlukan.");
            updateAssistantMessage("Silakan aktifkan persetujuan AI pada menu **Target & AI**.");
            return;
          }

          throw new Error(errorData.error || `HTTP error ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Tidak dapat membaca stream dari server.");

        const decoder = new TextDecoder("utf-8");
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          updateAssistantMessage(accumulatedText);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Gagal memproses obrolan.";
        updateAssistantMessage(
          `Maaf, terjadi kendala teknis saat menghubungkan ke AI: ${errMsg}`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, activeMode, histories, includeNotes]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = async () => {
    const modeLabel = activeMode === "PARTNER" ? `Mode Pacar (${partnerConfig.partnerName})` : "Mode Coach";
    if (!confirm(`Hapus seluruh riwayat obrolan ${modeLabel} dari akun Anda?`)) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch(`/api/study-coach?mode=${activeMode}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menghapus riwayat percakapan.");
      }
      setHistories((prev) => ({
        ...prev,
        [activeMode]: [],
      }));
      toast.success(`Riwayat ${modeLabel} berhasil dihapus.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus riwayat.");
    } finally {
      setIsResetting(false);
    }
  };

  // Jika user belum menyetujui AI consent
  if (!preferences.aiConsent) {
    return (
      <Card className="border shadow-xs border-primary/20 bg-card/60 backdrop-blur-xs">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-lg font-bold">AI Study Analyst (Pribadi & Terkontrol)</CardTitle>
          <CardDescription className="max-w-md mx-auto text-xs leading-relaxed text-muted-foreground">
            Dapatkan wawasan mendalam mengenai tren konsistensi, jam produktif, dan rekomendasi alokasi waktu Pomodoro untuk tugas kuliah Anda — tersedia dalam mode Coach maupun Partner Belajar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg mx-auto py-2">
          <div className="p-3.5 rounded-lg border bg-muted/30 text-xs space-y-2">
            <div className="font-semibold flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Privasi & Keamanan Data Terjamin:
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
              <li>Data Anda tidak terlihat oleh teman, PJ, atau Admin kelas.</li>
              <li>Hanya ringkasan angka durasi dan target (tanpa nama/email) yang dikirim ke model.</li>
              <li>Catatan pribadi tidak pernah dikirim kecuali Anda mencentang izin analisis catatan.</li>
              <li>Riwayat chat tersimpan aman di akun Anda dan hanya dapat dibaca oleh Anda sendiri.</li>
            </ul>
          </div>
          <div className="text-center">
            <Button
              onClick={handleEnableConsent}
              disabled={isConsentUpdating}
              className="w-full sm:w-auto"
            >
              {isConsentUpdating ? "Memproses..." : "Aktifkan AI Study Analyst"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPartnerMode = activeMode === "PARTNER";
  const samplePrompts = isPartnerMode ? SAMPLE_PROMPTS_PARTNER : SAMPLE_PROMPTS_COACH;

  return (
    <>
      <Card className="border shadow-xs flex flex-col h-[620px]">
        <CardHeader className="p-4 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                isPartnerMode ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
              }`}
            >
              {isPartnerMode ? (
                <Heart className="h-4 w-4 fill-rose-500/20" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold flex flex-wrap items-center gap-2">
                <span>
                  {isPartnerMode ? `${partnerConfig.partnerName} · Mode Pacar` : "AI Study Analyst"}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                >
                  Aktif
                </Badge>
                {quota.isUnlimited && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-4 gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  >
                    <InfinityIcon className="h-3 w-3" />
                    Unlimited Admin
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {quota.isUnlimited
                  ? "Tanpa batas pesan harian • Tersimpan di akun"
                  : `Sisa ${quota.remaining ?? 20}/${quota.limit ?? 20} pesan hari ini • Tersimpan di akun`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Switcher Mode Coach / Pacar */}
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => handleSwitchMode("COACH")}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  !isPartnerMode
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                Coach
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("PARTNER")}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isPartnerMode
                    ? "bg-background text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className="h-3.5 w-3.5" />
                Pacar
              </button>
            </div>

            {/* Tombol kustomisasi sifat hanya untuk Mode Pacar (tanpa menduplikasi Target & AI) */}
            {isPartnerMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPartnerConfigOpen(true)}
                className="h-8 text-xs gap-1.5"
                title="Atur nama, panggilan, dan sifat pacar AI"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-rose-500" />
                Atur Pacar
              </Button>
            )}

            {currentMessages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isResetting || isLoading}
                onClick={handleClearHistory}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                title="Hapus riwayat obrolan mode ini dari database"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Messages area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  isPartnerMode ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
                }`}
              >
                {isPartnerMode ? (
                  <Heart className="h-6 w-6 fill-rose-500/20" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
              </div>
              <h4 className="text-sm font-semibold mb-1">
                {isPartnerMode
                  ? `Hai ${partnerConfig.userCall}! Aku ${partnerConfig.partnerName}, siap nemenin kamu belajar~`
                  : "Halo! Ada yang ingin dianalisis hari ini?"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mb-4">
                {isPartnerMode
                  ? `Kita bisa bahas progres fokusmu, atur sesi Pomodoro biar nggak kecapekan, atau cek deadline tugas bareng. Kamu bisa ubah sifatku kapan saja lewat "Atur Pacar".`
                  : "Saya siap membantu meninjau tren konsistensi belajar, mengevaluasi target mingguan, atau menyusun rekomendasi alokasi sesi Pomodoro untuk tugas kuliah Anda."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg text-left">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/50 text-xs transition-colors text-foreground flex items-start gap-2 group cursor-pointer"
                  >
                    {isPartnerMode ? (
                      <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    )}
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            currentMessages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isPartnerMode ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isPartnerMode ? (
                      <Heart className="h-3.5 w-3.5 fill-rose-500/20" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-xs whitespace-pre-wrap break-words"
                      : "bg-muted/50 border rounded-bl-xs text-foreground"
                  }`}
                >
                  {m.content ? (
                    m.role === "assistant" ? (
                      <SafeMarkdown
                        content={m.content}
                        className="text-xs text-foreground space-y-1.5"
                      />
                    ) : (
                      m.content
                    )
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground animate-pulse">
                      <Sparkles className="h-3 w-3 animate-spin" />
                      {isPartnerMode
                        ? `${partnerConfig.partnerName} lagi baca data belajarmu...`
                        : "Sedang menganalisis data riwayat belajar..."}
                    </span>
                  )}
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      m.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input area */}
        <CardFooter className="p-3 border-t bg-card/80 flex flex-col gap-2">
          <div className="flex items-center justify-between w-full text-[11px] text-muted-foreground px-1">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={includeNotes}
                onChange={(e) => setIncludeNotes(e.target.checked)}
                className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Sertakan catatan sesi belajar untuk dianalisis</span>
            </label>
            <span className="text-[10px]">Shift + Enter untuk baris baru</span>
          </div>

          <div className="flex items-center gap-2 w-full">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isPartnerMode
                  ? `Cerita atau tanya sesuatu ke ${partnerConfig.partnerName}...`
                  : "Tanyakan pola belajar, tren konsistensi, atau saran waktu Pomodoro..."
              }
              disabled={isLoading}
              className="min-h-[44px] max-h-24 resize-none text-xs py-2 px-3"
              rows={1}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="h-10 px-3.5 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <PartnerConfigDialog
        open={isPartnerConfigOpen}
        onOpenChange={setIsPartnerConfigOpen}
        initialConfig={partnerConfig}
        onSaved={(newConfig) => {
          setPartnerConfig(newConfig);
          setActiveMode("PARTNER");
          onPreferencesUpdated?.();
        }}
      />
    </>
  );
}
