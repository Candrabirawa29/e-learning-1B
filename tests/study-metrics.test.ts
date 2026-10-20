import { test, describe } from "node:test";
import assert from "node:assert";
import {
  calculateTolerantStreak,
  calculateWeeklyConsistencyScore,
  calculateStudyTrend,
  calculateMedianWeeklyMinutes,
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

  test("Poin 3: Gating 7 hari sejak sesi pertama menampilkan 'Mengumpulkan data (hari ke-N dari 7)'", () => {
    // Sesi baru berjalan 3 hari sejak sesi pertama
    const resDay3 = calculateWeeklyConsistencyScore({
      weeklyActualMinutes: 150,
      weeklyTargetMinutes: 600,
      activeDaysInWeek: 2,
      startedSessionsCount: 4,
      completedSessionsCount: 4,
      daysSinceFirstSession: 3,
      daysElapsedInWeek: 3,
      activeDaysTarget: 5,
    });

    assert.strictEqual(resDay3.score, null);
    assert.strictEqual(resDay3.isCollectingData, true);
    assert.strictEqual(resDay3.collectingDayNumber, 3);
    assert.strictEqual(resDay3.explanation, "Mengumpulkan data (hari ke-3 dari 7)");

    // Setelah 7 hari, skor konsistensi tampil
    const resDay7 = calculateWeeklyConsistencyScore({
      weeklyActualMinutes: 600,
      weeklyTargetMinutes: 600,
      activeDaysInWeek: 5,
      startedSessionsCount: 8,
      completedSessionsCount: 8,
      daysSinceFirstSession: 7,
      daysElapsedInWeek: 7,
      activeDaysTarget: 5,
    });

    assert.strictEqual(resDay7.isCollectingData, false);
    assert.strictEqual(resDay7.score, 100);
  });

  test("Poin 3: Prorata minggu berjalan disesuaikan dengan hari yang sudah berlalu (hari berlalu / 7)", () => {
    // Hari Rabu (hari ke-3 sejak Senin)
    // Target mingguan 700m -> Target prorata = 700 * (3/7) = 300m
    // Target hari aktif 5 hari -> Target prorata = round(5 * (3/7)) = 2 hari
    const res = calculateWeeklyConsistencyScore({
      weeklyActualMinutes: 300, // Mencapai 100% dari target prorata 300m -> 50 poin
      weeklyTargetMinutes: 700,
      activeDaysInWeek: 2, // 2 dari 2 hari prorata -> 30 poin
      startedSessionsCount: 4,
      completedSessionsCount: 4, // 4 dari 4 -> 20 poin
      daysSinceFirstSession: 14, // > 7 hari
      daysElapsedInWeek: 3, // Rabu
      activeDaysTarget: 5,
    });

    assert.strictEqual(res.expectedTargetMinutes, 300);
    assert.strictEqual(res.expectedActiveDays, 2);
    assert.strictEqual(res.targetPercent, 100);
    assert.strictEqual(res.targetComponent, 50);
    assert.strictEqual(res.activeDaysComponent, 30);
    assert.strictEqual(res.completionRateComponent, 20);
    assert.strictEqual(res.score, 100);
  });

  test("Poin 3: Breakdown komponen dan skor minggu lalu", () => {
    // Target: 9% pencapaian -> 5/50 poin
    // Hari aktif: 1 dari 5 -> 6/30 poin
    // Sesi: 10 dari 16 -> 13/20 poin
    const res = calculateWeeklyConsistencyScore({
      weeklyActualMinutes: 90,
      weeklyTargetMinutes: 1000,
      activeDaysInWeek: 1,
      startedSessionsCount: 16,
      completedSessionsCount: 10,
      daysSinceFirstSession: 10,
      daysElapsedInWeek: 7,
      activeDaysTarget: 5,
      lastWeekScore: 78,
    });

    assert.strictEqual(res.targetPercent, 9);
    assert.strictEqual(res.targetComponent, 5); // 0.09 * 50 = 4.5 -> round 5
    assert.strictEqual(res.activeDaysComponent, 6); // 1/5 * 30 = 6
    assert.strictEqual(res.completionRateComponent, 13); // 10/16 * 20 = 12.5 -> round 13
    assert.strictEqual(res.score, 24);
    assert.strictEqual(res.lastWeekScore, 78);
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
  test("Poin 4: Label 'baru N dari 3 minggu' bila data kurang dari 3 minggu tapi tetap simpan weeklyBars", () => {
    const weeklyBars = [
      { weekLabel: "M-3", minutes: 0 },
      { weekLabel: "M-2", minutes: 0 },
      { weekLabel: "M-1", minutes: 120 },
      { weekLabel: "Minggu ini", minutes: 200 },
    ];
    const res = calculateStudyTrend(200, [120], 1, weeklyBars);
    assert.strictEqual(res.direction, "INSUFFICIENT_DATA");
    assert.strictEqual(res.label, "baru 1 dari 3 minggu");
    assert.deepStrictEqual(res.weeklyBars, weeklyBars);

    const res2 = calculateStudyTrend(200, [120, 150], 2, weeklyBars);
    assert.strictEqual(res2.direction, "INSUFFICIENT_DATA");
    assert.strictEqual(res2.label, "baru 2 dari 3 minggu");
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

describe("Median Weekly Target Recommendation", () => {
  test("Poin 7: Mengembalikan null jika data kurang dari 3 minggu", () => {
    assert.strictEqual(calculateMedianWeeklyMinutes([]), null);
    assert.strictEqual(calculateMedianWeeklyMinutes([300]), null);
    assert.strictEqual(calculateMedianWeeklyMinutes([300, 450]), null);
  });

  test("Poin 7: Menghitung median untuk data ganjil (>= 3 minggu)", () => {
    // [120, 300, 240] -> terurut: [120, 240, 300] -> median 240
    assert.strictEqual(calculateMedianWeeklyMinutes([120, 300, 240]), 240);
  });

  test("Poin 7: Menghitung median untuk data genap (>= 4 minggu)", () => {
    // [100, 400, 200, 300] -> terurut: [100, 200, 300, 400] -> median (200 + 300) / 2 = 250
    assert.strictEqual(calculateMedianWeeklyMinutes([100, 400, 200, 300]), 250);
  });
});
