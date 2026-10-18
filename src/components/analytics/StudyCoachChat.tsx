"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import { updateStudyPreferencesAction } from "@/actions/focus";
import { StudyPreferenceDto } from "@/types/focus";
import { toast } from "sonner";

interface StudyCoachChatProps {
  preferences: StudyPreferenceDto;
  onPreferencesUpdated?: () => void;
  openPreferenceDialog?: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SAMPLE_PROMPTS = [
  "Bagaimana tren konsistensi belajarku minggu ini?",
  "Mata kuliah apa yang paling banyak menghabiskan waktu fokusku?",
  "Kapan jam dan hari paling produktifku?",
  "Beri rekomendasi pembagian sesi Pomodoro untuk tugas mendatang",
];

export function StudyCoachChat({
  preferences,
  onPreferencesUpdated,
  openPreferenceDialog,
}: StudyCoachChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [includeNotes, setIncludeNotes] = React.useState(false);
  const [isConsentUpdating, setIsConsentUpdating] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const msgCounterRef = React.useRef<number>(0);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

  const handleSendMessage = React.useCallback(async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    msgCounterRef.current += 1;
    const userMsgId = `user-${msgCounterRef.current}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      timestamp: nowTime,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    msgCounterRef.current += 1;
    const botMsgId = `assistant-${msgCounterRef.current}`;
    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        role: "assistant",
        content: "",
        timestamp: nowTime,
      },
    ]);

    try {
      const response = await fetch("/api/study-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.content,
          })),
          includeNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error("Batas 20 pesan per hari telah tercapai.");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId
                ? {
                    ...m,
                    content: "Batas kuota 20 pesan harian untuk AI Study Analyst telah tercapai. Kuota Anda akan direset otomatis besok (WIB).",
                  }
                : m
            )
          );
          return;
        }

        if (errorData.consentRequired) {
          toast.error("Persetujuan AI diperlukan.");
          return;
        }

        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Tidak dapat membaca stream dari server.");

      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        const currentText = accumulatedText;

        setMessages((prev) =>
          prev.map((m) => (m.id === botMsgId ? { ...m, content: currentText } : m))
        );
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Gagal memproses obrolan.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botMsgId
            ? {
                ...m,
                content: `Maaf, terjadi kendala teknis saat menghubungkan ke AI Coach: ${errMsg}`,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, includeNotes]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (confirm("Hapus riwayat obrolan saat ini? (Riwayat hanya tersimpan di tab ini)")) {
      setMessages([]);
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
            Dapatkan wawasan mendalam mengenai tren konsistensi, jam produktif, dan rekomendasi alokasi waktu Pomodoro untuk tugas kuliah Anda.
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
              <li>AI dibatasi hanya pada tool baca; tidak dapat mengubah atau memanipulasi data tugas Anda.</li>
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

  return (
    <Card className="border shadow-xs flex flex-col h-[600px]">
      <CardHeader className="p-4 pb-3 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              AI Study Analyst
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500 text-emerald-600 dark:text-emerald-400">
                Aktif
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Maksimal 20 pesan/hari • Data pribadi & terkontrol
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {openPreferenceDialog && (
            <Button
              variant="ghost"
              size="sm"
              onClick={openPreferenceDialog}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              title="Pengaturan Target & AI Consent"
            >
              <Settings2 className="h-3.5 w-3.5 mr-1" />
              Pengaturan
            </Button>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              title="Hapus riwayat obrolan"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Messages area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h4 className="text-sm font-semibold mb-1">Halo! Ada yang ingin dianalisis hari ini?</h4>
            <p className="text-xs text-muted-foreground max-w-md mb-4">
              Saya siap membantu meninjau tren konsistensi belajar, mengevaluasi target mingguan, atau menyusun rekomendasi alokasi sesi Pomodoro untuk tugas kuliah Anda.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg text-left">
              {SAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/50 text-xs transition-colors text-foreground flex items-start gap-2 group cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-xs"
                    : "bg-muted/50 border rounded-bl-xs text-foreground whitespace-pre-wrap"
                }`}
              >
                {m.content ? (
                  m.content
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground animate-pulse">
                    <Sparkles className="h-3 w-3 animate-spin" />
                    Sedang menganalisis data riwayat belajar...
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
            placeholder="Tanyakan pola belajar, tren konsistensi, atau saran waktu Pomodoro..."
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
  );
}
