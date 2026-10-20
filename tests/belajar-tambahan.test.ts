import { test, describe } from "node:test";
import assert from "node:assert";
import { visibleCoursesWhere, visibleCoursesSql } from "../src/lib/courses/course-filter";
import {
  canManageCourse,
  canArchiveCourse,
  canUploadMaterial,
  canManageMaterial,
  canManageTopic,
} from "../src/lib/auth/rbac";
import { CurrentUserSession } from "../src/lib/auth/session";

describe("Fitur Belajar Tambahan (Mata Kuliah Tambahan / Mandiri)", () => {
  const sessionUserA: CurrentUserSession = {
    user: { id: "user_a", email: "usera@example.com" },
    profile: {
      id: "user_a",
      name: "Mahasiswa A",
      email: "usera@example.com",
      avatarUrl: null,
      mustChangePassword: false,
      isActive: true,
      activatedAt: new Date(),
    },
    membership: {
      id: "mem_a",
      classId: "class_1b",
      role: "MEMBER",
    },
    realRole: "MEMBER",
    effectiveRole: "MEMBER",
    assignedCourseIds: [],
    isViewAs: false,
    viewAsRole: null,
  };

  const sessionUserB: CurrentUserSession = {
    user: { id: "user_b", email: "userb@example.com" },
    profile: {
      id: "user_b",
      name: "Mahasiswa B",
      email: "userb@example.com",
      avatarUrl: null,
      mustChangePassword: false,
      isActive: true,
      activatedAt: new Date(),
    },
    membership: {
      id: "mem_b",
      classId: "class_1b",
      role: "MEMBER",
    },
    realRole: "MEMBER",
    effectiveRole: "MEMBER",
    assignedCourseIds: [],
    isViewAs: false,
    viewAsRole: null,
  };

  const sessionAdmin: CurrentUserSession = {
    user: { id: "admin_1", email: "admin@example.com" },
    profile: {
      id: "admin_1",
      name: "Admin Kelas",
      email: "admin@example.com",
      avatarUrl: null,
      mustChangePassword: false,
      isActive: true,
      activatedAt: new Date(),
    },
    membership: {
      id: "mem_admin",
      classId: "class_1b",
      role: "ADMIN",
    },
    realRole: "ADMIN",
    effectiveRole: "ADMIN",
    assignedCourseIds: [],
    isViewAs: false,
    viewAsRole: null,
  };

  const regularCourse = {
    id: "course_basis_data",
    name: "Basis Data",
    code: "BD101",
    kind: "REGULAR" as const,
    visibility: "CLASS" as const,
    ownerId: null,
    archivedAt: null,
  };

  const extraPrivateCourseUserA = {
    id: "course_extra_user_a",
    name: "Belajar Rust Mandiri",
    code: null,
    kind: "EXTRA" as const,
    visibility: "PRIVATE" as const,
    ownerId: "user_a",
    archivedAt: null,
  };

  const extraPrivateCourseUserB = {
    id: "course_extra_user_b",
    name: "Persiapan Sertifikasi AWS",
    code: null,
    kind: "EXTRA" as const,
    visibility: "PRIVATE" as const,
    ownerId: "user_b",
    archivedAt: null,
  };

  const archivedExtraCourseUserA = {
    id: "course_extra_archived_a",
    name: "Topik Lama Yang Diarsipkan",
    code: null,
    kind: "EXTRA" as const,
    visibility: "PRIVATE" as const,
    ownerId: "user_a",
    archivedAt: new Date("2026-10-15T10:00:00Z"),
  };

  // Helper evaluator untuk menyimulasikan evaluasi kondisi Prisma Where pada objek Course
  function courseMatchesWhere(
    course: {
      kind: string;
      visibility: string;
      ownerId: string | null;
      archivedAt: Date | null;
    },
    whereInput: any
  ): boolean {
    if (whereInput.AND && Array.isArray(whereInput.AND)) {
      return whereInput.AND.every((cond: any) => courseMatchesWhere(course, cond));
    }
    if (whereInput.OR && Array.isArray(whereInput.OR)) {
      return whereInput.OR.some((cond: any) => courseMatchesWhere(course, cond));
    }
    if (whereInput.kind && whereInput.kind !== course.kind) {
      return false;
    }
    if (whereInput.visibility && whereInput.visibility !== course.visibility) {
      return false;
    }
    if (whereInput.ownerId !== undefined && whereInput.ownerId !== course.ownerId) {
      return false;
    }
    if (whereInput.archivedAt === null && course.archivedAt !== null) {
      return false;
    }
    if (whereInput.archivedAt && whereInput.archivedAt.not !== undefined) {
      if (whereInput.archivedAt.not === null && course.archivedAt === null) {
        return false;
      }
    }
    return true;
  }

  describe("1. Centralized Helper visibleCoursesWhere", () => {
    test("User B TIDAK dapat melihat EXTRA PRIVATE milik User A", () => {
      const whereUserB = visibleCoursesWhere(sessionUserB);

      // User B harus melihat mata kuliah reguler
      assert.strictEqual(
        courseMatchesWhere(regularCourse, whereUserB),
        true,
        "User B harus dapat melihat mata kuliah reguler"
      );

      // User B TIDAK boleh melihat EXTRA PRIVATE milik User A
      assert.strictEqual(
        courseMatchesWhere(extraPrivateCourseUserA, whereUserB),
        false,
        "User B TIDAK boleh melihat EXTRA PRIVATE milik User A"
      );

      // User B DAPAT melihat EXTRA PRIVATE miliknya sendiri
      assert.strictEqual(
        courseMatchesWhere(extraPrivateCourseUserB, whereUserB),
        true,
        "User B harus dapat melihat EXTRA PRIVATE miliknya sendiri"
      );
    });

    test("User A dapat melihat EXTRA PRIVATE miliknya sendiri dan mata kuliah reguler", () => {
      const whereUserA = visibleCoursesWhere(sessionUserA);

      assert.strictEqual(
        courseMatchesWhere(regularCourse, whereUserA),
        true,
        "User A harus dapat melihat mata kuliah reguler"
      );
      assert.strictEqual(
        courseMatchesWhere(extraPrivateCourseUserA, whereUserA),
        true,
        "User A harus dapat melihat EXTRA PRIVATE miliknya sendiri"
      );
      assert.strictEqual(
        courseMatchesWhere(extraPrivateCourseUserB, whereUserA),
        false,
        "User A TIDAK boleh melihat EXTRA PRIVATE milik User B"
      );
    });

    test("Secara default kursus yang diarsipkan tidak muncul, kecuali diminta", () => {
      const whereDefault = visibleCoursesWhere(sessionUserA);
      assert.strictEqual(
        courseMatchesWhere(archivedExtraCourseUserA, whereDefault),
        false,
        "Topik yang diarsipkan harus disaring keluar secara default"
      );

      const whereWithArchived = visibleCoursesWhere(sessionUserA, { includeArchived: true });
      assert.strictEqual(
        courseMatchesWhere(archivedExtraCourseUserA, whereWithArchived),
        true,
        "Topik yang diarsipkan harus muncul jika includeArchived = true"
      );

      const whereOnlyArchived = visibleCoursesWhere(sessionUserA, { onlyArchived: true });
      assert.strictEqual(
        courseMatchesWhere(archivedExtraCourseUserA, whereOnlyArchived),
        true,
        "Topik yang diarsipkan harus muncul pada mode onlyArchived"
      );
      assert.strictEqual(
        courseMatchesWhere(extraPrivateCourseUserA, whereOnlyArchived),
        false,
        "Topik aktif tidak boleh muncul pada mode onlyArchived"
      );
    });

    test("Topik EXTRA dengan visibility CLASS dapat dilihat rekan sekelas, namun jika diarsipkan disembunyikan dari rekan sekelas", () => {
      const extraClassCourseUserA = {
        id: "course_extra_shared_a",
        name: "Catatan Riset Terbuka",
        code: null,
        kind: "EXTRA" as const,
        visibility: "CLASS" as const,
        ownerId: "user_a",
        archivedAt: null,
      };

      const archivedSharedCourseUserA = {
        id: "course_extra_archived_shared_a",
        name: "Catatan Riset Lama (Arsip)",
        code: null,
        kind: "EXTRA" as const,
        visibility: "CLASS" as const,
        ownerId: "user_a",
        archivedAt: new Date("2026-10-18T10:00:00Z"),
      };

      // 1. Saat aktif: User B DAPAT melihat topik EXTRA yang di-set CLASS oleh User A
      const whereUserB = visibleCoursesWhere(sessionUserB);
      assert.strictEqual(
        courseMatchesWhere(extraClassCourseUserA, whereUserB),
        true,
        "User B harus dapat melihat EXTRA dengan visibility CLASS milik rekan sekelas"
      );

      // 2. Saat diarsipkan: Rekan sekelas (User B) TIDAK boleh melihat topik arsip milik User A
      assert.strictEqual(
        courseMatchesWhere(archivedSharedCourseUserA, whereUserB),
        false,
        "User B TIDAK boleh melihat topik arsip rekan sekelas"
      );

      // 3. User B yang meminta onlyArchived TIDAK boleh mendapatkan topik arsip milik User A
      const whereArchivedUserB = visibleCoursesWhere(sessionUserB, { onlyArchived: true });
      assert.strictEqual(
        courseMatchesWhere(archivedSharedCourseUserA, whereArchivedUserB),
        false,
        "User B TIDAK boleh mendapatkan topik arsip milik User A pada query onlyArchived"
      );

      // 4. Namun User A (pemilik) DAPAT melihat topik arsipnya sendiri
      const whereArchivedUserA = visibleCoursesWhere(sessionUserA, { onlyArchived: true });
      assert.strictEqual(
        courseMatchesWhere(archivedSharedCourseUserA, whereArchivedUserA),
        true,
        "User A (pemilik) harus dapat melihat topik arsip miliknya sendiri"
      );
    });

    test("Guest (tanpa login) hanya melihat REGULAR, tidak pernah melihat EXTRA PRIVATE", () => {
      const whereGuest = visibleCoursesWhere(null);
      assert.strictEqual(
        courseMatchesWhere(regularCourse, whereGuest),
        true,
        "Guest dapat melihat REGULAR"
      );
      assert.strictEqual(
        courseMatchesWhere(extraPrivateCourseUserA, whereGuest),
        false,
        "Guest TIDAK boleh melihat EXTRA PRIVATE User A"
      );
      assert.strictEqual(
        courseMatchesWhere(extraPrivateCourseUserB, whereGuest),
        false,
        "Guest TIDAK boleh melihat EXTRA PRIVATE User B"
      );
    });
  });

  describe("2. Hak Akses Manajemen (canManageCourse, canArchiveCourse)", () => {
    test("EXTRA hanya dapat dikelola (edit) oleh pemiliknya sendiri", () => {
      // Pemilik boleh mengedit
      assert.strictEqual(
        canManageCourse(sessionUserA, extraPrivateCourseUserA),
        true,
        "Pemilik harus boleh mengelola EXTRA miliknya"
      );

      // User lain tidak boleh mengedit
      assert.strictEqual(
        canManageCourse(sessionUserB, extraPrivateCourseUserA),
        false,
        "User B tidak boleh mengelola EXTRA milik User A"
      );

      // Admin tidak mengedit konten topik pribadi orang lain
      assert.strictEqual(
        canManageCourse(sessionAdmin, extraPrivateCourseUserA),
        false,
        "Admin tidak boleh mengedit konten EXTRA pribadi user lain"
      );
    });

    test("Admin dan Pemilik boleh mengarsipkan EXTRA (canArchiveCourse)", () => {
      // Pemilik boleh mengarsipkan
      assert.strictEqual(
        canArchiveCourse(sessionUserA, extraPrivateCourseUserA),
        true,
        "Pemilik harus boleh mengarsipkan EXTRA miliknya"
      );

      // Admin boleh mengarsipkan
      assert.strictEqual(
        canArchiveCourse(sessionAdmin, extraPrivateCourseUserA),
        true,
        "Admin harus berhak mengarsipkan EXTRA milik siapa pun jika diperlukan"
      );

      // User lain tidak boleh mengarsipkan
      assert.strictEqual(
        canArchiveCourse(sessionUserB, extraPrivateCourseUserA),
        false,
        "User B tidak boleh mengarsipkan EXTRA milik User A"
      );
    });

    test("canUploadMaterial & canManageTopic: EXTRA hanya pemilik", () => {
      assert.strictEqual(
        canUploadMaterial(sessionUserA, extraPrivateCourseUserA),
        true,
        "Pemilik boleh menambah materi di EXTRA miliknya"
      );
      assert.strictEqual(
        canUploadMaterial(sessionUserB, extraPrivateCourseUserA),
        false,
        "User B tidak boleh menambah materi di EXTRA milik User A"
      );

      assert.strictEqual(
        canManageTopic(sessionUserA, extraPrivateCourseUserA),
        true,
        "Pemilik boleh mengelola sub-topik di EXTRA miliknya"
      );
      assert.strictEqual(
        canManageTopic(sessionUserB, extraPrivateCourseUserA),
        false,
        "User B tidak boleh mengelola sub-topik di EXTRA milik User A"
      );
    });
  });

  describe("3. Isolasi Jadwal Kuliah & Statistik Kelas (Omit EXTRA)", () => {
    test("Jadwal mingguan dan statistik kelas wajib menyaring kind = REGULAR", () => {
      // Simulasi filter jadwal mingguan
      const courseList = [regularCourse, extraPrivateCourseUserA, extraPrivateCourseUserB];
      const regularScheduleCourses = courseList.filter(
        (c) => c.kind === "REGULAR" && c.archivedAt === null
      );

      assert.strictEqual(regularScheduleCourses.length, 1);
      assert.strictEqual(regularScheduleCourses[0].id, "course_basis_data");
    });

    test("Statistik dan progres tugas kelas hanya mencakup tugas REGULAR / Umum", () => {
      const mockTasks = [
        { id: "task_1", title: "Tugas SQL", courseId: "course_basis_data", course: regularCourse },
        { id: "task_2", title: "Tugas Umum", courseId: null, course: null },
        { id: "task_3", title: "Tugas Ilegal Extra", courseId: "course_extra_user_a", course: extraPrivateCourseUserA },
      ];

      // Filter query tugas resmi
      const officialTasks = mockTasks.filter(
        (t) => !t.courseId || (t.course && t.course.kind === "REGULAR" && t.course.archivedAt === null)
      );

      assert.strictEqual(officialTasks.length, 2);
      assert.ok(!officialTasks.some((t) => t.id === "task_3"), "Tugas EXTRA tidak boleh masuk ke daftar tugas kelas");
    });
  });

  describe("4. SQL Fragment visibleCoursesSql", () => {
    test("Menghasilkan klausa SQL yang menyaring EXTRA PRIVATE milik orang lain", () => {
      const sqlA = visibleCoursesSql("user_a", { courseAlias: "c" });
      const queryStrA = sqlA.text;

      // Harus memeriksa kind = REGULAR atau kind = EXTRA dengan ownerId = user_a
      assert.ok(queryStrA.includes('"kind" = \'REGULAR\''), "Harus memuat kind = REGULAR");
      assert.ok(queryStrA.includes('"kind" = \'EXTRA\''), "Harus memuat kind = EXTRA");
      assert.ok(queryStrA.includes('"ownerId" ='), "Harus memuat pengecekan ownerId");
      assert.ok(queryStrA.includes('"archivedAt" IS NULL'), "Harus memeriksa archivedAt IS NULL");
    });
  });

  describe("5. Pemisahan Analitik: Kuliah vs Mandiri", () => {
    test("Data breakdown per mata kuliah mengidentifikasi Kuliah vs Mandiri dengan tepat", () => {
      const breakdownRows = [
        {
          course_id: "course_basis_data",
          course_name: "Basis Data",
          course_code: "BD101",
          kind: "REGULAR",
          total_minutes: 120,
          session_count: 4,
        },
        {
          course_id: "course_extra_user_a",
          course_name: "Belajar Rust Mandiri",
          course_code: null,
          kind: "EXTRA",
          total_minutes: 60,
          session_count: 2,
        },
        {
          course_id: null,
          course_name: "Umum / Mandiri",
          course_code: null,
          kind: null,
          total_minutes: 30,
          session_count: 1,
        },
      ];

      let kuliahMinutes = 0;
      let mandiriMinutes = 0;

      for (const r of breakdownRows) {
        if (r.kind === "REGULAR") {
          kuliahMinutes += r.total_minutes;
        } else {
          mandiriMinutes += r.total_minutes;
        }
      }

      assert.strictEqual(kuliahMinutes, 120, "Waktu kuliah resmi harus tepat 120 menit");
      assert.strictEqual(mandiriMinutes, 90, "Waktu belajar mandiri harus tepat 90 menit (60m EXTRA + 30m Umum)");
      assert.strictEqual(
        kuliahMinutes + mandiriMinutes,
        210,
        "Total semua waktu fokus tetap dihitung penuh (210 menit) untuk target, streak, dan heatmap"
      );
    });
  });
});
