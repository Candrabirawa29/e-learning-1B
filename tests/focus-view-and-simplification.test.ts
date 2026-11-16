import { test, describe } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  getFocusView,
  resolveFocusStateKind,
  FocusStateKind,
  FocusViewStateInput,
} from "../src/lib/focus/session-logic";

describe("Focus View & Screen Simplification Suite", () => {
  const allStates: FocusStateKind[] = [
    "READY",
    "RUNNING",
    "PAUSED",
    "TARGET_REACHED",
    "BREAK",
    "BREAK_OVERDUE",
  ];

  test("1. Untuk setiap keadaan getFocusView mengembalikan tepat satu tombol utama dan tidak ada dua aksi yang sama", () => {
    for (const kind of allStates) {
      const input: FocusViewStateInput = {
        kind,
        focusSec: 1500,
        plannedSec: 1500,
        remainingSec: 0,
        overdueSec: 301,
      };

      const view = getFocusView(input);

      // Tepat satu tombol utama
      assert.ok(view.tombolUtama, `Keadaan ${kind} harus memiliki tombolUtama`);
      assert.strictEqual(
        typeof view.tombolUtama.action,
        "string",
        `Keadaan ${kind} tombolUtama.action harus berupa string`
      );
      assert.strictEqual(
        typeof view.tombolUtama.label,
        "string",
        `Keadaan ${kind} tombolUtama.label harus berupa string`
      );

      // Kumpulkan semua aksi dalam satu keadaan
      const actions = [
        view.tombolUtama.action,
        ...view.tombolSekunder.map((b) => b.action),
        ...view.menuLainnya.map((b) => b.action),
      ];

      // Tidak ada dua aksi yang sama di satu layar
      const uniqueActions = new Set(actions);
      assert.strictEqual(
        actions.length,
        uniqueActions.size,
        `Keadaan ${kind} tidak boleh memiliki dua aksi yang sama: ${actions.join(", ")}`
      );
    }
  });

  test("2. Pemetaan Keadaan Sesuai Spesifikasi", () => {
    // Siap: utama "Mulai"
    const readyView = getFocusView({ kind: "READY", plannedSec: 1500 });
    assert.strictEqual(readyView.tombolUtama.label, "Mulai");
    assert.strictEqual(readyView.tombolUtama.action, "START");
    assert.strictEqual(readyView.tombolSekunder.length, 0);
    assert.strictEqual(readyView.menuLainnya.length, 0);
    assert.strictEqual(readyView.teksTengah, "25:00");

    // Berjalan: utama "Jeda"; sekunder "Akhiri"; menu: "Buang sesi"
    const runningView = getFocusView({ kind: "RUNNING", focusSec: 600, remainingSec: 900 });
    assert.strictEqual(runningView.tombolUtama.label, "Jeda");
    assert.strictEqual(runningView.tombolUtama.action, "PAUSE");
    assert.deepStrictEqual(runningView.tombolSekunder, [{ action: "END", label: "Akhiri" }]);
    assert.deepStrictEqual(runningView.menuLainnya, [{ action: "DISCARD", label: "Buang sesi" }]);

    // Dijeda: utama "Lanjut"; sekunder "Akhiri"; menu: "Buang sesi"
    const pausedView = getFocusView({ kind: "PAUSED", focusSec: 600, remainingSec: 900 });
    assert.strictEqual(pausedView.tombolUtama.label, "Lanjut");
    assert.strictEqual(pausedView.tombolUtama.action, "RESUME");
    assert.deepStrictEqual(pausedView.tombolSekunder, [{ action: "END", label: "Akhiri" }]);
    assert.deepStrictEqual(pausedView.menuLainnya, [{ action: "DISCARD", label: "Buang sesi" }]);

    // Target tercapai: utama "Mulai istirahat"; sekunder "Lanjut fokus +5 menit"; teks kecil "Selesai tanpa istirahat"
    const targetReachedView = getFocusView({
      kind: "TARGET_REACHED",
      focusSec: 1500,
      plannedSec: 1500,
      overdueSec: 301,
    });
    assert.strictEqual(targetReachedView.tombolUtama.label, "Mulai istirahat");
    assert.strictEqual(targetReachedView.tombolUtama.action, "START_BREAK");
    assert.deepStrictEqual(targetReachedView.tombolSekunder, [
      { action: "EXTEND", label: "Lanjut fokus +5 menit" },
    ]);
    assert.strictEqual(targetReachedView.teksKecil, "Selesai tanpa istirahat");

    // Istirahat: utama "Lewati istirahat"; sekunder "Jeda"
    const breakView = getFocusView({ kind: "BREAK", breakRemainingSec: 300 });
    assert.strictEqual(breakView.tombolUtama.label, "Lewati istirahat");
    assert.strictEqual(breakView.tombolUtama.action, "SKIP_BREAK");
    assert.deepStrictEqual(breakView.tombolSekunder, [{ action: "PAUSE_BREAK", label: "Jeda" }]);

    // Istirahat Dijeda: sekunder "Lanjut"
    const breakPausedView = getFocusView({
      kind: "BREAK",
      breakRemainingSec: 180,
      breakStatus: "PAUSED",
    });
    assert.deepStrictEqual(breakPausedView.tombolSekunder, [
      { action: "RESUME_BREAK", label: "Lanjut" },
    ]);

    // Istirahat habis: utama "Mulai fokus berikutnya"
    const breakOverdueView = getFocusView({ kind: "BREAK_OVERDUE" });
    assert.strictEqual(breakOverdueView.tombolUtama.label, "Mulai fokus berikutnya");
    assert.strictEqual(breakOverdueView.tombolUtama.action, "NEXT_CYCLE");
    assert.strictEqual(breakOverdueView.tombolSekunder.length, 0);
  });

  test("3. Teks tengah pada Target tercapai tidak memuat 'lewat' dan waktu sejak target hanya ada di teks kecil non-merah", () => {
    const targetView = getFocusView({
      kind: "TARGET_REACHED",
      focusSec: 1500,
      plannedSec: 1500,
      overdueSec: 301, // 5 menit 1 detik
    });

    // Teks tengah: "Target tercapai" dan durasi tercatat "25:00 tercatat"
    assert.strictEqual(targetView.teksTengah, "Target tercapai");
    assert.strictEqual(targetView.durasiTercatat, "25:00 tercatat");
    assert.doesNotMatch(
      targetView.teksTengah,
      /lewat/i,
      "Teks tengah tidak boleh memuat kata 'lewat'"
    );
    assert.doesNotMatch(
      targetView.teksTengah,
      /00:00/,
      "Teks tengah tidak boleh berupa hitung mundur 00:00"
    );

    // Waktu sejak target ditampilkan di teksOverdue sebagai satu baris netral di bawah lingkaran
    assert.ok(targetView.teksOverdue, "Harus menyediakan teksOverdue");
    assert.strictEqual(
      targetView.teksOverdue,
      "+05:01 sejak target, tidak dihitung sebagai fokus"
    );
    assert.doesNotMatch(
      targetView.teksOverdue,
      /dikunci di/i,
      "Teks tidak boleh memuat kalimat 'Akumulasi dikunci di ...'"
    );
  });

  test("4. Pemetaan identik dan getFocusView dipakai layar utama, PiP, dan widget mini", () => {
    const mainPath = path.join(process.cwd(), "src/components/focus/FocusTimerDisplay.tsx");
    const pipPath = path.join(process.cwd(), "src/components/focus/PictureInPicturePortal.tsx");
    const miniPath = path.join(process.cwd(), "src/components/focus/MiniFocusFloatingWidget.tsx");

    const mainContent = fs.readFileSync(mainPath, "utf-8");
    const pipContent = fs.readFileSync(pipPath, "utf-8");
    const miniContent = fs.readFileSync(miniPath, "utf-8");

    // Semua komponen wajib mengimpor dan memakai getFocusView
    assert.match(
      mainContent,
      /getFocusView\s*\(/,
      "FocusTimerDisplay harus menggunakan getFocusView"
    );
    assert.match(
      pipContent,
      /getFocusView\s*\(/,
      "PictureInPicturePortal harus menggunakan getFocusView"
    );
    assert.match(
      miniContent,
      /getFocusView\s*\(/,
      "MiniFocusFloatingWidget harus menggunakan getFocusView"
    );

    // Tidak ada 'lewat' dalam teks tengah Target tercapai di PiP maupun widget mini
    assert.doesNotMatch(
      mainContent,
      /Fokus Selesai!\s*🎉/,
      "Layar utama tidak boleh memuat judul kartu 'Fokus Selesai! 🎉'"
    );
    assert.doesNotMatch(
      mainContent,
      /Akumulasi dikunci di/,
      "Layar utama tidak boleh memuat kalimat 'Akumulasi dikunci di ...'"
    );
    assert.doesNotMatch(
      pipContent,
      /Waktu fokus terkunci/,
      "PiP tidak boleh memuat 'Waktu fokus terkunci • Tidak dihitung'"
    );

    // Warna merah (rose/destructive) hanya untuk error, tidak untuk target tercapai / overdue normal
    assert.doesNotMatch(
      mainContent,
      /isOverdue\s*\?\s*["']stroke-rose-500["']/,
      "Lingkaran progress tidak boleh merah pada waktu overdue"
    );
  });

  test("5. Toast hanya untuk error: tidak ada toast sukses saat transisi layar", () => {
    const contextPath = path.join(process.cwd(), "src/components/focus/FocusTimerContext.tsx");
    const contextContent = fs.readFileSync(contextPath, "utf-8");

    // Pastikan tidak ada toast.success atau toast.info pada fungsi-fungsi transisi
    assert.doesNotMatch(
      contextContent,
      /toast\.success\s*\(\s*["']Sesi fokus berhasil dimulai!["']\s*\)/,
      "Tidak boleh ada toast sukses saat mulai sesi"
    );
    assert.doesNotMatch(
      contextContent,
      /toast\.info\s*\(\s*["']Sesi fokus dijeda["']\s*\)/,
      "Tidak boleh ada toast info saat jeda sesi"
    );
    assert.doesNotMatch(
      contextContent,
      /toast\.success\s*\(\s*["']Sesi fokus dilanjutkan["']\s*\)/,
      "Tidak boleh ada toast sukses saat lanjut sesi"
    );
    assert.doesNotMatch(
      contextContent,
      /toast\.success\s*\(\s*["']Sesi fokus diperpanjang \+5 menit!["']\s*\)/,
      "Tidak boleh ada toast sukses saat perpanjang sesi"
    );
    assert.doesNotMatch(
      contextContent,
      /toast\.success\s*\(\s*["']Target tercapai! Sesi berhasil dicatat\.["']\s*\)/,
      "Tidak boleh ada toast sukses saat target tercapai"
    );
    assert.doesNotMatch(
      contextContent,
      /toast\.info\s*\(\s*["']Waktu istirahat dilewati["']\s*\)/,
      "Tidak boleh ada toast info saat lewati istirahat"
    );

    // Semua kemunculan toast di context hanya berupa toast.error
    const allToasts = contextContent.match(/toast\.(?:success|info|warning|error)/g) || [];
    for (const t of allToasts) {
      assert.strictEqual(
        t,
        "toast.error",
        `Ditemukan toast non-error di FocusTimerContext: ${t}`
      );
    }
  });

  test("6. 'Akhiri' kembali ke Siap tanpa memulai istirahat, dan kartu ringkasan tanpa tombol simpan catatan", () => {
    const contextPath = path.join(process.cwd(), "src/components/focus/FocusTimerContext.tsx");
    const displayPath = path.join(process.cwd(), "src/components/focus/FocusTimerDisplay.tsx");
    const prefDialogPath = path.join(process.cwd(), "src/components/focus/FocusPreferenceDialog.tsx");

    const contextContent = fs.readFileSync(contextPath, "utf-8");
    const displayContent = fs.readFileSync(displayPath, "utf-8");
    const prefDialogContent = fs.readFileSync(prefDialogPath, "utf-8");

    // endSession tidak memanggil startBreak
    assert.doesNotMatch(
      contextContent,
      /endSession[\s\S]*?startBreak\(/,
      "endSession tidak boleh memanggil startBreak"
    );

    // Kartu ringkasan di FocusTimerDisplay tidak memiliki tombol 'Simpan Catatan' dan tidak ada tombol mulai lain
    assert.doesNotMatch(
      displayContent,
      />\s*Simpan Catatan\s*</,
      "Kartu ringkasan tidak boleh memiliki tombol 'Simpan Catatan'"
    );

    // Otomatisasi autoStartBreak & autoStartNextFocus disembunyikan dari dialog preferensi
    assert.doesNotMatch(
      prefDialogContent,
      /id="pref-auto-break"/,
      "Dialog preferensi tidak boleh menampilkan checkbox pref-auto-break"
    );
    assert.doesNotMatch(
      prefDialogContent,
      /id="pref-auto-next-focus"/,
      "Dialog preferensi tidak boleh menampilkan checkbox pref-auto-next-focus"
    );

    // Kolom database/interface StudyPreferenceDto tetap ada (tidak dihapus)
    assert.match(
      prefDialogContent,
      /autoStartBreak/,
      "Variabel autoStartBreak tetap ada di state/payload"
    );
    assert.match(
      prefDialogContent,
      /autoStartNextFocus/,
      "Variabel autoStartNextFocus tetap ada di state/payload"
    );
  });

  test("7. Catatan tersimpan otomatis (debounce 800ms, flush saat blur/pindah layar) & teks tidak hilang jika gagal", () => {
    const displayPath = path.join(process.cwd(), "src/components/focus/FocusTimerDisplay.tsx");
    const displayContent = fs.readFileSync(displayPath, "utf-8");

    // Debounce 800ms
    assert.match(
      displayContent,
      /800\s*\)/,
      "Catatan harus menggunakan debounce 800ms"
    );

    // Flush saat blur
    assert.match(
      displayContent,
      /onBlur=\{\s*handleBlur\s*\}/,
      "Textarea catatan harus melakukan flush saat blur"
    );

    // Pesan inline saat simpan catatan gagal tanpa toast
    assert.match(
      displayContent,
      /Gagal menyimpan, coba lagi/,
      "Harus ada pesan inline 'Gagal menyimpan, coba lagi'"
    );

    // Batas 500 karakter dengan penghitung
    assert.match(
      displayContent,
      /maxLength=\{500\}/,
      "Textarea harus dibatasi maxLength 500"
    );
    assert.match(
      displayContent,
      /\/500/,
      "Harus ada penghitung karakter /500"
    );
  });

  test("8. resolveFocusStateKind pure resolver", () => {
    // Break active with time remaining
    assert.strictEqual(
      resolveFocusStateKind({ isBreakActive: true, breakRemainingSec: 250 }),
      "BREAK"
    );
    // Break active with 0 remaining
    assert.strictEqual(
      resolveFocusStateKind({ isBreakActive: true, breakRemainingSec: 0 }),
      "BREAK_OVERDUE"
    );
    // Target reached
    assert.strictEqual(
      resolveFocusStateKind({
        hasActiveSession: true,
        status: "RUNNING",
        isTargetReached: true,
        mode: "FOCUS",
      }),
      "TARGET_REACHED"
    );
    // Stopwatch does not become TARGET_REACHED even if target reached flag is true
    assert.strictEqual(
      resolveFocusStateKind({
        hasActiveSession: true,
        status: "RUNNING",
        isTargetReached: true,
        mode: "STOPWATCH",
      }),
      "RUNNING"
    );
    // Running
    assert.strictEqual(
      resolveFocusStateKind({ hasActiveSession: true, status: "RUNNING" }),
      "RUNNING"
    );
    // Paused
    assert.strictEqual(
      resolveFocusStateKind({ hasActiveSession: true, status: "PAUSED" }),
      "PAUSED"
    );
    // No active session
    assert.strictEqual(
      resolveFocusStateKind({ hasActiveSession: false }),
      "READY"
    );
  });

  test("9. Judul tab web (document.title) menampilkan waktu fokus real-time saat berjalan", () => {
    const contextPath = path.join(process.cwd(), "src/components/focus/FocusTimerContext.tsx");
    const contextContent = fs.readFileSync(contextPath, "utf-8");

    // Memastikan judul tab memformat waktu fokus di awal judul: `(${timeText})`
    assert.match(
      contextContent,
      /document\.title\s*=\s*`\(\$\{timeText\}\)\s*\$\{modeLabel\}/,
      "Judul tab harus menampilkan waktu countdown di awal kurung saat fokus berjalan"
    );

    // Memastikan judul tab menampilkan waktu istirahat saat istirahat berjalan
    assert.match(
      contextContent,
      /document\.title\s*=\s*`\(\$\{timeText\}\)\s*Istirahat/,
      "Judul tab harus menampilkan waktu istirahat saat break berjalan"
    );

    // Memastikan status jeda juga terindikasi
    assert.match(
      contextContent,
      /document\.title\s*=\s*`\(⏸️\s*\$\{timeText\}\)/,
      "Judul tab harus menampilkan indikator jeda saat sesi dijeda"
    );

    // Memastikan judul asli dikembalikan saat sesi berhenti
    assert.match(
      contextContent,
      /document\.title\s*=\s*baseTitle/,
      "Judul tab harus dikembalikan ke judul asli saat sesi tidak aktif"
    );
  });
});
