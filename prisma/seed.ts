import { PrismaClient, Role, TaskPriority, TaskStatus, TaskTargetType, MaterialType, MaterialVisibility } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const prisma = new PrismaClient({
  datasources: process.env.DIRECT_URL ? { db: { url: process.env.DIRECT_URL } } : undefined,
});

const RAW_EMAILS = [
  "prabulintangpamungkas@gmail.com",
  "syamilhanifalfatih@gmail.com",
  "adrianbagastiaagusani@gmail.com",
  "muhammadzaatulkahfi@gmail.com",
  "irenasyaukanirustam@gmail.com",
  "fachrihasanpatrisa@gmail.com",
  "mnabilarrizki@gmail.com",
  "riziqwafialmajid@gmail.com",
  "muhammadirsyaadfadillah@gmail.com",
  "fatihnathansyahirawan@gmail.com",
  "ahmadfauzannadhir@gmail.com",
  "fikrirahmadhan@gmail.com",
  "muhammadihsanfirzatullah@gmail.com",
  "fajardwikihermawan@gmail.com",
  "zahranhakim@gmail.com",
  "arifalpianrizky@gmail.com",
  "rasyahaikalakbar@gmail.com",
  "muhammadfaizrabbani@gmail.com",
  "damarraditya@gmail.com",
  "farrassyahmiakram@gmail.com",
  "muhammadabidzarzuhdi@gmail.com",
  "dhafinmarifatulmuslim@gmail.com",
  "asyrafzahiruladam@gmail.com",
  "ihsanulfalah@gmail.com",
  "zalfaadhwaghina@gmail.com",
  "mohrizkiakbar@gmail.com",
  "heidaraliramadhani@gmail.com",
  "efanimanulhaqsubhan@gmail.com",
  "muhammadghalibbandono@gmail.com",
  "muhamadsaidridho@gmail.com",
  "nadyasafiraamalia@gmail.com",
  "wahyusetiyawan@gmail.com",
];

const ADMIN_EMAIL = "damarraditya@gmail.com";
const DEFAULT_PASSWORD = process.env.DEFAULT_INITIAL_PASSWORD || "pwuinjkt";

// Deterministic dummy UUID fallback for local/offline prisma seeding if Supabase Admin API is unreachable
function getDeterministicUuid(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `00000000-0000-4000-8000-${hex.padStart(12, "0")}`;
}

