import { test, describe } from "node:test";
import assert from "node:assert";
import {
  buildHeatmapWeeksGrid,
  getHourHeaderSpecs,
} from "../src/lib/analytics/heatmap-layout";

describe("Analytics Heatmap & Hour Matrix Label Alignment", () => {
  test("1. Pola Waktu Belajar: 12 label jam (00:00..22:00) memetakan tepat ke kolom jam 0..22 dalam grid 24 kolom", () => {
    const specs = getHourHeaderSpecs();

    assert.strictEqual(specs.length, 12, "Harus ada 12 label untuk jam genap 00:00..22:00");

    assert.deepStrictEqual(specs[0], {
      hour: 0,
      label: "00:00",
      colIndex: 0,
      gridColumnStart: 2, // Col 1 adalah label hari (Sen..Min)
      colSpan: 2,
    });

    assert.deepStrictEqual(specs[specs.length - 1], {
      hour: 22,
      label: "22:00",
      colIndex: 22,
      gridColumnStart: 24, // Col 24 = jam 22, Col 25 = jam 23
      colSpan: 2,
    });

    // Pastikan setiap label jam berada di colIndex === hour dan tidak melampaui 24 kolom jam
    for (const s of specs) {
      assert.strictEqual(s.colIndex, s.hour);
      assert.strictEqual(s.gridColumnStart, s.hour + 2);
      assert.ok(s.colIndex + s.colSpan <= 24, `Label ${s.label} tidak boleh melewati kolom jam 23`);
    }
  });

  test("2. Heatmap Tahunan (CALENDAR_YEAR): setiap label bulan memetakan ke colIndex minggu Senin pertama di bulan tersebut", () => {
    const { weeks, monthLabels } = buildHeatmapWeeksGrid({
      period: "CALENDAR_YEAR",
      todayKey: "2026-11-25",
      currentYear: 2026,
      dataMap: {
        "2026-10-15": { minutes: 45, sessionCount: 2 },
      },
    });

    assert.ok(weeks.length >= 52 && weeks.length <= 54, `Jumlah minggu wajar 52-54, dapat ${weeks.length}`);
    assert.strictEqual(monthLabels[0].label, "Jan");
    assert.strictEqual(monthLabels[0].colIndex, 0);

    // Pastikan semua colIndex valid (0 <= colIndex < weeks.length) dan berurutan naik
    for (let i = 0; i < monthLabels.length; i++) {
      const m = monthLabels[i];
      assert.ok(m.colIndex >= 0 && m.colIndex < weeks.length, `colIndex ${m.colIndex} untuk ${m.label} di luar batas`);
      if (i > 0) {
        assert.ok(m.colIndex > monthLabels[i - 1].colIndex, "colIndex label bulan harus monoton naik");
      }

      // Tanggal Senin (hari pertama di kolom minggu tersebut) harus cocok dengan bulan labelnya
      // (kecuali colIndex 0 pada CALENDAR_YEAR jika Senin jatuh di Des tahun sebelumnya)
      const mondayKey = weeks[m.colIndex].days[0].dateKey;
      const mondayYear = parseInt(mondayKey.slice(0, 4), 10);
      if (!(m.colIndex === 0 && mondayYear < 2026)) {
        const expectedMonthIdx = parseInt(mondayKey.slice(5, 7), 10) - 1;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        assert.strictEqual(
          m.label,
          monthNames[expectedMonthIdx],
          `Label di colIndex ${m.colIndex} (${mondayKey}) harus ${monthNames[expectedMonthIdx]}, bukan ${m.label}`
        );
      }
    }

    // Pastikan tidak ada label bulan yang melampaui kolom terakhir
    const lastLabel = monthLabels[monthLabels.length - 1];
    assert.ok(
      lastLabel.colIndex < weeks.length,
      `Label terakhir (${lastLabel.label} @ ${lastLabel.colIndex}) tidak boleh melewati kolom terakhir (${weeks.length - 1})`
    );
  });

  test("3. Heatmap Tahunan (ROLLING_12_MONTHS): tanggal terakhir minggu terakhir mencakup todayKey dan label bulan berada di dalam grid", () => {
    const todayKey = "2026-11-25";
    const { weeks, monthLabels } = buildHeatmapWeeksGrid({
      period: "ROLLING_12_MONTHS",
      todayKey,
      currentYear: 2026,
      dataMap: {},
    });

    const lastWeek = weeks[weeks.length - 1];
    const hasToday = lastWeek.days.some((d) => d.dateKey === todayKey);
    assert.strictEqual(hasToday, true, "Minggu terakhir harus memuat todayKey");

    for (const m of monthLabels) {
      assert.ok(m.colIndex >= 0 && m.colIndex < weeks.length);
      assert.ok(m.colSpan >= 1);
      assert.ok(m.colIndex + m.colSpan <= weeks.length);
    }
  });
});
