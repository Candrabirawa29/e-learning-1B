import { PrismaClient, ActivityAction } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Memulai Script Backfill Data Aktivasi Akun Mahasiswa ===");

  // Cari mahasiswa yang sudah mengganti password (mustChangePassword === false), tapi activatedAt masih null
  const candidates = await prisma.profile.findMany({
    where: {
      mustChangePassword: false,
      activatedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      mustChangePassword: true,
      lastLoginAt: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: { email: "asc" },
  });

  console.log(`Ditemukan ${candidates.length} profil kandidat yang belum memiliki activatedAt.`);

  if (candidates.length === 0) {
    console.log("Semua profil mahasiswa yang telah aktivasi sudah memiliki activatedAt. Tidak ada perubahan yang diperlukan.");
    const totalActivated = await prisma.profile.count({
      where: { activatedAt: { not: null } },
    });
    console.log(`Total profil dengan activatedAt saat ini: ${totalActivated}`);
    return;
  }

  // Safety guard: pastikan kandidat tepat 7 akun yang terdampak
  if (candidates.length !== 7) {
    console.error(`[ABORT] Jumlah kandidat yang ditemukan (${candidates.length}) tidak sesuai ekspektasi (7).`);
    console.error("Daftar kandidat:", candidates.map((c) => ({ email: c.email, name: c.name })));
    process.exit(1);
  }

  console.log("\nDaftar 7 mahasiswa yang akan di-backfill:");
  candidates.forEach((c, idx) => {
    console.log(`  ${idx + 1}. ${c.email} (${c.name || "-"}) - lastLoginAt: ${c.lastLoginAt}`);
  });

  console.log("\nMemproses update tanggal aktivasi...");

  for (const candidate of candidates) {
    // 1. Ambil min(createdAt) event USER_LOGIN dari activity_logs untuk akun ini
    const firstLoginLog = await prisma.activityLog.findFirst({
      where: {
        actorId: candidate.id,
        action: ActivityAction.USER_LOGIN,
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    // 2. Tentukan timestamp aktivasi: login pertama dari log -> lastLoginAt -> updatedAt
    const determinedDate =
      firstLoginLog?.createdAt ?? candidate.lastLoginAt ?? candidate.updatedAt ?? new Date();

    const source = firstLoginLog
      ? "activity_logs (USER_LOGIN pertama)"
      : candidate.lastLoginAt
      ? "lastLoginAt"
      : "updatedAt";

    console.log(`- Mengupdate ${candidate.email} -> ${determinedDate.toISOString()} (sumber: ${source})`);

    await prisma.profile.update({
      where: { id: candidate.id },
      data: {
        activatedAt: determinedDate,
      },
    });
  }

  // Verifikasi akhir
  const finalActivatedCount = await prisma.profile.count({
    where: { activatedAt: { not: null } },
  });

  const finalMustChangeCount = await prisma.profile.count({
    where: { mustChangePassword: false },
  });

  console.log("\n=== Hasil Backfill Selesai ===");
  console.log(`Total profil dengan activatedAt !== null : ${finalActivatedCount}`);
  console.log(`Total profil dengan mustChangePassword == false : ${finalMustChangeCount}`);

  if (finalActivatedCount === 18 && finalMustChangeCount === 18) {
    console.log("STATUS: SUKSES SEMPURNA! Kedua metrik telah sinkron tepat di angka 18 mahasiswa.");
  } else {
    console.warn(`PERINGATAN: Metrik belum identik 18 (activatedAt=${finalActivatedCount}, mustChange=${finalMustChangeCount}).`);
  }
}

main()
  .catch((err) => {
    console.error("Terjadi kesalahan saat menjalankan backfill:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