async function main() {
  console.log("🌱 Memulai proses seeding Class 1-B...");

  // 1. Setup Supabase Client jika credentials tersedia
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let supabaseAdmin: ReturnType<typeof createClient> | null = null;

  if (supabaseUrl && serviceRoleKey && !supabaseUrl.includes("[PROJECT_REF]")) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    console.log("✓ Supabase Admin API terhubung untuk sinkronisasi Auth.");
  } else {
    console.log("ℹ Supabase Admin API credentials belum diatur. Menggunakan ID deterministik untuk database seed.");
  }

  // 2. Buat atau update Class 1-B
  const class1B = await prisma.class.upsert({
    where: { code: "1-B" },
    update: {
      name: "Kelas 1-B",
      description: "Platform Manajemen Tugas dan E-Learning Terpadu Kelas 1-B.",
    },
    create: {
      name: "Kelas 1-B",
      code: "1-B",
      description: "Platform Manajemen Tugas dan E-Learning Terpadu Kelas 1-B.",
    },
  });
  console.log(`✓ Kelas terdaftar: ${class1B.name} (${class1B.code})`);

  // 3. Deduplikasi email
  const uniqueEmails = Array.from(new Set(RAW_EMAILS.map((e) => e.trim().toLowerCase())));
  console.log(`ℹ Total anggota unik yang akan diproses: ${uniqueEmails.length}`);

  // 4. Ambil daftar existing users di Supabase Auth jika client aktif
  const existingAuthUsersByEmail = new Map<string, string>();
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (!error && data?.users) {
        for (const u of data.users) {
          if (u.email) {
            existingAuthUsersByEmail.set(u.email.toLowerCase(), u.id);
          }
        }
      }
    } catch (err) {
      console.warn("Peringatan saat mengambil user Supabase Auth:", err);
    }
  }

  // 5. Seed Users & Memberships
  const profileRecords: { id: string; email: string; role: Role }[] = [];

  for (const email of uniqueEmails) {
    const isAdmin = email === ADMIN_EMAIL;
    const role: Role = isAdmin ? Role.ADMIN : Role.MEMBER;

    let authUserId = existingAuthUsersByEmail.get(email);

    if (!authUserId && supabaseAdmin) {
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: { email },
        });

        if (!createError && newUser?.user) {
          authUserId = newUser.user.id;
          console.log(`  + Dibuat akun Supabase Auth: ${email}`);
        } else if (createError) {
          console.warn(`  ! Catatan untuk ${email}: ${createError.message}`);
        }
      } catch (err) {
        console.warn(`  ! Gagal membuat auth user untuk ${email}:`, err);
      }
    }

    if (!authUserId) {
      authUserId = getDeterministicUuid(email);
    }

    // Nama awal dibuat rapi (bisa diedit Admin di kemudian hari)
    const displayName = email.split("@")[0].replace(/[\._]/g, " ");

    let profile = await prisma.profile.findUnique({ where: { email } });
    if (profile) {
      if (profile.id !== authUserId) {
        await prisma.$executeRawUnsafe(
          `UPDATE "profiles" SET "id" = $1, "mustChangePassword" = $2, "updatedAt" = NOW() WHERE "email" = $3`,
          authUserId,
          !isAdmin,
          email
        );
        profile.id = authUserId;
      }
    } else {
      profile = await prisma.profile.create({
        data: {
          id: authUserId,
          email,
          name: displayName,
          mustChangePassword: !isAdmin,
          isActive: true,
        },
      });
    }

    await prisma.classMembership.upsert({
      where: {
        classId_profileId: {
          classId: class1B.id,
          profileId: profile.id,
        },
      },
      update: { role },
      create: {
        classId: class1B.id,
        profileId: profile.id,
        role,
      },
    });

    profileRecords.push({ id: profile.id, email, role });
  }
  console.log(`✓ ${profileRecords.length} anggota berhasil disinkronkan ke Kelas 1-B.`);

  const adminProfile = profileRecords.find((p) => p.email === ADMIN_EMAIL) || profileRecords[0];

  // 6. Sample Mata Kuliah (Courses)
  const coursesData = [
    {
      code: "IF101",
      name: "Matematika Diskrit",
      lecturer: "Dr. Ir. Hendra Prasetya, M.T.",
      description: "Logika proposisi, teori himpunan, relasi, fungsi, kombinatorika, teori graf, dan pohon biner.",
    },
    {
      code: "IF102",
      name: "Pemrograman Web & Mobile",
      lecturer: "Rina Kartika, S.Kom., M.Cs.",
      description: "Arsitektur aplikasi web modern, Next.js, TypeScript, REST API, state management, dan database.",
    },
    {
      code: "IF103",
      name: "Literasi Digital & Etika Profesi",
      lecturer: "Ahmad Fauzi, M.Kom.",
      description: "Keamanan informasi, privasi data, etika profesional rekayasa perangkat lunak, dan pemanfaatan AI.",
    },
  ];

  const createdCourses = [];
  for (const c of coursesData) {
    const course = await prisma.course.upsert({
      where: { id: `seed-course-${c.code.toLowerCase()}` },
      update: {
        name: c.name,
        code: c.code,
        lecturer: c.lecturer,
        description: c.description,
      },
      create: {
        id: `seed-course-${c.code.toLowerCase()}`,
        classId: class1B.id,
        name: c.name,
        code: c.code,
        lecturer: c.lecturer,
        description: c.description,
      },
    });
    createdCourses.push(course);
  }
  console.log(`✓ ${createdCourses.length} mata kuliah contoh telah dibuat.`);

  // 7. Sample Topics untuk Mata Kuliah
  const topicsData = [
    {
      courseId: createdCourses[0].id,
      title: "Logika Proposisi & Tabel Kebenaran",
      description: "Konsep pernyataan, tabel kebenaran, tautologi, kontradiksi, dan ekivalensi logika.",
      order: 1,
    },
    {
      courseId: createdCourses[0].id,
      title: "Teori Himpunan & Diagram Venn",
      description: "Operasi gabungan, irisan, komplemen, dan hukum-hukum aljabar himpunan.",
      order: 2,
    },
    {
      courseId: createdCourses[1].id,
      title: "Komponen React & App Router Next.js",
      description: "Server Component vs Client Component, arsitektur layout, dan dynamic routing.",
      order: 1,
    },
    {
      courseId: createdCourses[1].id,
      title: "Integrasi Database PostgreSQL & Prisma ORM",
      description: "Pemodelan schema data, relasi, migrasi, dan query type-safe di server-side.",
      order: 2,
    },
  ];

  const createdTopics = [];
  for (let i = 0; i < topicsData.length; i++) {
    const t = topicsData[i];
    const topic = await prisma.topic.upsert({
      where: { id: `seed-topic-${i + 1}` },
      update: {
        title: t.title,
        description: t.description,
        order: t.order,
      },
      create: {
        id: `seed-topic-${i + 1}`,
        courseId: t.courseId,
        title: t.title,
        description: t.description,
        order: t.order,
      },
    });
    createdTopics.push(topic);
  }
  console.log(`✓ ${createdTopics.length} topik materi telah dibuat.`);

  // 8. Sample Materi (Materials)
  const materialsData = [
    {
      id: "seed-mat-1",
      courseId: createdCourses[0].id,
      topicId: createdTopics[0].id,
      title: "Modul Pertemuan 1 - Pengantar Logika Matematika",
      description: "Catatan kuliah resmi dan latihan soal logika matematika dasar untuk persiapan kuis.",
      materialType: MaterialType.PDF,
      visibility: MaterialVisibility.PUBLIC,
      fileName: "Modul-1-Logika-Matematika.pdf",
      fileSize: 1024 * 512,
      uploadedById: adminProfile.id,
    },
    {
      id: "seed-mat-2",
      courseId: createdCourses[1].id,
      topicId: createdTopics[2].id,
      title: "Dokumentasi & Best Practice Next.js 15+ App Router",
      description: "Panduan lengkap penggunaan Server Actions, caching, dan integrasi shadcn/ui.",
      materialType: MaterialType.LINK,
      externalUrl: "https://nextjs.org/docs/app",
      visibility: MaterialVisibility.PUBLIC,
      uploadedById: adminProfile.id,
    },
  ];

  for (const m of materialsData) {
    await prisma.material.upsert({
      where: { id: m.id },
      update: {
        title: m.title,
        description: m.description,
        materialType: m.materialType,
        visibility: m.visibility,
        externalUrl: m.externalUrl,
        fileName: m.fileName,
        fileSize: m.fileSize,
      },
      create: {
        id: m.id,
        courseId: m.courseId,
        topicId: m.topicId,
        title: m.title,
        description: m.description,
        materialType: m.materialType,
        visibility: m.visibility,
        externalUrl: m.externalUrl,
        fileName: m.fileName,
        fileSize: m.fileSize,
        uploadedById: m.uploadedById,
      },
    });
  }
  console.log("✓ Sample materi pembelajaran telah dibuat.");

  // 9. Sample Tasks
  // Task 1: ALL mahasiswa
  const in5Days = new Date();
  in5Days.setDate(in5Days.getDate() + 5);

  const in10Days = new Date();
  in10Days.setDate(in10Days.getDate() + 10);

  const in3Days = new Date();
  in3Days.setDate(in3Days.getDate() + 3);

  await prisma.task.upsert({
    where: { id: "seed-task-all-1" },
    update: {
      title: "Latihan Mandiri: Logika Proposisi & Tabel Kebenaran",
      description: "Kerjakan latihan soal nomor 1 sampai 15 pada buku modul halaman 24. Siapkan untuk dibahas pada sesi kuis berikutnya.",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      deadline: in5Days,
      targetType: TaskTargetType.ALL,
    },
    create: {
      id: "seed-task-all-1",
      classId: class1B.id,
      courseId: createdCourses[0].id,
      title: "Latihan Mandiri: Logika Proposisi & Tabel Kebenaran",
      description: "Kerjakan latihan soal nomor 1 sampai 15 pada buku modul halaman 24. Siapkan untuk dibahas pada sesi kuis berikutnya.",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      deadline: in5Days,
      targetType: TaskTargetType.ALL,
      createdById: adminProfile.id,
    },
  });

  await prisma.task.upsert({
    where: { id: "seed-task-all-2" },
    update: {
      title: "Setup Repository & Arsitektur Proyek Web",
      description: "Setiap kelompok wajib menginisialisasi repository GitHub kelas dan menghubungkannya dengan konfigurasi ESLint dan TypeScript.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      deadline: in10Days,
      targetType: TaskTargetType.ALL,
    },
    create: {
      id: "seed-task-all-2",
      classId: class1B.id,
      courseId: createdCourses[1].id,
      title: "Setup Repository & Arsitektur Proyek Web",
      description: "Setiap kelompok wajib menginisialisasi repository GitHub kelas dan menghubungkannya dengan konfigurasi ESLint dan TypeScript.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      deadline: in10Days,
      targetType: TaskTargetType.ALL,
      createdById: adminProfile.id,
    },
  });

  // Task 2: Specific members (Tugas Remedial / Khusus)
  const specificMembers = profileRecords.slice(1, 4); // 3 members
  const taskSpecific = await prisma.task.upsert({
    where: { id: "seed-task-specific-1" },
    update: {
      title: "Pengayaan Khusus: Optimasi Aljabar Boolean",
      description: "Tugas telaah khusus untuk peserta program pengayaan materi logika dan simplifikasi ekspresi logika.",
      status: TaskStatus.TODO,
      priority: TaskPriority.URGENT,
      deadline: in3Days,
      targetType: TaskTargetType.SPECIFIC,
    },
    create: {
      id: "seed-task-specific-1",
      classId: class1B.id,
      courseId: createdCourses[0].id,
      title: "Pengayaan Khusus: Optimasi Aljabar Boolean",
      description: "Tugas telaah khusus untuk peserta program pengayaan materi logika dan simplifikasi ekspresi logika.",
      status: TaskStatus.TODO,
      priority: TaskPriority.URGENT,
      deadline: in3Days,
      targetType: TaskTargetType.SPECIFIC,
      createdById: adminProfile.id,
    },
  });

  // Buat TaskAssignment hanya untuk specific task
  for (const m of specificMembers) {
    await prisma.taskAssignment.upsert({
      where: {
        taskId_profileId: {
          taskId: taskSpecific.id,
          profileId: m.id,
        },
      },
      update: {},
      create: {
        taskId: taskSpecific.id,
        profileId: m.id,
      },
    });
  }
  console.log("✓ Sample tasks (ALL dan SPECIFIC) telah dibuat.");


  // 11. Sample Announcements
  await prisma.announcement.upsert({
    where: { id: "seed-announcement-1" },
    update: {
      title: "Selamat Datang di Workspace Terpadu Kelas 1-B",
      content: "Halo rekan-rekan Kelas 1-B! Portal ini digunakan untuk memantau tugas kelas, mengakses materi kuliah bersama, mengumpulkan tugas praktikum, serta mendapatkan pengumuman akademik resmi secara terpadu.",
      isPinned: true,
    },
    create: {
      id: "seed-announcement-1",
      classId: class1B.id,
      title: "Selamat Datang di Workspace Terpadu Kelas 1-B",
      content: "Halo rekan-rekan Kelas 1-B! Portal ini digunakan untuk memantau tugas kelas, mengakses materi kuliah bersama, mengumpulkan tugas praktikum, serta mendapatkan pengumuman akademik resmi secara terpadu.",
      isPinned: true,
      createdById: adminProfile.id,
    },
  });

  await prisma.announcement.upsert({
    where: { id: "seed-announcement-2" },
    update: {
      title: "Pengingat: Wajib Ganti Password Awal Saat Pertama Kali Login",
      content: "Bagi seluruh mahasiswa yang baru pertama kali mengakses akun, sistem akan secara otomatis mengarahkan ke halaman Ganti Password. Gunakan kombinasi kata sandi yang aman dan mudah diingat.",
      isPinned: false,
    },
    create: {
      id: "seed-announcement-2",
      classId: class1B.id,
      title: "Pengingat: Wajib Ganti Password Awal Saat Pertama Kali Login",
      content: "Bagi seluruh mahasiswa yang baru pertama kali mengakses akun, sistem akan secara otomatis mengarahkan ke halaman Ganti Password. Gunakan kombinasi kata sandi yang aman dan mudah diingat.",
      isPinned: false,
      createdById: adminProfile.id,
    },
  });
  console.log("✓ Pengumuman kelas telah dibuat.");

  console.log("✨ Seeding selesai secara sukses!");
}

main()
  .catch((e) => {
    console.error("Error selama seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
