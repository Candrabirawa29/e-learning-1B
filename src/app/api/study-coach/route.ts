import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, assertCanMutate } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AiPersonaMode } from "@prisma/client";
import {
  checkAndConsumeAiQuota,
  getAiQuotaStatus,
  getAiChatHistory,
  saveAiChatMessage,
  clearAiChatHistory,
  buildUserStudyContext,
  executeGetStudySummary,
  executeCompareStudyPeriods,
  executeGetSubjectStudyBreakdown,
  executeGetUpcomingTasks,
  executeGenerateStudyPlan,
  CompareStudyPeriodsSchema,
  SubjectBreakdownSchema,
  UpcomingTasksSchema,
  StudyPlanSchema,
} from "@/lib/analytics/ai-coach";
import {
  AiPersonaModeType,
  buildAiSystemInstruction,
  hasUnlimitedAiQuota,
} from "@/lib/analytics/ai-persona";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

export const runtime = "nodejs";

// Definisi Tools untuk Gemini
const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "getStudySummary",
    description: "Mengambil ringkasan metrik konsistensi, streak, target mingguan, dan tren belajar mahasiswa.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "compareStudyPeriods",
    description: "Membandingkan durasi dan jumlah sesi fokus antara dua rentang tanggal (format YYYY-MM-DD).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate1: { type: Type.STRING, description: "Tanggal mulai periode 1 (YYYY-MM-DD)" },
        endDate1: { type: Type.STRING, description: "Tanggal akhir periode 1 (YYYY-MM-DD)" },
        startDate2: { type: Type.STRING, description: "Tanggal mulai periode 2 (YYYY-MM-DD)" },
        endDate2: { type: Type.STRING, description: "Tanggal akhir periode 2 (YYYY-MM-DD)" },
      },
      required: ["startDate1", "endDate1", "startDate2", "endDate2"],
    },
  },
  {
    name: "getSubjectStudyBreakdown",
    description: "Mengambil rincian alokasi waktu fokus per mata kuliah selama N hari terakhir.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        daysCount: { type: Type.INTEGER, description: "Jumlah hari yang dianalisis (7 sampai 90, default 30)" },
      },
    },
  },
  {
    name: "getUpcomingTasks",
    description: "Mengambil daftar tugas kuliah mendatang yang belum selesai untuk dianalisis prioritas belajarnya.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.INTEGER, description: "Maksimal jumlah tugas yang diambil (1 sampai 10, default 5)" },
      },
    },
  },
  {
    name: "generateStudyPlan",
    description: "Menghasilkan rekomendasi pembagian slot sesi fokus Pomodoro berdasarkan tugas mendatang dan waktu luang.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        availableHoursPerDay: { type: Type.NUMBER, description: "Perkiraan jam luang per hari untuk belajar (0.5 - 12 jam)" },
        focusSubjectIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Daftar mata kuliah prioritas (opsional)" },
      },
    },
  },
];

function parseRequestedMode(raw: unknown): AiPersonaModeType | undefined {
  if (raw === "PARTNER") return "PARTNER";
  if (raw === "COACH") return "COACH";
  return undefined;
}

