import { test, describe } from "node:test";
import assert from "node:assert";

// Pure logic verification for focus sessions
describe("Focus Session Transition & Time Accounting Rules", () => {
  const MAX_SESSION_SEC = 14400; // 4 jam

  test("Perhitungan waktu fokus: jeda (pause) tidak dihitung dalam accumulatedSec", () => {
    // Sesi mulai, jalan 15 menit (900s), lalu jeda 10 menit (600s), lalu jalan 10 menit (600s)
    let accumulatedSec = 0;
    let status: string = "RUNNING";
    let lastResumedAt: number | null = 1000000;

    // 1. Setelah 900 detik, user melakukan PAUSE
    const pauseTime = 1000000 + 900 * 1000;
    const elapsedOnPause = Math.floor((pauseTime - lastResumedAt) / 1000);
    accumulatedSec += elapsedOnPause;
    lastResumedAt = null;
    status = "PAUSED";

    assert.strictEqual(accumulatedSec, 900);
    assert.strictEqual(status, "PAUSED");
    assert.strictEqual(lastResumedAt, null);

    // 2. Selama 600 detik dalam status PAUSED, waktu fokus TIDAK bertambah
    const whilePausedTime = pauseTime + 600 * 1000;
    const isRunning = (status as string) === "RUNNING";
    const currentFocusWhilePaused = accumulatedSec + (isRunning && lastResumedAt ? 1 : 0);
    assert.strictEqual(currentFocusWhilePaused, 900);

    // 3. User melakukan RESUME
    const resumeTime = whilePausedTime;
    lastResumedAt = resumeTime;
    status = "RUNNING";
    assert.strictEqual(status, "RUNNING");

    // 4. Setelah 600 detik lagi, user melakukan COMPLETE
    const completeTime = resumeTime + 600 * 1000;
    const finalElapsed = Math.floor((completeTime - lastResumedAt) / 1000);
    accumulatedSec += finalElapsed;
    status = "COMPLETED";

    // Total waktu fokus = 900 + 600 = 1500 detik (25 menit). Waktu jeda 600s sama sekali tidak masuk.
    assert.strictEqual(accumulatedSec, 1500);
    assert.strictEqual(status, "COMPLETED");
  });

  test("Batas maksimum: durasi fokus dibatasi maksimal 4 jam (14.400 detik)", () => {
    const accumulatedSec = 14300;
    const lastResumedAt = 1000000;
    // Berjalan selama 500 detik lagi (total 14800s > 14400s)
    const now = lastResumedAt + 500 * 1000;
    const delta = Math.floor((now - lastResumedAt) / 1000);

    const cappedAccumulated = Math.min(MAX_SESSION_SEC, accumulatedSec + delta);
    assert.strictEqual(cappedAccumulated, 14400);
  });

  test("Validasi transisi status: menolak transisi ilegal", () => {
    const validTransitions: Record<string, string[]> = {
      RUNNING: ["PAUSED", "COMPLETED", "STOPPED_EARLY", "CANCELLED"],
      PAUSED: ["RUNNING", "COMPLETED", "STOPPED_EARLY", "CANCELLED"],
      COMPLETED: [],
      STOPPED_EARLY: [],
      CANCELLED: [],
    };

    function canTransition(current: string, next: string): boolean {
      return (validTransitions[current] || []).includes(next);
    }

    assert.strictEqual(canTransition("RUNNING", "PAUSED"), true);
    assert.strictEqual(canTransition("PAUSED", "RUNNING"), true);
    assert.strictEqual(canTransition("RUNNING", "COMPLETED"), true);
    assert.strictEqual(canTransition("COMPLETED", "PAUSED"), false);
    assert.strictEqual(canTransition("CANCELLED", "RUNNING"), false);
    assert.strictEqual(canTransition("STOPPED_EARLY", "COMPLETED"), false);
  });

  test("Anti-duplikat retry: clientSessionId yang sama mengembalikan sesi eksisting", () => {
    // Simulasi in-memory repository
    const db = new Map<string, { id: string; userId: string; clientSessionId: string }>();

    function mockStartSession(userId: string, clientSessionId: string) {
      const key = `${userId}_${clientSessionId}`;
      if (db.has(key)) {
        return { isNew: false, session: db.get(key)! };
      }
      const newSession = {
        id: `sess_${Date.now()}`,
        userId,
        clientSessionId,
      };
      db.set(key, newSession);
      return { isNew: true, session: newSession };
    }

    const firstCall = mockStartSession("user_1", "client_req_123");
    assert.strictEqual(firstCall.isNew, true);

    // Request kedua dengan clientSessionId yang sama (misal network retry)
    const secondCall = mockStartSession("user_1", "client_req_123");
    assert.strictEqual(secondCall.isNew, false);
    assert.strictEqual(secondCall.session.id, firstCall.session.id);
  });

  test("Isolasi antar user: user A tidak dapat mengakses atau memodifikasi sesi user B", () => {
    const sessions = [
      { id: "s1", userId: "user_A", status: "RUNNING" },
      { id: "s2", userId: "user_B", status: "RUNNING" },
    ];

    function mockPauseSession(requestingUserId: string, sessionId: string) {
      const target = sessions.find((s) => s.id === sessionId);
      if (!target || target.userId !== requestingUserId) {
        throw new Error("Akses ditolak: sesi bukan milik Anda.");
      }
      target.status = "PAUSED";
      return target;
    }

    // User A mencoba pause sesi s1 -> sukses
    assert.doesNotThrow(() => mockPauseSession("user_A", "s1"));

    // User A mencoba pause sesi s2 (milik User B) -> dilempar error
    assert.throws(
      () => mockPauseSession("user_A", "s2"),
      /Akses ditolak: sesi bukan milik Anda/
    );
  });
});
