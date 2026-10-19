import { PrismaClient, FocusMode, FocusSessionStatus } from "@prisma/client";
import { deriveStatus } from "../src/lib/focus/session-logic";

const prisma = new PrismaClient();

interface PlannedUpdate {
  id: string;
  userId: string;
  mode: FocusMode;
  plannedSec: number;
  oldAccumulatedSec: number;
  newAccumulatedSec: number;
  oldStatus: FocusSessionStatus;
  newStatus: FocusSessionStatus;
  oldIsCorrected: boolean;
  newIsCorrected: boolean;
  reason: string;
}

interface ManualReviewItem {
  id: string;
  userId: string;
  mode: FocusMode;
  startedAt: Date;
  plannedSec: number;
  accumulatedSec: number;
  ratio: number;
  status: FocusSessionStatus;
}

interface Under60sItem {
  id: string;
  userId: string;
  mode: FocusMode;
  startedAt: Date;
  accumulatedSec: number;
  status: FocusSessionStatus;
}

async function main() {
  const isApply = process.argv.includes("--apply");
  const modeLabel = isApply ? "[APPLY MODE]" : "[DRY-RUN MODE]";

  console.log(`=======================================================`);
  console.log(`=== Script Backfill Status Sesi Fokus ${modeLabel} ===`);
  console.log(`=======================================================\n`);

  if (!isApply) {
    console.log("Menjalankan dalam mode DRY-RUN. Tidak ada data yang akan diubah di database.");
    console.log("Untuk menerapkan perubahan, jalankan dengan flag: --apply\n");
  }

  // 1. Ambil semua sesi non-RUNNING
  const sessions = await prisma.focusSession.findMany({
    where: {
      status: {
        not: FocusSessionStatus.RUNNING,
      },
    },
    orderBy: { startedAt: "asc" },
  });

  console.log(`Ditemukan total ${sessions.length} sesi non-RUNNING.`);

  const updatesToApply: PlannedUpdate[] = [];
  const manualReviewList: ManualReviewItem[] = [];
  const under60sList: Under60sItem[] = [];

  for (const session of sessions) {
    const { id, userId, mode, plannedSec, accumulatedSec, status, isCorrected, startedAt } = session;

    // Kasus 1: Durasi di bawah 60 detik (hanya dilaporkan, tidak dihapus/diubah)
    if (accumulatedSec < 60) {
      under60sList.push({
        id,
        userId,
        mode,
        startedAt,
        accumulatedSec,
        status,
      });
      continue;
    }

    // Kasus 2: Mode FOCUS dengan durasi melebihi target
    if (mode === FocusMode.FOCUS && plannedSec > 0 && accumulatedSec > plannedSec) {
      if (accumulatedSec <= 2 * plannedSec) {
        // Durasi di atas target s/d 2x target -> dipotong ke target, tandai dikoreksi
        const newAccumulatedSec = plannedSec;
        const newIsCorrected = true;
        const newStatus = deriveStatus(newAccumulatedSec, plannedSec, mode) as FocusSessionStatus;

        updatesToApply.push({
          id,
          userId,
          mode,
          plannedSec,
          oldAccumulatedSec: accumulatedSec,
          newAccumulatedSec,
          oldStatus: status,
          newStatus,
          oldIsCorrected: isCorrected,
          newIsCorrected,
          reason: `Durasi (${accumulatedSec}s) > target (${plannedSec}s) & <= 2x target: dipotong ke target dan ditandai dikoreksi`,
        });
      } else {
        // Durasi lebih dari 2x target -> tidak diubah, hanya dilaporkan untuk tinjauan manual
        manualReviewList.push({
          id,
          userId,
          mode,
          startedAt,
          plannedSec,
          accumulatedSec,
          ratio: Math.round((accumulatedSec / plannedSec) * 10) / 10,
          status,
        });
      }
      continue;
    }

    // Kasus 3: Sesi normal (durasi <= target atau mode STOPWATCH)
    const expectedStatus = deriveStatus(accumulatedSec, plannedSec, mode) as FocusSessionStatus;
    if (expectedStatus !== status) {
      updatesToApply.push({
        id,
        userId,
        mode,
        plannedSec,
        oldAccumulatedSec: accumulatedSec,
        newAccumulatedSec: accumulatedSec,
        oldStatus: status,
        newStatus: expectedStatus,
        oldIsCorrected: isCorrected,
        newIsCorrected: isCorrected,
        reason: `Sinkronisasi status dengan deriveStatus: ${status} -> ${expectedStatus}`,
      });
    }
  }

  // Cetak Laporan Perubahan yang Direncanakan
  console.log(`\n--- 1. Perubahan Status & Koreksi Durasi (${updatesToApply.length} sesi) ---`);
  if (updatesToApply.length === 0) {
    console.log("Tidak ada perubahan status atau pemotongan durasi yang diperlukan.");
  } else {
    updatesToApply.forEach((u, idx) => {
      console.log(
        `[${idx + 1}] ID: ${u.id} (User: ${u.userId})` +
          `\n    Status   : ${u.oldStatus} -> ${u.newStatus}` +
          `\n    Durasi   : ${u.oldAccumulatedSec}s -> ${u.newAccumulatedSec}s (Target: ${u.plannedSec}s)` +
          `\n    Koreksi  : isCorrected ${u.oldIsCorrected} -> ${u.newIsCorrected}` +
          `\n    Alasan   : ${u.reason}`
      );
    });
  }

  // Cetak Laporan Tinjauan Manual (> 2x target)
  console.log(`\n--- 2. Sesi > 2x Target untuk Tinjauan Manual (${manualReviewList.length} sesi) ---`);
  if (manualReviewList.length === 0) {
    console.log("Tidak ada sesi yang melebihi 2x target.");
  } else {
    console.log("Catatan: Sesi-sesi berikut TIDAK diubah secara otomatis:");
    manualReviewList.forEach((m, idx) => {
      console.log(
        `[${idx + 1}] ID: ${m.id} | User: ${m.userId} | Mulai: ${m.startedAt.toISOString()}` +
          ` | Target: ${m.plannedSec}s | Durasi: ${m.accumulatedSec}s (${m.ratio}x target) | Status: ${m.status}`
      );
    });
  }

  // Cetak Laporan Sesi di Bawah 60 Detik
  console.log(`\n--- 3. Sesi Terlalu Singkat < 60 Detik (${under60sList.length} sesi) ---`);
  if (under60sList.length === 0) {
    console.log("Tidak ada sesi dengan durasi < 60 detik.");
  } else {
    console.log("Catatan: Sesi-sesi berikut TIDAK dihapus, hanya dilaporkan:");
    under60sList.forEach((u, idx) => {
      console.log(
        `[${idx + 1}] ID: ${u.id} | User: ${u.userId} | Mulai: ${u.startedAt.toISOString()}` +
          ` | Durasi: ${u.accumulatedSec}s | Status: ${u.status}`
      );
    });
  }

  // Ringkasan
  console.log("\n=======================================================");
  console.log("=== RINGKASAN HASIL BACKFILL ===");
  console.log(`Total sesi non-RUNNING diperiksa   : ${sessions.length}`);
  console.log(`Sesi yang perlu di-update           : ${updatesToApply.length}`);
  console.log(`Sesi > 2x target (tinjau manual)   : ${manualReviewList.length}`);
  console.log(`Sesi < 60 detik (hanya dilaporkan) : ${under60sList.length}`);
  console.log("=======================================================\n");

  if (isApply) {
    if (updatesToApply.length > 0) {
      console.log("Menerapkan perubahan ke database...");
      let appliedCount = 0;
      for (const item of updatesToApply) {
        await prisma.focusSession.update({
          where: { id: item.id },
          data: {
            accumulatedSec: item.newAccumulatedSec,
            isCorrected: item.newIsCorrected,
            status: item.newStatus,
          },
        });
        appliedCount++;
      }
      console.log(`BERHASIL: Sebanyak ${appliedCount} sesi berhasil diperbarui di database!`);
    } else {
      console.log("Tidak ada record yang perlu di-update di database.");
    }
  } else {
    console.log("MODE DRY-RUN SELESAI. Tidak ada data yang diubah.");
    console.log("Gunakan perintah berikut untuk menerapkan perubahan:");
    console.log("npx tsx scripts/backfill-focus-status.ts --apply\n");
  }
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan script backfill:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