/**
 * Mengambil riwayat percakapan tersimpan & status kuota AI user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session.user || !session.profile) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login kembali." }, { status: 401 });
    }
    const userId = session.user.id;
    const isUnlimited = hasUnlimitedAiQuota(session);
    const modeParam = parseRequestedMode(req.nextUrl.searchParams.get("mode"));

    if (modeParam) {
      const [messages, quota] = await Promise.all([
        getAiChatHistory(userId, modeParam),
        getAiQuotaStatus(userId, isUnlimited),
      ]);
      return NextResponse.json({ messages, quota });
    }

    const [coach, partner, quota] = await Promise.all([
      getAiChatHistory(userId, "COACH"),
      getAiChatHistory(userId, "PARTNER"),
      getAiQuotaStatus(userId, isUnlimited),
    ]);

    return NextResponse.json({ coach, partner, quota });
  } catch (error: unknown) {
    console.error("[StudyCoach GET Error]", error);
    return NextResponse.json({ error: "Gagal memuat riwayat percakapan AI." }, { status: 500 });
  }
}

/**
 * Menghapus riwayat percakapan tersimpan milik user untuk mode tertentu.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session.user || !session.profile) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login kembali." }, { status: 401 });
    }
    try {
      assertCanMutate(session);
    } catch (err: unknown) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Aksi ditolak." },
        { status: 403 }
      );
    }

    const modeParam = parseRequestedMode(req.nextUrl.searchParams.get("mode")) || "COACH";
    await clearAiChatHistory(session.user.id, modeParam);
    return NextResponse.json({ success: true, mode: modeParam });
  } catch (error: unknown) {
    console.error("[StudyCoach DELETE Error]", error);
    return NextResponse.json({ error: "Gagal menghapus riwayat percakapan." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Autentikasi Pengguna
    const session = await getCurrentSession();
    if (!session.user || !session.profile) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login kembali." }, { status: 401 });
    }
    const userId = session.user.id;
    const canPersistHistory = !session.isViewAs || Boolean(session.isImpersonating);

    // 2. Periksa Persetujuan AI (aiConsent) & Konfigurasi Persona
    const preference = await prisma.studyPreference.findUnique({
      where: { userId },
    });

    if (!preference?.aiConsent) {
      return NextResponse.json(
        {
          error: "Persetujuan AI belum diaktifkan.",
          message:
            "Untuk menggunakan AI Study Analyst, Anda perlu memberikan persetujuan pengiriman data ringkasan belajar ke Google Gemini di pengaturan preferensi.",
          consentRequired: true,
        },
        { status: 403 }
      );
    }

    // 3. Parse Payload Request sebelum konsumsi kuota agar pesan kosong tidak memakan kuota
    const body = await req.json().catch(() => ({}));
    const { messages, includeNotes = false, mode: requestedMode } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    const userPrompt = String(lastMessage?.content || "").trim();
    if (!userPrompt) {
      return NextResponse.json({ error: "Pesan terakhir tidak boleh kosong." }, { status: 400 });
    }

    const activeMode: AiPersonaModeType =
      parseRequestedMode(requestedMode) ??
      (preference.aiMode === AiPersonaMode.PARTNER ? "PARTNER" : "COACH");
    const systemInstruction = buildAiSystemInstruction(activeMode, preference.aiPartnerConfig);
    const temperature = activeMode === "PARTNER" ? 0.7 : 0.4;

    // 4. Periksa Kuota Harian (Admin tidak dibatasi 20 pesan/hari)
    const isUnlimited = hasUnlimitedAiQuota(session);
    const quotaCheck = await checkAndConsumeAiQuota(userId, { isUnlimited });
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: "Batas kuota harian tercapai.",
          message:
            "Anda telah mencapai batas 20 pesan per hari untuk AI Study Analyst. Kuota akan direset otomatis besok (WIB).",
          quotaExceeded: true,
        },
        { status: 429 }
      );
    }

    const quotaHeaders = {
      "X-Ai-Quota-Remaining":
        quotaCheck.remaining === null ? "unlimited" : String(quotaCheck.remaining),
      "X-Ai-Quota-Unlimited": String(quotaCheck.isUnlimited),
      "X-Ai-Quota-Used": String(quotaCheck.used),
    };

    // 5. Periksa Ketersediaan API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        "Fitur AI Study Analyst sedang offline karena konfigurasi server (GEMINI_API_KEY belum dipasang). Statistik dan grafik analitik Anda tetap berjalan normal.",
        {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8", ...quotaHeaders },
        }
      );
    }

    // Simpan pesan user ke DB (setelah lolos validasi & kuota)
    if (canPersistHistory) {
      await saveAiChatMessage({
        userId,
        role: "user",
        content: userPrompt.slice(0, 2000),
        mode: activeMode,
      });
    }

    // 6. Bangun Ringkasan Konteks Belajar (8 minggu)
    const studyContext = await buildUserStudyContext(userId, Boolean(includeNotes));

    // 7. Inisialisasi Google GenAI Client
    const ai = new GoogleGenAI({ apiKey });

    // Format riwayat pesan untuk Gemini (maksimal 12 pesan terakhir agar efisien)
    const recentMessages = messages.slice(-12);

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `[DATA RINGKASAN BELAJAR MAHASISWA (8 MINGGU TERAKHIR, ZONA ASIA/JAKARTA)]:
${JSON.stringify(studyContext, null, 2)}

Mohon jawab pertanyaan mahasiswa berikut berdasarkan data di atas atau gunakan tool yang tersedia jika membutuhkan perincian lebih lanjut.`,
          },
        ],
      },
      ...recentMessages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: String(m.content).slice(0, 2000) }],
      })),
    ];

    const modelName = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const maxOutputTokens = isUnlimited ? 4096 : 2048;

    // Buat AbortController untuk langkah inisialisasi / tool calling (30 detik)
    const initialAbortController = new AbortController();
    const initialTimeoutId = setTimeout(() => initialAbortController.abort(), 30000);

    // Langkah A: Generate dengan Tool Calling (jika model meminta tool call)
    let initialResponse;
    try {
      initialResponse = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: toolDeclarations }],
          maxOutputTokens,
          temperature,
          abortSignal: initialAbortController.signal,
        },
      });
    } catch (genErr: unknown) {
      clearTimeout(initialTimeoutId);
      const isAbort =
        genErr instanceof Error &&
        (genErr.name === "AbortError" || genErr.message.toLowerCase().includes("abort"));
      const errMsg = isAbort
        ? "Batas waktu pemrosesan 30 detik terlampaui"
        : genErr instanceof Error
        ? genErr.message
        : "Gagal memproses permintaan ke model.";
      return new Response(
        `Maaf, AI Study Analyst mengalami kendala jaringan atau batas waktu: ${errMsg}. Silakan coba beberapa saat lagi.`,
        {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8", ...quotaHeaders },
        }
      );
    } finally {
      clearTimeout(initialTimeoutId);
    }

    // Jika model meminta eksekusi tool
    if (initialResponse.functionCalls && initialResponse.functionCalls.length > 0) {
      const functionCall = initialResponse.functionCalls[0];
      const fnName = functionCall.name;
      const fnArgs = (functionCall.args || {}) as Record<string, unknown>;

      let toolResult: unknown = {};

      try {
        if (fnName === "getStudySummary") {
          toolResult = await executeGetStudySummary(userId);
        } else if (fnName === "compareStudyPeriods") {
          const parsed = CompareStudyPeriodsSchema.parse(fnArgs);
          toolResult = await executeCompareStudyPeriods(userId, parsed);
        } else if (fnName === "getSubjectStudyBreakdown") {
          const parsed = SubjectBreakdownSchema.parse(fnArgs);
          toolResult = await executeGetSubjectStudyBreakdown(userId, parsed);
        } else if (fnName === "getUpcomingTasks") {
          const parsed = UpcomingTasksSchema.parse(fnArgs);
          toolResult = await executeGetUpcomingTasks(userId, parsed);
        } else if (fnName === "generateStudyPlan") {
          const parsed = StudyPlanSchema.parse(fnArgs);
          toolResult = await executeGenerateStudyPlan(userId, parsed);
        } else {
          toolResult = { error: `Tool ${fnName} tidak dikenali.` };
        }
      } catch (toolErr) {
        toolResult = {
          error: "Validasi parameter tool gagal.",
          detail: toolErr instanceof Error ? toolErr.message : String(toolErr),
        };
      }

      // Kirim hasil tool kembali ke model dan stream hasil akhirnya.
      const candidateContent = initialResponse.candidates?.[0]?.content;
      const toolFollowUpContents = [
        ...contents,
        candidateContent || {
          role: "model",
          parts: [{ functionCall }],
        },
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: fnName,
                response: { output: toolResult },
              },
            },
          ],
        },
      ];

      const streamAbortController = new AbortController();
      const streamTimeoutId = setTimeout(() => streamAbortController.abort(), 45000);

      let streamResponse;
      try {
        streamResponse = await ai.models.generateContentStream({
          model: modelName,
          contents: toolFollowUpContents,
          config: {
            systemInstruction,
            maxOutputTokens,
            temperature,
            abortSignal: streamAbortController.signal,
          },
        });
      } catch (streamErr: unknown) {
        clearTimeout(streamTimeoutId);
        const isAbort =
          streamErr instanceof Error &&
          (streamErr.name === "AbortError" || streamErr.message.toLowerCase().includes("abort"));
        const errMsg = isAbort
          ? "Batas waktu streaming terlampaui"
          : streamErr instanceof Error
          ? streamErr.message
          : "Gagal memulai streaming respons.";
        return new Response(
          `Maaf, AI Study Analyst mengalami kendala streaming: ${errMsg}. Silakan coba lagi.`,
          {
            status: 200,
            headers: { "Content-Type": "text/plain; charset=utf-8", ...quotaHeaders },
          }
        );
      }

      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          let fullReply = "";
          try {
            for await (const chunk of streamResponse) {
              const text = chunk.text;
              if (text) {
                fullReply += text;
                controller.enqueue(encoder.encode(text));
              }
            }
            if (canPersistHistory && fullReply.trim()) {
              await saveAiChatMessage({
                userId,
                role: "assistant",
                content: fullReply,
                mode: activeMode,
              });
            }
          } catch {
            const fallbackTail = "\n[Terputus saat membaca respons streaming model]";
            controller.enqueue(encoder.encode(fallbackTail));
            if (canPersistHistory && fullReply.trim()) {
              await saveAiChatMessage({
                userId,
                role: "assistant",
                content: fullReply,
                mode: activeMode,
              });
            }
          } finally {
            clearTimeout(streamTimeoutId);
            controller.close();
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
          ...quotaHeaders,
        },
      });
    }

    // Jika model langsung merespons teks tanpa tool call
    const directText = initialResponse.text || "Tidak ada respons teks yang dihasilkan.";
    if (canPersistHistory && directText.trim()) {
      await saveAiChatMessage({
        userId,
        role: "assistant",
        content: directText,
        mode: activeMode,
      });
    }

    return new Response(directText, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...quotaHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("[StudyCoach API Error]", error);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal pada server AI Study Coach.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
