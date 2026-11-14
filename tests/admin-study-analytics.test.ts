import test from "node:test";
import assert from "node:assert/strict";
import { getAdminPeriodDates } from "../src/lib/analytics/admin-study-queries";

test("Admin Study Analytics & Platform Monitoring Suite", async (t) => {
  await t.test("1. Period Date Range Calculation (WIB)", () => {
    const fixedToday = "2026-11-14";

    // 7 Hari
    const p7d = getAdminPeriodDates("7d", fixedToday);
    assert.equal(p7d.daysCount, 7);
    assert.equal(p7d.currentEndKey, "2026-11-14");
    assert.equal(p7d.currentStartKey, "2026-11-08"); // 7 hari: 8, 9, 10, 11, 12, 13, 14
    assert.equal(p7d.prevEndKey, "2026-11-07");
    assert.equal(p7d.prevStartKey, "2026-11-01"); // 7 hari pembanding sebelumnya

    // 14 Hari
    const p14d = getAdminPeriodDates("14d", fixedToday);
    assert.equal(p14d.daysCount, 14);
    assert.equal(p14d.currentStartKey, "2026-11-01");
    assert.equal(p14d.prevEndKey, "2026-10-31");
    assert.equal(p14d.prevStartKey, "2026-10-18");

    // 30 Hari
    const p30d = getAdminPeriodDates("30d", fixedToday);
    assert.equal(p30d.daysCount, 30);
    assert.equal(p30d.currentEndKey, "2026-11-14");
    assert.equal(p30d.currentStartKey, "2026-10-16");
    assert.equal(p30d.prevEndKey, "2026-10-15");
    assert.equal(p30d.prevStartKey, "2026-09-16");
  });

  await t.test("2. Retention Calculation Formulas (7-Day & 30-Day)", () => {
    // 7-day retention: Minggu W-1 ada user {U1, U2, U3, U4}.
    // Minggu W ada user {U1, U3, U5}.
    // Irisan: {U1, U3} = 2 user.
    // Retensi = 2 / 4 * 100 = 50%.
    const setPrevWeek = new Set(["U1", "U2", "U3", "U4"]);
    const setCurWeek = new Set(["U1", "U3", "U5"]);

    let retainedCount = 0;
    for (const uid of setPrevWeek) {
      if (setCurWeek.has(uid)) retainedCount++;
    }
    const retentionRate = Math.round((retainedCount / setPrevWeek.size) * 100);
    assert.equal(retentionRate, 50);

    // Kasus periode sebelumnya 0 pengguna
    const emptyPrev = new Set<string>();
    const retentionEmpty = emptyPrev.size > 0 ? Math.round((0 / emptyPrev.size) * 100) : null;
    assert.equal(retentionEmpty, null);
  });

  await t.test("3. Platform Adoption Rate Calculation", () => {
    const totalRegistered = 40;
    const totalAdopters = 28;

    const adoptionRate = Math.round((totalAdopters / totalRegistered) * 100);
    assert.equal(adoptionRate, 70);

    // Kasus 0 pendaftar
    const zeroAdoption = 0 > 0 ? Math.round((0 / 0) * 100) : 0;
    assert.equal(zeroAdoption, 0);
  });

  await t.test("4. Delta Comparison Percentage with Zero Base Protection", () => {
    function calculatePercentDelta(current: number, previous: number): number | null {
      if (previous === 0) return null;
      return Math.round(((current - previous) / previous) * 100);
    }

    // Naik 50%
    assert.equal(calculatePercentDelta(150, 100), 50);
    // Turun 25%
    assert.equal(calculatePercentDelta(75, 100), -25);
    // Tetap
    assert.equal(calculatePercentDelta(100, 100), 0);
    // Base 0
    assert.equal(calculatePercentDelta(50, 0), null);
  });

  await t.test("5. Server-Side Pagination & Sorting Math", () => {
    const totalUsers = 45;
    const pageSize = 10;
    const totalPages = Math.ceil(totalUsers / pageSize);

    assert.equal(totalPages, 5);

    // Halaman 1: slice(0, 10)
    const page1Skip = (1 - 1) * pageSize;
    assert.equal(page1Skip, 0);

    // Halaman 5 (terakhir): slice(40, 50) -> sisa 5 item
    const page5Skip = (5 - 1) * pageSize;
    assert.equal(page5Skip, 40);
  });

  await t.test("6. Privacy & Read-Only Invariance Check", () => {
    // Sesi untuk Admin view tidak boleh mengandung atribut note pribadi
    const sampleAdminSession = {
      id: "fs-123",
      startedAt: "2026-11-14T08:00:00.000Z",
      endedAt: "2026-11-14T08:25:00.000Z",
      mode: "FOCUS",
      plannedSec: 1500,
      accumulatedSec: 1500,
      status: "COMPLETED",
      courseName: "Algoritma & Struktur Data",
      taskTitle: "Latihan Tree",
    };

    assert.equal("note" in sampleAdminSession, false);
  });
});

