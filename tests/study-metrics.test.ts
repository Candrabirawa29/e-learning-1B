import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateTolerantStreak,
  calculateWeeklyConsistencyScore,
  calculateStudyTrend,
} from "../src/lib/analytics/study-metrics";

describe("Tolerant Streak Algorithm", () => {
  const minActive = 25; // 25 menit

  test("Kasus 1: Hari ini kosong tidak memutus streak", () => {
    // Siswa belajar 30m setiap hari selama 4 hari sebelum hari ini.
    // Hari ini (2026-10-18) belum belajar (0 menit).
    const today = "2026-10-18";
    const data: Record<string, number> = {
      "2026-10-14": 45,
      "2026-10-15": 30,
      "2026-10-16": 60,
      "2026-10-17": 50,
      "2026-10-18": 0, // hari ini belum ada sesi
    };

    const res = calculateTolerantStreak(data, minActive, today);

    assert.strictEqual(res.isTodayCompleted, false);
    // Streak tetap hidup 4 hari dari 14 sampai 17 Okt
    assert.strictEqual(res.currentStreakDays, 4);
    assert.strictEqual(res.activeDaysCount, 4);
  });

  test("Kasus 2: 1 hari kosong dalam jendela 7 hari tidak memutus streak", () => {
    // Dalam 7 hari terakhir: 1 hari istirahat, 6 hari belajar
    // D-6, D-5, D-4 (istirahat), D-3, D-2, D-1, Today (belajar)
    const today = "2026-10-18";
    const data: Record<string, number> = {
      "2026-10-12": 30,
      "2026-10-13": 30,
      "2026-10-14": 0, // 1 hari istirahat yang ditoleransi
      "2026-10-15": 30,
      "2026-10-16": 30,
      "2026-10-17": 30,
      "2026-10-18": 30,
    };

    const res = calculateTolerantStreak(data, minActive, today);

    assert.strictEqual(res.isTodayCompleted, true);
    // Total hari dalam streak adalah 7 hari (termasuk 1 hari istirahat toleran)
    assert.strictEqual(res.currentStreakDays, 7);
    assert.strictEqual(res.activeDaysCount, 6);
  });

  test("Kasus 3: 2 hari kosong dalam jendela 7 hari memutus streak", () => {
    // Jika ada 2 hari kosong dalam 7 hari:
    // D-6 (belajar), D-5 (kosong), D-4 (belajar), D-3 (kosong), D-2 (belajar), D-1 (belajar), Today (belajar)
    // Terdapat 2 hari kosong: D-5 dan D-3 -> streak terputus saat bertemu hari kosong kedua
    const today = "2026-10-18";
    const data: Record<string, number> = {
      "2026-10-10": 30,
      "2026-10-11": 30,
      "2026-10-12": 30,
      "2026-10-13": 0, // kosong 1
      "2026-10-14": 30,
      "2026-10-15": 0, // kosong 2 (dalam 7 hari dari 18 Okt)
      "2026-10-16": 30,
      "2026-10-17": 30,
      "2026-10-18": 30,
    };

    const res = calculateTolerantStreak(data, minActive, today);

    // Hari 18 (aktif), 17 (aktif), 16 (aktif), 15 (kosong 1) -> masih aman
    // Hari 14 (aktif)
    // Hari 13 (kosong 2) -> putus di sini!
    // Streak berjalan dari 18, 17, 16, 15, 14 = 5 hari
    assert.strictEqual(res.currentStreakDays, 5);
  });

  test("Kasus 4: Lintas pergantian minggu (Jumat - Selasa)", () => {
    // 2026-10-16 (Jumat) s/d 2026-10-20 (Selasa)
    const today = "2026-10-20"; // Selasa
    const data: Record<string, number> = {
      "2026-10-16": 50, // Jumat
      "2026-10-17": 40, // Sabtu
      "2026-10-18": 60, // Minggu
      "2026-10-19": 35, // Senin (Minggu baru)
      "2026-10-20": 45, // Selasa
    };

    const res = calculateTolerantStreak(data, minActive, today);

    assert.strictEqual(res.currentStreakDays, 5);
    assert.strictEqual(res.activeDaysCount, 5);
  });
});

describe("Weekly Consistency Score", () => {
  test("Menolak hitung jika data kurang dari 1 minggu penuh", () => {
    const res = calculateWeeklyConsistencyScore({
      weeklyActualMinutes: 300,
      weeklyTargetMinutes: 600,
      activeDaysInWeek: 3,
      startedSessionsCount: 5,
      completedSessionsCount: 5,
      hasFullWeekData: false,
    });

    assert.strictEqual(res.score, null);
    assert.match(res.explanation, /kurang dari 1 minggu penuh/);
  });

  test("Menghitung skor sempurna (100) dan menolak bonus lembur", () => {
    const res = calculateWeeklyConsistencyScore({
      weeklyActualMinutes: 900, // Melebihi target 600m (150%)
      weeklyTargetMinutes: 600,
      activeDaysInWeek: 6, // Melebihi 5 hari
      startedSessionsCount: 10,
      completedSessionsCount: 10,
      hasFullWeekData: true,
    });

    // 50 (target maks 50) + 30 (hari aktif maks 30) + 20 (rasio selesai 20) = 100
    assert.strictEqual(res.score, 100);
    assert.strictEqual(res.targetComponent, 50);
    assert.strictEqual(res.activeDaysComponent, 30);
    assert.strictEqual(res.completionRateComponent, 20);
  });
});

describe("4-Week Study Trend Analysis", () => {
  test("Mengembalikan INSUFFICIENT_DATA bila data kurang dari 3 minggu", () => {
    const res = calculateStudyTrend(300, [280, 290], 2);
    assert.strictEqual(res.direction, "INSUFFICIENT_DATA");
  });

  test("Mendeteksi tren stabil dalam pita +-15%", () => {
    // Past average: 300m, this week: 320m (+6.6% -> stabil)
    const res = calculateStudyTrend(320, [300, 310, 290, 300], 4);
    assert.strictEqual(res.direction, "STABLE");
  });

  test("Mendeteksi tren meningkat di atas +15%", () => {
    // Past average: 300m, this week: 400m (+33% -> UP)
    const res = calculateStudyTrend(400, [300, 300, 300, 300], 4);
    assert.strictEqual(res.direction, "UP");
  });
});
