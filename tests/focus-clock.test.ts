import { test, describe } from "node:test";
import assert from "node:assert";
import { getFocusClock, toEpochMs } from "../src/lib/focus/session-logic";
import type { ActiveFocusSessionDto } from "../src/types/focus";

describe("Focus Clock & State Synchronization Rules", () => {
  test("1. getFocusClock: Baru mulai", () => {
    const nowMs = 1700000000000;
    const session = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: 0,
      lastResumedAt: nowMs,
      startedAt: nowMs,
    };

    const clockAtStart = getFocusClock(session, nowMs);
    assert.strictEqual(clockAtStart.focusSec, 0, "FocusSec awal harus 0");
    assert.strictEqual(clockAtStart.remainingSec, 1500, "RemainingSec awal harus 1500");
    assert.strictEqual(clockAtStart.phase, "RUNNING");

    // Berjalan 5 detik
    const clockAfter5s = getFocusClock(session, nowMs + 5000);
    assert.strictEqual(clockAfter5s.focusSec, 5, "FocusSec setelah 5s harus 5");
    assert.strictEqual(clockAfter5s.remainingSec, 1495, "RemainingSec setelah 5s harus 1495");
    assert.strictEqual(clockAfter5s.phase, "RUNNING");
  });

  test("2. getFocusClock: Jeda (PAUSED tidak bertambah seiring waktu)", () => {
    const tPause = 1700000186000;
    const session = {
      status: "PAUSED",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: 186,
      lastResumedAt: null,
      startedAt: 1700000000000,
    };

    const clockAtPause = getFocusClock(session, tPause);
    assert.strictEqual(clockAtPause.focusSec, 186, "FocusSec saat jeda harus sama dengan accumulatedSec");
    assert.strictEqual(clockAtPause.remainingSec, 1314, "RemainingSec saat jeda harus 1500 - 186 = 1314");
    assert.strictEqual(clockAtPause.phase, "PAUSED");

    // Maju 10 menit saat dijeda
    const clockAfter10m = getFocusClock(session, tPause + 600 * 1000);
    assert.strictEqual(clockAfter10m.focusSec, 186, "FocusSec tidak boleh bertambah saat PAUSED");
    assert.strictEqual(clockAfter10m.remainingSec, 1314, "RemainingSec tidak boleh berkurang saat PAUSED");
    assert.strictEqual(clockAfter10m.phase, "PAUSED");
  });

  test("3. getFocusClock: Lanjut tepat setelah jeda", () => {
    const tResume = 1700000500000;
    const session = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: 186,
      lastResumedAt: tResume,
      startedAt: 1700000000000,
    };

    // Tepat di milidetik saat resume dipicu (nowMs === lastResumedAt)
    const clockImmediate = getFocusClock(session, tResume);
    assert.strictEqual(clockImmediate.focusSec, 186, "Saat baru lanjut, focusSec tetap 186");
    assert.strictEqual(clockImmediate.remainingSec, 1314, "RemainingSec tetap 1314");
    assert.strictEqual(clockImmediate.phase, "RUNNING");

    // 10 detik setelah resume
    const clockAfter10s = getFocusClock(session, tResume + 10000);
    assert.strictEqual(clockAfter10s.focusSec, 196, "FocusSec bertambah 10 detik");
    assert.strictEqual(clockAfter10s.remainingSec, 1304, "RemainingSec berkurang 10 detik");
    assert.strictEqual(clockAfter10s.phase, "RUNNING");
  });

  test("4. getFocusClock: Jeda-lanjut tiga kali", () => {
    const t0 = 1700000000000;
    let accumulatedSec = 0;

    // Siklus 1: jalan 100s, lalu jeda
    const tPause1 = t0 + 100 * 1000;
    accumulatedSec += 100;
    const sessionPause1 = {
      status: "PAUSED",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec,
      lastResumedAt: null,
      startedAt: t0,
    };
    const cP1 = getFocusClock(sessionPause1, tPause1 + 50000);
    assert.strictEqual(cP1.focusSec, 100);
    assert.strictEqual(cP1.remainingSec, 1400);
    assert.strictEqual(cP1.phase, "PAUSED");

    // Siklus 2: jeda 50s, resume di t1, jalan 200s, lalu jeda
    const tResume1 = tPause1 + 50 * 1000;
    const sessionRun2 = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec,
      lastResumedAt: tResume1,
      startedAt: t0,
    };
    const cR2 = getFocusClock(sessionRun2, tResume1 + 200 * 1000);
    assert.strictEqual(cR2.focusSec, 300);
    assert.strictEqual(cR2.remainingSec, 1200);
    assert.strictEqual(cR2.phase, "RUNNING");

    accumulatedSec = 300;
    const sessionPause2 = {
      status: "PAUSED",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec,
      lastResumedAt: null,
      startedAt: t0,
    };
    const cP2 = getFocusClock(sessionPause2, tResume1 + 250 * 1000);
    assert.strictEqual(cP2.focusSec, 300);
    assert.strictEqual(cP2.phase, "PAUSED");

    // Siklus 3: jeda 30s, resume di t2, jalan 150s, lalu jeda
    const tResume2 = tResume1 + 230 * 1000;
    const sessionRun3 = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec,
      lastResumedAt: tResume2,
      startedAt: t0,
    };
    const cR3 = getFocusClock(sessionRun3, tResume2 + 150 * 1000);
    assert.strictEqual(cR3.focusSec, 450);
    assert.strictEqual(cR3.remainingSec, 1050);
    assert.strictEqual(cR3.phase, "RUNNING");

    accumulatedSec = 450;
    const sessionPause3 = {
      status: "PAUSED",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec,
      lastResumedAt: null,
      startedAt: t0,
    };
    const cP3 = getFocusClock(sessionPause3, tResume2 + 200 * 1000);
    assert.strictEqual(cP3.focusSec, 450);
    assert.strictEqual(cP3.remainingSec, 1050);
    assert.strictEqual(cP3.phase, "PAUSED");
  });

  test("5. getFocusClock: Lewat target dibatasi plannedSec untuk mode FOCUS", () => {
    const t0 = 1700000000000;
    // Berjalan 1600s dari target 1500s
    const session = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: 1000,
      lastResumedAt: t0,
      startedAt: t0,
    };

    const clockOverdue = getFocusClock(session, t0 + 600 * 1000); // 1000 + 600 = 1600s
    assert.strictEqual(clockOverdue.focusSec, 1500, "focusSec dibatasi plannedSec (1500s)");
    assert.strictEqual(clockOverdue.remainingSec, 0, "remainingSec adalah 0 hanya saat target tercapai");
    assert.strictEqual(clockOverdue.phase, "TARGET_REACHED");

    // Stopwatch mode: tidak dibatasi
    const sessionStopwatch = {
      status: "RUNNING",
      mode: "STOPWATCH",
      plannedSec: 0,
      accumulatedSec: 1000,
      lastResumedAt: t0,
      startedAt: t0,
    };
    const clockStopwatch = getFocusClock(sessionStopwatch, t0 + 600 * 1000);
    assert.strictEqual(clockStopwatch.focusSec, 1600, "Stopwatch fokus terus bertambah");
    assert.strictEqual(clockStopwatch.remainingSec, 0);
    assert.strictEqual(clockStopwatch.phase, "RUNNING");
  });

  test("6. Spesifikasi Persis: plannedSec 1500 + accumulatedSec 186 + lastResumedAt=now -> remaining 1314", () => {
    const nowMs = 1700000555000;
    const session = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: 186,
      lastResumedAt: nowMs,
      startedAt: 1700000000000,
    };

    const clock = getFocusClock(session, nowMs);
    assert.strictEqual(clock.remainingSec, 1314, "remainingSec harus tepat 1314");
    assert.strictEqual(clock.focusSec, 186, "focusSec harus 186");
    assert.strictEqual(clock.phase, "RUNNING");
  });

  test("7. Konsistensi Timezone: Hasil getFocusClock identik di TZ=UTC dan TZ=Asia/Jakarta", () => {
    // Timestamp ISO UTC dengan 'Z'
    const isoUtc = "2026-10-21T04:12:34.000Z";
    const epochUtc = toEpochMs(isoUtc);
    assert.ok(epochUtc !== null);

    // Waktu nowMs 15 detik kemudian
    const nowMs = epochUtc + 15000;

    const sessionWithIso = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: 186,
      lastResumedAt: isoUtc,
    };

    const sessionWithEpoch = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: 186,
      lastResumedAt: epochUtc,
    };

    const clockFromIso = getFocusClock(sessionWithIso, nowMs);
    const clockFromEpoch = getFocusClock(sessionWithEpoch, nowMs);

    assert.strictEqual(clockFromIso.focusSec, clockFromEpoch.focusSec);
    assert.strictEqual(clockFromIso.remainingSec, clockFromEpoch.remainingSec);
    assert.strictEqual(clockFromIso.focusSec, 186 + 15);
    assert.strictEqual(clockFromIso.remainingSec, 1500 - (186 + 15));

    // String tanpa zona diperlakukan sebagai UTC dengan 'Z' oleh toEpochMs
    const zonelessIso = "2026-10-21T04:12:34.000";
    const epochZoneless = toEpochMs(zonelessIso);
    assert.strictEqual(epochZoneless, epochUtc, "Zoneless ISO harus dinormalisasi menjadi UTC 'Z'");
  });

  test("8. Input tidak valid: Tidak menampilkan 00:00, menghasilkan phase INVALID dan menyinkronkan", () => {
    const nowMs = 1700000000000;

    // Skenario: RUNNING tapi lastResumedAt null / tidak valid
    const sessionInvalid = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: 186,
      lastResumedAt: null,
    };

    const clockInvalid = getFocusClock(sessionInvalid, nowMs);
    assert.strictEqual(clockInvalid.phase, "INVALID");
    assert.strictEqual(clockInvalid.focusSec, 186);
    assert.strictEqual(clockInvalid.remainingSec, 1314, "RemainingSec tidak boleh tiba-tiba 0!");

    // Skenario: NaN dalam akumulasi
    const sessionNaN = {
      status: "RUNNING",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: NaN,
      lastResumedAt: nowMs,
    };
    const clockNaN = getFocusClock(sessionNaN, nowMs);
    assert.strictEqual(clockNaN.phase, "INVALID");
    assert.ok(clockNaN.remainingSec > 0, "RemainingSec tidak boleh 0 pada input NaN");
  });

  test("9. Tes Urutan: Jeda lalu snapshot RUNNING lama tiba -> UI tetap Dijeda (versi state menolak)", () => {
    // Model rekonsiliasi state klien
    let clientSession: ActiveFocusSessionDto = {
      id: "sess-1",
      userId: "u1",
      mode: "FOCUS",
      plannedSec: 1500,
      startedAt: new Date(1700000000000).toISOString(),
      lastResumedAt: new Date(1700000000000).toISOString(),
      accumulatedSec: 186,
      status: "RUNNING",
      courseId: null,
      taskId: null,
      note: null,
      version: 1,
    };

    function reconcile(incoming: ActiveFocusSessionDto) {
      const incomingVer = incoming.version ?? 0;
      const currentVer = clientSession.version ?? 0;
      if (incomingVer >= currentVer) {
        clientSession = incoming;
        return true;
      }
      // Rejection: Snapshot lebih lama tidak boleh menimpa
      return false;
    }

    // 1. User menekan "Jeda" -> Optimistic update ke versi 2 (PAUSED)
    clientSession = {
      ...clientSession,
      status: "PAUSED",
      lastResumedAt: null,
      version: (clientSession.version ?? 1) + 1, // versi 2
    };

    const clockAfterPause = getFocusClock(clientSession, 1700000186000);
    assert.strictEqual(clockAfterPause.phase, "PAUSED");
    assert.strictEqual(clientSession.status, "PAUSED");

    // 2. Snapshot lama dari background heartbeat / slow revalidation tiba (versi 1, status RUNNING)
    const staleSnapshot: ActiveFocusSessionDto = {
      id: "sess-1",
      userId: "u1",
      mode: "FOCUS",
      plannedSec: 1500,
      startedAt: new Date(1700000000000).toISOString(),
      lastResumedAt: new Date(1700000000000).toISOString(),
      accumulatedSec: 186,
      status: "RUNNING",
      courseId: null,
      taskId: null,
      note: null,
      version: 1, // versi lama!
    };

    const accepted = reconcile(staleSnapshot);
    assert.strictEqual(accepted, false, "Snapshot versi lama wajib ditolak");
    assert.strictEqual(clientSession.status, "PAUSED", "UI tetap Dijeda, tidak tertimpa status RUNNING");
    assert.strictEqual(clientSession.version, 2, "Versi klien tetap 2");

    // 3. Konfirmasi dari server atas aksi Jeda tiba (versi 2, status PAUSED)
    const serverResponse: ActiveFocusSessionDto = {
      ...staleSnapshot,
      status: "PAUSED",
      lastResumedAt: null,
      version: 2,
    };
    const confirmed = reconcile(serverResponse);
    assert.strictEqual(confirmed, true, "Respons server dengan versi sama/baru diterima");
    assert.strictEqual(clientSession.status, "PAUSED");
  });

  test("10. Tes Urutan: Lanjut dengan respons lambat -> tidak pernah tampil 00:00", () => {
    const tPause = 1700000186000;
    // Sesi dalam keadaan PAUSED
    let clientSession: ActiveFocusSessionDto = {
      id: "sess-1",
      userId: "u1",
      mode: "FOCUS",
      plannedSec: 1500,
      startedAt: new Date(1700000000000).toISOString(),
      lastResumedAt: null,
      accumulatedSec: 186,
      status: "PAUSED",
      courseId: null,
      taskId: null,
      note: null,
      version: 2,
    };

    // User menekan "Lanjut" di waktu tResume
    const tResume = tPause + 30000; // 30 detik kemudian
    // Optimistic update
    clientSession = {
      ...clientSession,
      status: "RUNNING",
      lastResumedAt: new Date(tResume).toISOString(),
      version: 3,
    };

    // Saat respons server sedang berjalan (misal 2.5 detik latency)
    const clockImmediate = getFocusClock(clientSession, tResume);
    assert.notStrictEqual(clockImmediate.remainingSec, 0, "Tidak boleh 00:00 saat klik Lanjut");
    assert.strictEqual(clockImmediate.remainingSec, 1314);

    const clockAfter1s = getFocusClock(clientSession, tResume + 1000);
    assert.strictEqual(clockAfter1s.remainingSec, 1313, "Hitung mundur berjalan dari 1314 ke 1313");

    const clockAfter2s = getFocusClock(clientSession, tResume + 2000);
    assert.strictEqual(clockAfter2s.remainingSec, 1312, "Hitung mundur berjalan normal");

    // Server response tiba setelah 2.5 detik
    const serverResponse: ActiveFocusSessionDto = {
      ...clientSession,
      version: 3,
      lastResumedAt: new Date(tResume).toISOString(),
    };

    if ((serverResponse.version ?? 0) >= (clientSession.version ?? 0)) {
      clientSession = serverResponse;
    }

    const clockReconciledAt2500 = getFocusClock(clientSession, tResume + 2500);
    assert.strictEqual(clockReconciledAt2500.remainingSec, 1312);
    assert.notStrictEqual(clockReconciledAt2500.remainingSec, 0, "Tidak pernah menampilkan 00:00");

    const clockReconciledAt3000 = getFocusClock(clientSession, tResume + 3000);
    assert.strictEqual(clockReconciledAt3000.remainingSec, 1311);
    assert.notStrictEqual(clockReconciledAt3000.remainingSec, 0, "Tidak pernah menampilkan 00:00");
  });
});
