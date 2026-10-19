import { test, describe } from "node:test";
import assert from "node:assert";
import {
  resolveFocusSessionProgress,
  extendFocusSessionPlan,
  formatOverdueText,
} from "../src/lib/focus/session-logic";
import { MAX_SESSION_SEC } from "../src/types/focus";

describe("Focus Session Transition & Time Accounting Rules", () => {
  test("1. Target tercapai lalu dibiarkan 48 menit: otomatis COMPLETED dengan focusSec = plannedSec", () => {
    // Skenario: Target 25 menit (1500s). Dimulai t = 0.
    // Dibiarkan berjalan terus selama 25m + 48m = 73 menit (4380 detik).
    const plannedSec = 1500;
    const startTimeMs = 1000000;
    const nowMs = startTimeMs + (25 * 60 + 48 * 60) * 1000; // 48 menit setelah target

    const session = {
      mode: "FOCUS" as const,
      plannedSec,
      startedAt: startTimeMs,
      lastResumedAt: startTimeMs,
      accumulatedSec: 0,
      status: "RUNNING" as const,
    };

    const result = resolveFocusSessionProgress(session, nowMs);

    // Target tercapai dan melewati batas 10 menit (48m >= 10m)
    assert.strictEqual(result.isTargetReached, true, "Target harus ditandai tercapai");
    assert.strictEqual(result.isAutoCompleted, true, "Sesi harus otomatis auto-completed tanpa konfirmasi 10 menit");
    assert.strictEqual(result.resolvedStatus, "COMPLETED", "Status ter-resolusi harus COMPLETED");
    // Waktu fokus harus dikunci pada plannedSec (1500 detik), 48 menit lewat target TIDAK dihitung dalam fokus
    assert.strictEqual(result.focusSec, plannedSec, "focusSec harus dikunci tepat pada plannedSec");
    assert.strictEqual(result.overdueSec, 48 * 60, "overdueSec harus mencatat 48 menit lewat (2880s)");
    assert.strictEqual(result.remainingSec, 0, "remainingSec harus 0");
  });

  test("2. Pause lalu resume: durasi jeda tidak dihitung dalam akumulasi fokus", () => {
    const plannedSec = 1500;
    const t0 = 1000000;

    // 1. Jalan 10 menit (600s), lalu user pause
    const tPause = t0 + 600 * 1000;
    const sessionRunning = {
      mode: "FOCUS" as const,
      plannedSec,
      startedAt: t0,
      lastResumedAt: t0,
      accumulatedSec: 0,
      status: "RUNNING" as const,
    };

    const progressBeforePause = resolveFocusSessionProgress(sessionRunning, tPause);
    assert.strictEqual(progressBeforePause.focusSec, 600);
    assert.strictEqual(progressBeforePause.elapsedSec, 600);

    // Simpan status PAUSED dengan accumulatedSec = 600, lastResumedAt = null
    const sessionPaused = {
      ...sessionRunning,
      accumulatedSec: 600,
      lastResumedAt: null,
      status: "PAUSED" as const,
      updatedAt: tPause,
    };

    // 2. Selama 15 menit dalam status PAUSED (tPause + 900s), waktu fokus TIDAK bertambah
    const tDuringPause = tPause + 900 * 1000;
    const progressDuringPause = resolveFocusSessionProgress(sessionPaused, tDuringPause);
    assert.strictEqual(progressDuringPause.focusSec, 600, "Waktu fokus saat jeda harus tetap 600 detik");
    assert.strictEqual(progressDuringPause.elapsedSec, 600, "Elapsed saat jeda harus tetap 600 detik");
    assert.strictEqual(progressDuringPause.resolvedStatus, "PAUSED");

    // 3. User melakukan RESUME pada tResume = tDuringPause
    const tResume = tDuringPause;
    const sessionResumed = {
      ...sessionPaused,
      status: "RUNNING" as const,
      lastResumedAt: tResume,
    };

    // 4. Berjalan 10 menit (600s) lagi setelah resume
    const tFinal = tResume + 600 * 1000;
    const progressFinal = resolveFocusSessionProgress(sessionResumed, tFinal);

    // Total waktu fokus = 600 + 600 = 1200 detik (20 menit). Jeda 15 menit sama sekali tidak masuk.
    assert.strictEqual(progressFinal.focusSec, 1200, "Total fokus harus 1200 detik tanpa waktu jeda");
    assert.strictEqual(progressFinal.elapsedSec, 1200);
    assert.strictEqual(progressFinal.remainingSec, 300);
    assert.strictEqual(progressFinal.isTargetReached, false);
  });

  test("3. Lanjut fokus (+5 menit): akumulasi dikunci di target lama, target bertambah, hitung dari saat tombol ditekan", () => {
    // Skenario: Target awal 25 menit (1500s). Target tercapai pada t = 1500s.
    const plannedSec = 1500;
    const t0 = 1000000;
    const tTargetReached = t0 + 1500 * 1000;

    // Saat tepat target tercapai
    const sessionAtTarget = {
      mode: "FOCUS" as const,
      plannedSec,
      startedAt: t0,
      lastResumedAt: t0,
      accumulatedSec: 0,
      status: "RUNNING" as const,
    };

    const evalAtTarget = resolveFocusSessionProgress(sessionAtTarget, tTargetReached);
    assert.strictEqual(evalAtTarget.isTargetReached, true);
    assert.strictEqual(evalAtTarget.focusSec, 1500);

    // 30 detik kemudian user menekan tombol "Lanjut fokus +5 menit" (300 detik)
    const tExtendClicked = tTargetReached + 30 * 1000;
    const extensionPlan = extendFocusSessionPlan(plannedSec, tExtendClicked, 300);

    assert.strictEqual(extensionPlan.newPlannedSec, 1800, "Target baru harus bertambah 300s menjadi 1800s");
    assert.strictEqual(extensionPlan.newAccumulatedSec, 1500, "Akumulasi harus dikunci tepat di target lama (1500s)");
    assert.strictEqual(extensionPlan.newStatus, "RUNNING");
    assert.strictEqual(extensionPlan.newLastResumedAt.getTime(), tExtendClicked);

    // Sesi baru setelah perpanjangan
    const sessionExtended = {
      mode: "FOCUS" as const,
      plannedSec: extensionPlan.newPlannedSec,
      startedAt: t0,
      lastResumedAt: extensionPlan.newLastResumedAt,
      accumulatedSec: extensionPlan.newAccumulatedSec,
      status: extensionPlan.newStatus,
    };

    // 120 detik (2 menit) setelah tombol ditekan
    const tAfterExtension = tExtendClicked + 120 * 1000;
    const evalExtended = resolveFocusSessionProgress(sessionExtended, tAfterExtension);

    // Total waktu berjalan = 1500 + 120 = 1620s. Target baru 1800s belum tercapai.
    assert.strictEqual(evalExtended.elapsedSec, 1620);
    assert.strictEqual(evalExtended.focusSec, 1620);
    assert.strictEqual(evalExtended.remainingSec, 180, "Sisa waktu ke target baru harus 180s (3 menit)");
    assert.strictEqual(evalExtended.isTargetReached, false, "Target baru belum tercapai");
    assert.strictEqual(evalExtended.overdueSec, 0);
  });

  test("4. Sesi ditinggalkan (>4 jam tanpa aktivitas): otomatis STOPPED_EARLY", () => {
    // Skenario: Mulai t = 0, jalan 20 menit (1200 detik), lalu ditinggalkan selama 5 jam (18000s)
    const t0 = 1000000;
    const tAbandoned = t0 + 18000 * 1000; // 5 jam kemudian

    const session = {
      mode: "FOCUS" as const,
      plannedSec: 1500,
      startedAt: t0,
      lastResumedAt: t0,
      accumulatedSec: 0,
      status: "RUNNING" as const,
    };

    const evalAbandoned = resolveFocusSessionProgress(session, tAbandoned);

    assert.strictEqual(evalAbandoned.isAbandoned, true, "Harus ditandai isAbandoned");
    assert.strictEqual(evalAbandoned.resolvedStatus, "STOPPED_EARLY", "Status harus STOPPED_EARLY");
    assert.ok(evalAbandoned.elapsedSec <= MAX_SESSION_SEC, "Durasi tidak boleh melebihi batas 4 jam");
    assert.strictEqual(evalAbandoned.elapsedSec, MAX_SESSION_SEC);
  });

  test("Mode STOPWATCH: tidak dibatasi durasinya oleh plannedSec", () => {
    const t0 = 1000000;
    // Berjalan 45 menit (2700s)
    const tNow = t0 + 2700 * 1000;

    const session = {
      mode: "STOPWATCH" as const,
      plannedSec: 0,
      startedAt: t0,
      lastResumedAt: t0,
      accumulatedSec: 0,
      status: "RUNNING" as const,
    };

    const evalStopwatch = resolveFocusSessionProgress(session, tNow);
    assert.strictEqual(evalStopwatch.focusSec, 2700, "Mode STOPWATCH menghitung durasi penuh");
    assert.strictEqual(evalStopwatch.elapsedSec, 2700);
    assert.strictEqual(evalStopwatch.overdueSec, 0, "Mode STOPWATCH tidak ada overdue");
    assert.strictEqual(evalStopwatch.isAutoCompleted, false, "Stopwatch tidak di-auto-complete setelah 10m");
  });

  test("Format waktu lewat target (+mm:ss lewat)", () => {
    assert.strictEqual(formatOverdueText(75), "+01:15 lewat");
    assert.strictEqual(formatOverdueText(305), "+05:05 lewat");
    assert.strictEqual(formatOverdueText(3665), "+01:01:05 lewat");
  });
});
