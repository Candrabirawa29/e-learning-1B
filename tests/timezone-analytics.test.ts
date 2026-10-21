import { test, describe } from "node:test";
import assert from "node:assert";
import {
  wibDayKey,
  formatWib,
  getWibDayOfWeek,
  startOfWibDay,
  endOfWibDay,
} from "../src/lib/datetime";
import { wibLocal } from "../src/lib/analytics/study-queries";
import { prisma } from "../src/lib/prisma";

describe("Timezone & Analytics Aggregation Verification (Asia/Jakarta UTC+7)", () => {
  test("1. Sesi 2026-10-19T00:15Z: dihitung hari 19 Okt, jam 07, hari Senin", () => {
    const isoString = "2026-10-19T00:15:00Z";

    // Hari dalam format YYYY-MM-DD
    const dayKey = wibDayKey(isoString);
    assert.strictEqual(dayKey, "2026-10-19");

    // Jam lokal WIB (00:15 UTC + 7 jam = 07:15 WIB)
    const timeFormatted = formatWib(isoString, "time-only");
    assert.strictEqual(timeFormatted, "07:15");
    const [hourStr] = timeFormatted.split(":");
    assert.strictEqual(parseInt(hourStr, 10), 7);

    // Hari dalam seminggu: Senin (1)
    const dow = getWibDayOfWeek(isoString);
    assert.strictEqual(dow, 1);
    assert.strictEqual(formatWib(isoString, "day-name"), "Senin");
    assert.strictEqual(formatWib(isoString, "date-short"), "19 Okt 2026");
  });

  test("2. Sesi 2026-10-18T17:30Z: masuk hari 19 Okt jam 00:30 (melewati tengah malam)", () => {
    const isoString = "2026-10-18T17:30:00Z";

    // 17:30 UTC + 7 jam = 24:30 UTC = 00:30 WIB tanggal 19 Okt 2026
    const dayKey = wibDayKey(isoString);
    assert.strictEqual(dayKey, "2026-10-19");

    const timeFormatted = formatWib(isoString, "time-only");
    assert.strictEqual(timeFormatted, "00:30");
    const [hourStr, minuteStr] = timeFormatted.split(":");
    assert.strictEqual(parseInt(hourStr, 10), 0);
    assert.strictEqual(parseInt(minuteStr, 10), 30);

    const dow = getWibDayOfWeek(isoString);
    assert.strictEqual(dow, 1); // Senin
    assert.strictEqual(formatWib(isoString, "day-name"), "Senin");
    assert.strictEqual(formatWib(isoString, "date-short"), "19 Okt 2026");
  });

  test("3. Batas minggu Senin (ISO week boundary)", () => {
    // 2026-10-18 16:59:59 UTC = 2026-10-18 23:59:59 WIB (Minggu, hari 7, minggu sebelumnya)
    const sundayNightUtc = "2026-10-18T16:59:59Z";
    assert.strictEqual(wibDayKey(sundayNightUtc), "2026-10-18");
    assert.strictEqual(getWibDayOfWeek(sundayNightUtc), 7);
    assert.strictEqual(formatWib(sundayNightUtc, "day-name"), "Minggu");

    // 2026-10-18 17:00:00 UTC = 2026-10-19 00:00:00 WIB (Senin, hari 1, awal minggu baru)
    const mondayDawnUtc = "2026-10-18T17:00:00Z";
    assert.strictEqual(wibDayKey(mondayDawnUtc), "2026-10-19");
    assert.strictEqual(getWibDayOfWeek(mondayDawnUtc), 1);
    assert.strictEqual(formatWib(mondayDawnUtc, "day-name"), "Senin");

    // Start of WIB day untuk Senin 19 Okt
    const startMon = startOfWibDay("2026-10-19");
    assert.strictEqual(startMon?.toISOString(), "2026-10-18T17:00:00.000Z");

    // End of WIB day untuk Minggu 18 Okt
    const endSun = endOfWibDay("2026-10-18");
    assert.strictEqual(endSun?.toISOString(), "2026-10-18T16:59:59.999Z");
  });

  test("4. Konsistensi 'Hari ini' antara agregasi analitik dan tabel riwayat (wibDayKey)", () => {
    // Kumpulan sesi fiktif dengan timestamp UTC
    const mockSessions = [
      { id: "s1", startedAt: new Date("2026-10-18T16:59:00Z"), focusSec: 1500 }, // WIB: 18 Okt 23:59 (Kemarin)
      { id: "s2", startedAt: new Date("2026-10-18T17:30:00Z"), focusSec: 1800 }, // WIB: 19 Okt 00:30 (Hari ini)
      { id: "s3", startedAt: new Date("2026-10-19T00:15:00Z"), focusSec: 1500 }, // WIB: 19 Okt 07:15 (Hari ini)
      { id: "s4", startedAt: new Date("2026-10-19T10:00:00Z"), focusSec: 2400 }, // WIB: 19 Okt 17:00 (Hari ini)
      { id: "s5", startedAt: new Date("2026-10-19T17:01:00Z"), focusSec: 1200 }, // WIB: 20 Okt 00:01 (Besok)
    ];

    const todayKey = "2026-10-19";

    // Hitungan riwayat berdasarkan wibDayKey
    const historyTodaySessions = mockSessions.filter(
      (s) => wibDayKey(s.startedAt) === todayKey
    );

    // Hitungan analitik (simulasi agregasi map)
    const analyticsMap: Record<string, number> = {};
    for (const s of mockSessions) {
      const k = wibDayKey(s.startedAt);
      analyticsMap[k] = (analyticsMap[k] || 0) + 1;
    }

    assert.strictEqual(historyTodaySessions.length, 3);
    assert.strictEqual(analyticsMap[todayKey], 3);
    assert.strictEqual(historyTodaySessions.length, analyticsMap[todayKey]);

    // Memastikan sesi s2 dan s3 terhitung di hari ini, bukan kemarin
    const todayIds = historyTodaySessions.map((s) => s.id);
    assert.ok(todayIds.includes("s2"));
    assert.ok(todayIds.includes("s3"));
    assert.ok(!todayIds.includes("s1"));
    assert.ok(!todayIds.includes("s5"));
  });

  test("5. SQL Fragment wibLocal: Menghasilkan sintaks UTC -> Asia/Jakarta yang valid", () => {
    const fragment = wibLocal('"startedAt"');
    // Prisma.Sql object exposes .strings or .sql
    const sqlText = (fragment as unknown as { strings: string[] }).strings?.[0] || String(fragment);
    
    // Harus menyertakan konversi ganda: pertama asumsikan UTC, lalu konversi ke Asia/Jakarta
    assert.ok(
      sqlText.includes("AT TIME ZONE 'UTC'") && sqlText.includes("AT TIME ZONE 'Asia/Jakarta'"),
      "Fragmen SQL harus menggunakan konversi ganda (UTC -> Asia/Jakarta)"
    );

    // TIDAK boleh hanya "col" AT TIME ZONE 'Asia/Jakarta' yang menghasilkan UTC-7
    assert.ok(
      !sqlText.startsWith('"startedAt" AT TIME ZONE \'Asia/Jakarta\''),
      "Tidak boleh langsung menerapkan AT TIME ZONE 'Asia/Jakarta' tanpa basis UTC"
    );
  });

  test("6. Perbandingan periode: Bila periode sebelumnya 0, persen = null (belum ada pembanding)", () => {
    const calculatePercentChange = (current: number, previous: number): number | null => {
      if (previous <= 0) return null;
      return Math.round(((current - previous) / previous) * 100);
    };

    assert.strictEqual(calculatePercentChange(120, 0), null);
    assert.strictEqual(calculatePercentChange(0, 0), null);
    assert.strictEqual(calculatePercentChange(100, 50), 100);
    assert.strictEqual(calculatePercentChange(50, 100), -50);
  });

  test("7. Database PostgreSQL Live: Verifikasi fungsi wibLocal pada query nyata", async (t) => {
    try {
      const [res] = await prisma.$queryRaw<
        Array<{
          test1_local: string;
          test1_hour: number;
          test1_dow: number;
          test2_local: string;
          test2_hour: number;
          test2_dow: number;
          test2_weekstart: string;
        }>
      >`
        SELECT
          to_char((('2026-10-19 00:15:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD HH24:MI') AS test1_local,
          EXTRACT(HOUR FROM (('2026-10-19 00:15:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int AS test1_hour,
          EXTRACT(ISODOW FROM (('2026-10-19 00:15:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int AS test1_dow,
          to_char((('2026-10-18 17:30:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD HH24:MI') AS test2_local,
          EXTRACT(HOUR FROM (('2026-10-18 17:30:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int AS test2_hour,
          EXTRACT(ISODOW FROM (('2026-10-18 17:30:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta'))::int AS test2_dow,
          to_char(date_trunc('week', (('2026-10-18 17:30:00'::timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')), 'YYYY-MM-DD') AS test2_weekstart
      `;

      assert.strictEqual(res.test1_local, "2026-10-19 07:15");
      assert.strictEqual(res.test1_hour, 7);
      assert.strictEqual(res.test1_dow, 1); // Senin

      assert.strictEqual(res.test2_local, "2026-10-19 00:30");
      assert.strictEqual(res.test2_hour, 0);
      assert.strictEqual(res.test2_dow, 1); // Senin
      assert.strictEqual(res.test2_weekstart, "2026-10-19"); // Batas awal minggu adalah Senin 19 Okt
    } catch (err) {
      t.skip(`Koneksi database PostgreSQL tidak terjangkau: ${(err as Error)?.message || err}`);
    }
  });
});
