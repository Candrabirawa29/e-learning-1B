import { test, describe } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as sessionLogic from "../src/lib/focus/session-logic";
import type { FocusSessionInput } from "../src/lib/focus/session-logic";
import type { ActiveFocusSessionDto } from "../src/types/focus";

const { resolveFocusSessionProgress, deriveStatus } = sessionLogic;

function formatDuration(sec: number): string {
  if (sec <= 0) return "0 detik";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds} detik`;
}

describe("Investigasi & Regresi Bug Timer Fokus (25m Berhenti Lebih Awal + Spam Extend +5m)", () => {
  test("1. Bug 25m Berhenti Lebih Awal: Sesi selesai 25m lalu heartbeat berhenti di 35m (auto-complete) dan dibuka >4 jam kemudian harus COMPLETED", () => {
    const startedAt = new Date("2026-11-22T15:00:00.000Z");
    // Klien aktif penuh 25m + 10m grace (auto-complete lokal menghentikan heartbeat di menit ke-35)
    const lastSeenAt = new Date(startedAt.getTime() + 35 * 60 * 1000);
    // User membuka halaman lagi 5 jam kemudian
    const now = new Date("2026-11-22T20:00:00.000Z");

    const session: FocusSessionInput = {
      mode: "FOCUS",
      plannedSec: 1500, // 25 menit
      startedAt,
      lastResumedAt: startedAt,
      accumulatedSec: 0,
      lastSeenAt,
      status: "RUNNING",
      updatedAt: lastSeenAt,
    };

    const evaluation = resolveFocusSessionProgress(session, now);

    assert.strictEqual(evaluation.focusSec, 1500, "focusSec harus 1500 detik (25m 0s)");
    assert.strictEqual(formatDuration(evaluation.focusSec), "25m 0s");
    assert.strictEqual(evaluation.isTargetReached, true);
    assert.strictEqual(
      evaluation.resolvedStatus,
      "COMPLETED",
      "Sesi yang sudah mencapai 25m harus COMPLETED, bukan STOPPED_EARLY!"
    );
  });

  test("2. Bug 25m Berhenti Lebih Awal: Sesi PAUSED tepat di 1500s atau tanpa lastSeenAt yang ditinggalkan >4 jam tetap COMPLETED", () => {
    const startedAt = new Date("2026-11-22T15:00:00.000Z");
    const now = new Date("2026-11-22T20:00:00.000Z");

    const pausedAtTarget: FocusSessionInput = {
      mode: "FOCUS",
      plannedSec: 1500,
      startedAt,
      lastResumedAt: null,
      accumulatedSec: 1500,
      lastSeenAt: startedAt,
      status: "PAUSED",
      updatedAt: new Date(startedAt.getTime() + 25 * 60 * 1000),
    };

    const evalPaused = resolveFocusSessionProgress(pausedAtTarget, now);
    assert.strictEqual(evalPaused.focusSec, 1500);
    assert.strictEqual(evalPaused.resolvedStatus, "COMPLETED");

    const legacyNoHeartbeat: FocusSessionInput = {
      mode: "FOCUS",
      plannedSec: 1500,
      startedAt,
      lastResumedAt: startedAt,
      accumulatedSec: 0,
      lastSeenAt: null,
      status: "RUNNING",
      updatedAt: startedAt,
    };

    const evalLegacy = resolveFocusSessionProgress(legacyNoHeartbeat, now);
    assert.strictEqual(evalLegacy.focusSec, 1500);
    assert.strictEqual(evalLegacy.resolvedStatus, "COMPLETED");
  });

  test("3. Pengaman Heartbeat (>4 jam): Jika tab ditutup pada menit ke-5 lalu dibuka 5 jam kemudian, durasi tetap 5m (bukan 25m)", () => {
    const startedAt = new Date("2026-11-22T15:00:00.000Z");
    const lastSeenAt = new Date(startedAt.getTime() + 5 * 60 * 1000); // 5 menit
    const now = new Date("2026-11-22T20:00:00.000Z");

    const session: FocusSessionInput = {
      mode: "FOCUS",
      plannedSec: 1500,
      startedAt,
      lastResumedAt: startedAt,
      accumulatedSec: 0,
      lastSeenAt,
      status: "RUNNING",
      updatedAt: lastSeenAt,
    };

    const evaluation = resolveFocusSessionProgress(session, now);
    assert.strictEqual(evaluation.focusSec, 300, "Harus terkunci pada heartbeat terakhir (300 detik / 5 menit)");
    assert.strictEqual(evaluation.resolvedStatus, "STOPPED_EARLY");
  });

  test("4. Bug Extend +5 Menit Spam: Server validator harus menolak perpanjangan jika target saat ini belum tercapai", () => {
    const planFocusExtension = (sessionLogic as Record<string, unknown>).planFocusExtension as
      | ((
          session: FocusSessionInput,
          now?: Date | string | number,
          extensionSec?: number
        ) =>
          | {
              ok: true;
              newPlannedSec: number;
              newAccumulatedSec: number;
              newLastResumedAt: Date;
              newStatus: "RUNNING";
            }
          | { ok: false; reason: string; message: string })
      | undefined;

    assert.strictEqual(
      typeof planFocusExtension,
      "function",
      "planFocusExtension harus diekspor oleh session-logic untuk memvalidasi perpanjangan di server"
    );

    const t0 = new Date("2026-11-23T14:30:00.000Z").getTime();
    const t25m = t0 + 1500 * 1000; // Tepat 25 menit

    // Sesi pertama selesai 25m -> klik +5m pertama SAH
    const sessionAt25m: FocusSessionInput = {
      mode: "FOCUS",
      plannedSec: 1500,
      startedAt: t0,
      lastResumedAt: t0,
      accumulatedSec: 0,
      lastSeenAt: t25m,
      status: "RUNNING",
      updatedAt: t25m,
    };

    const firstExtend = planFocusExtension!(sessionAt25m, t25m + 2000, 300);
    assert.strictEqual(firstExtend.ok, true, "Perpanjangan pertama saat 25m tercapai harus berhasil");
    if (!firstExtend.ok) return;
    assert.strictEqual(firstExtend.newPlannedSec, 1800);
    assert.strictEqual(firstExtend.newAccumulatedSec, 1500);

    // Simulasi SPAM klik +5m ke-2 hanya 1 detik kemudian (baru 1501s dari target 1800s!)
    const sessionAfterFirstExtend: FocusSessionInput = {
      mode: "FOCUS",
      plannedSec: firstExtend.newPlannedSec, // 1800
      startedAt: t0,
      lastResumedAt: firstExtend.newLastResumedAt,
      accumulatedSec: firstExtend.newAccumulatedSec, // 1500
      lastSeenAt: firstExtend.newLastResumedAt,
      status: "RUNNING",
      updatedAt: firstExtend.newLastResumedAt,
    };

    const spamExtend = planFocusExtension!(
      sessionAfterFirstExtend,
      firstExtend.newLastResumedAt.getTime() + 1000,
      300
    );
    assert.strictEqual(
      spamExtend.ok,
      false,
      "Spam perpanjangan sebelum target 30m tercapai WAJIB ditolak (tidak boleh menggelembungkan akumulasi ke 30m/45m)"
    );
    if (!spamExtend.ok) {
      assert.strictEqual(spamExtend.reason, "TARGET_NOT_REACHED");
    }

    // Jika user benar-benar belajar 5 menit tambahan lagi -> sekarang 1800/1800 tercapai -> boleh extend lagi
    const t30m = firstExtend.newLastResumedAt.getTime() + 300 * 1000;
    const validSecondExtend = planFocusExtension!(
      { ...sessionAfterFirstExtend, lastSeenAt: t30m },
      t30m,
      300
    );
    assert.strictEqual(validSecondExtend.ok, true);
    if (validSecondExtend.ok) {
      assert.strictEqual(validSecondExtend.newPlannedSec, 2100);
      assert.strictEqual(validSecondExtend.newAccumulatedSec, 1800);
    }
  });

  test("5. Serverless Versioning & Client Sync: Tidak boleh menolak respons extend/mutation langsung meski instance Lambda berbeda", () => {
    const actionsPath = path.join(process.cwd(), "src/actions/focus.ts");
    const actionsContent = fs.readFileSync(actionsPath, "utf-8");

    // Tidak boleh memakai Map in-memory yang reset antar serverless Lambda Vercel
    assert.doesNotMatch(
      actionsContent,
      /new\s+Map<string,\s*number>\(\)/,
      "src/actions/focus.ts tidak boleh memakai in-memory Map untuk version sesi di lingkungan serverless"
    );

    // autoCleanupStaleSession isAbandoned tidak boleh hardcode STOPPED_EARLY
    assert.doesNotMatch(
      actionsContent,
      /if\s*\(evaluation\.isAbandoned\)[\s\S]{0,400}status:\s*FocusSessionStatus\.STOPPED_EARLY/,
      "autoCleanupStaleSession tidak boleh men-hardcode STOPPED_EARLY untuk sesi abandoned yang sudah mencapai target"
    );

    // Client reconciliation helper harus menerima hasil mutasi terbaru walau server version <= optimisticVersion
    const reconcileFocusSessionState = (sessionLogic as Record<string, unknown>)
      .reconcileFocusSessionState as
      | ((params: {
          currentVersion: number;
          currentMutationSeq: number;
          incoming: ActiveFocusSessionDto | null;
          incomingVersion?: number;
          options?: { force?: boolean; mutationSeq?: number; backgroundStartSeq?: number };
        }) => { accepted: boolean; nextSession: ActiveFocusSessionDto | null; nextVersion: number })
      | undefined;

    assert.strictEqual(
      typeof reconcileFocusSessionState,
      "function",
      "reconcileFocusSessionState harus tersedia di session-logic.ts"
    );

    const serverExtendedSnapshot: ActiveFocusSessionDto = {
      id: "sess-1",
      clientSessionId: "cs-1",
      mode: "FOCUS",
      plannedSec: 1800,
      startedAt: new Date(1700000000000).toISOString(),
      lastResumedAt: new Date(1700001500000).toISOString(),
      accumulatedSec: 1500,
      status: "RUNNING",
      courseId: null,
      taskId: null,
      note: null,
      version: 1, // Simulasi response jika version lebih kecil dari optimistic client version (mis. 5)
    };

    const res = reconcileFocusSessionState!({
      currentVersion: 5,
      currentMutationSeq: 3,
      incoming: serverExtendedSnapshot,
      incomingVersion: 1,
      options: { mutationSeq: 3 },
    });

    assert.strictEqual(
      res.accepted,
      true,
      "Respons mutasi terbaru dari server harus diterima agar UI langsung pindah dari '25:00 selesai' ke hitung mundur +5 menit"
    );
    assert.strictEqual(res.nextSession?.plannedSec, 1800);
  });

  test("6. Opsi A: Sesi selesai 25m, diperpanjang +5m (target 30m), lalu dihentikan di 25m/27m tetap COMPLETED (dibandingkan target awal)", () => {
    const t0 = new Date("2026-11-23T14:30:00.000Z").getTime();
    const t25m = t0 + 1500 * 1000;
    // User diam di layar "Target tercapai" selama 2 menit sebelum klik "+5 menit"
    const tAfter2mWait = t25m + 120 * 1000;

    const planFocusExtension = (sessionLogic as Record<string, unknown>).planFocusExtension as (
      session: FocusSessionInput,
      now?: Date | string | number,
      extensionSec?: number
    ) =>
      | {
          ok: true;
          newPlannedSec: number;
          newInitialPlannedSec?: number;
          newAccumulatedSec: number;
          newLastResumedAt: Date;
          newStatus: "RUNNING";
        }
      | { ok: false; reason: string; message: string };

    const ext = planFocusExtension(
      {
        mode: "FOCUS",
        plannedSec: 1500,
        initialPlannedSec: 1500,
        startedAt: t0,
        lastResumedAt: t0,
        accumulatedSec: 0,
        lastSeenAt: tAfter2mWait,
        status: "RUNNING",
        updatedAt: t0,
      },
      tAfter2mWait,
      300
    );

    assert.strictEqual(ext.ok, true);
    if (!ext.ok) return;
    // Waktu menunggu 2 menit (120s) di layar Target tercapai TIDAK boleh masuk sebagai fokus
    assert.strictEqual(
      ext.newAccumulatedSec,
      1500,
      "2 menit menunggu sebelum klik +5m tidak boleh terhitung fokus"
    );
    assert.strictEqual(ext.newPlannedSec, 1800);
    assert.strictEqual(
      ext.newInitialPlannedSec,
      1500,
      "Target awal harus tetap tersimpan di 1500s meski plannedSec naik ke 1800s"
    );

    // Skenario 6a: Diakhiri langsung di menit ke-25 (1500s) setelah extend ke 30m -> tetap COMPLETED
    const statusAt25m = (deriveStatus as (
      focusSec: number,
      plannedSec: number,
      mode: "FOCUS" | "STOPWATCH",
      initialPlannedSec?: number | null
    ) => "COMPLETED" | "STOPPED_EARLY" | null)(1500, 1800, "FOCUS", ext.newInitialPlannedSec);
    assert.strictEqual(statusAt25m, "COMPLETED", "25m selesai + extend + akhiri di 25m harus COMPLETED");

    // Skenario 6b: Diakhiri atau ditinggalkan di menit ke-27 (1620s) -> COMPLETED dan durasi tetap 27m (bukan 30m)
    const t27m = tAfter2mWait + 120 * 1000;
    const staleAfterExtend = resolveFocusSessionProgress(
      {
        mode: "FOCUS",
        plannedSec: ext.newPlannedSec,
        initialPlannedSec: ext.newInitialPlannedSec,
        startedAt: t0,
        lastResumedAt: ext.newLastResumedAt,
        accumulatedSec: ext.newAccumulatedSec,
        lastSeenAt: t27m,
        status: "RUNNING",
        updatedAt: t27m,
      },
      t27m + 15 * 60 * 1000 // Heartbeat stale > 10 menit
    );
    assert.strictEqual(staleAfterExtend.focusSec, 1620);
    assert.strictEqual(formatDuration(staleAfterExtend.focusSec), "27m 0s");
    assert.strictEqual(
      staleAfterExtend.resolvedStatus,
      "COMPLETED",
      "Sesi yang sudah menuntaskan target awal 25m harus COMPLETED walau berhenti di 27m setelah extend ke 30m"
    );

    // Skenario 6c (Kontras): Sesi yang MEMANG dimulai dengan target awal 30m dan berhenti di 27m tetap STOPPED_EARLY
    const statusNormal30mStoppedAt27m = (deriveStatus as (
      focusSec: number,
      plannedSec: number,
      mode: "FOCUS" | "STOPWATCH",
      initialPlannedSec?: number | null
    ) => "COMPLETED" | "STOPPED_EARLY" | null)(1620, 1800, "FOCUS", 1800);
    assert.strictEqual(statusNormal30mStoppedAt27m, "STOPPED_EARLY");
  });
});
