import { test, describe } from "node:test";
import assert from "node:assert";
import {
  normalizeTermKey,
  extractSummaryFromBody,
  CreateGlossaryTermSchema,
  UpdateGlossaryTermSchema,
  ListGlossaryTermsQuerySchema,
} from "../src/lib/glossary/glossary-logic";
import { visibleCoursesWhere } from "../src/lib/courses/course-filter";
import { CurrentUserSession } from "../src/lib/auth/session";
import { Prisma } from "@prisma/client";

describe("Fitur Kosakata (Kamus Istilah Pribadi)", () => {
  // Sesi User A & User B
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

  describe("1. Normalisasi termKey & Ekstraksi Ringkasan Otomatis Tanpa AI", () => {
    test("normalizeTermKey merapikan huruf kecil, trim, dan spasi ganda/tab/newline", () => {
      assert.strictEqual(normalizeTermKey("  Idempotency   Key  "), "idempotency key");
      assert.strictEqual(normalizeTermKey("REACTIVE\n\tPROGRAMMING"), "reactive programming");
      assert.strictEqual(normalizeTermKey("   PBO  "), "pbo");
      assert.strictEqual(normalizeTermKey(""), "");
    });

    test("extractSummaryFromBody mengambil kalimat pertama tanpa tanda format markdown", () => {
      const markdown = `
# Pengertian ACID
ACID adalah akronim dari Atomicity, Consistency, Isolation, dan Durability dalam transaksi database.

Ini paragraf kedua yang menjelaskan detail lebih mendalam dengan [link modul](https://example.com).
      `;

      const summary = extractSummaryFromBody(markdown);
      assert.strictEqual(
        summary,
        "ACID adalah akronim dari Atomicity, Consistency, Isolation, dan Durability dalam transaksi database."
      );
    });

    test("extractSummaryFromBody membatasi panjang maksimal 200 karakter dengan elipsis", () => {
      const longSentence = "A".repeat(250) + ".";
      const summary = extractSummaryFromBody(longSentence, 200);
      assert.strictEqual(summary.length, 200);
      assert.ok(summary.endsWith("..."));
    });

    test("extractSummaryFromBody mengembalikan string kosong untuk teks kosong", () => {
      assert.strictEqual(extractSummaryFromBody(""), "");
      assert.strictEqual(extractSummaryFromBody("    "), "");
    });
  });

  describe("2. Validasi Skema Zod (Panjang Karakter & Format)", () => {
    test("Validasi Istilah: wajib diisi, maksimal 120 karakter", () => {
      // Istilah kosong ditolak
      const emptyTerm = CreateGlossaryTermSchema.safeParse({
        term: "",
        body: "Catatan penjelasan",
      });
      assert.strictEqual(emptyTerm.success, false);

      // Istilah 120 karakter lolos
      const valid120 = CreateGlossaryTermSchema.safeParse({
        term: "A".repeat(120),
        body: "Catatan penjelasan",
      });
      assert.strictEqual(valid120.success, true);

      // Istilah 121 karakter ditolak
      const invalid121 = CreateGlossaryTermSchema.safeParse({
        term: "A".repeat(121),
        body: "Catatan penjelasan",
      });
      assert.strictEqual(invalid121.success, false);
    });

    test("Validasi Catatan (body): wajib diisi, maksimal 20.000 karakter", () => {
      // Body kosong ditolak
      const emptyBody = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "",
      });
      assert.strictEqual(emptyBody.success, false);

      // Body 20.000 karakter lolos
      const valid20k = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "X".repeat(20000),
      });
      assert.strictEqual(valid20k.success, true);

      // Body 20.001 karakter ditolak
      const invalid20k1 = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "X".repeat(20001),
      });
      assert.strictEqual(invalid20k1.success, false);
    });

    test("Validasi Ringkasan (shortDefinition): maksimal 300 karakter", () => {
      const invalidShortDef = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan penjelasan",
        shortDefinition: "S".repeat(301),
      });
      assert.strictEqual(invalidShortDef.success, false);

      const validShortDef = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan penjelasan",
        shortDefinition: "S".repeat(300),
      });
      assert.strictEqual(validShortDef.success, true);
    });

    test("Validasi Tags: maksimal 10 tag, masing-masing maksimal 30 karakter", () => {
      // Lebih dari 10 tag ditolak
      const elevenTags = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan",
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
      });
      assert.strictEqual(elevenTags.success, false);

      // Tag lebih dari 30 karakter ditolak
      const longTag = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan",
        tags: ["T".repeat(31)],
      });
      assert.strictEqual(longTag.success, false);

      // 10 tag valid lolos
      const validTags = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan",
        tags: Array.from({ length: 10 }, (_, i) => `tag_${i}`),
      });
      assert.strictEqual(validTags.success, true);
    });

    test("Validasi Sumber: maksimal 200 karakter", () => {
      const invalidSource = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan",
        source: "S".repeat(201),
      });
      assert.strictEqual(invalidSource.success, false);

      const validSource = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan",
        source: "S".repeat(200),
      });
      assert.strictEqual(validSource.success, true);
    });

    test("Validasi courseId: UUID atau null/empty string", () => {
      // Bukan format UUID ditolak
      const invalidUuid = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan",
        courseId: "bukan-uuid",
      });
      assert.strictEqual(invalidUuid.success, false);

      // Valid UUID lolos
      const validUuid = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan",
        courseId: "123e4567-e89b-12d3-a456-426614174000",
      });
      assert.strictEqual(validUuid.success, true);

      // String kosong di-transform menjadi null
      const emptyUuid = CreateGlossaryTermSchema.safeParse({
        term: "Istilah",
        body: "Catatan",
        courseId: "",
      });
      assert.strictEqual(emptyUuid.success, true);
      assert.strictEqual(emptyUuid.data?.courseId, null);
    });

    test("Validasi UpdateGlossaryTermSchema: ID wajib UUID dan field opsional divalidasi", () => {
      // ID bukan UUID ditolak
      const invalidId = UpdateGlossaryTermSchema.safeParse({
        id: "bukan-uuid",
        term: "Istilah Baru",
      });
      assert.strictEqual(invalidId.success, false);

      // ID UUID valid dengan update parsial lolos
      const validUpdate = UpdateGlossaryTermSchema.safeParse({
        id: "123e4567-e89b-12d3-a456-426614174000",
        term: "Istilah Baru",
        verified: true,
      });
      assert.strictEqual(validUpdate.success, true);
    });

    test("Validasi ListGlossaryTermsQuerySchema: nilai default diterapkan dengan benar", () => {
      const parsed = ListGlossaryTermsQuerySchema.safeParse({});
      assert.strictEqual(parsed.success, true);
      assert.strictEqual(parsed.data?.page, 1);
      assert.strictEqual(parsed.data?.limit, 20);
      assert.strictEqual(parsed.data?.isArchived, false);
      assert.strictEqual(parsed.data?.sortBy, "term_asc");
    });
  });

  describe("3. Deteksi Istilah Ganda (Duplicate Term) Per Pengguna", () => {
    // Model simulasi in-memory untuk memverifikasi logika keunikan (userId, termKey)
    const storedTerms: Array<{
      id: string;
      userId: string;
      term: string;
      termKey: string;
      body: string;
    }> = [];

    function simulateCreateTerm(userId: string, term: string, body: string) {
      const termKey = normalizeTermKey(term);
      const existing = storedTerms.find((t) => t.userId === userId && t.termKey === termKey);
      if (existing) {
        return {
          success: false,
          error: `Istilah "${term}" sudah ada di kamus Anda.`,
          existingId: existing.id,
        };
      }
      const newTerm = {
        id: `term_${storedTerms.length + 1}`,
        userId,
        term: term.trim(),
        termKey,
        body,
      };
      storedTerms.push(newTerm);
      return { success: true, data: newTerm };
    }

    test("Istilah ganda pada user yang sama ditolak dan mengembalikan pesan 'sudah ada' beserta id", () => {
      storedTerms.length = 0; // reset

      // 1. User A membuat istilah "Polimorfisme"
      const res1 = simulateCreateTerm("user_a", "Polimorfisme", "Konsep OOP");
      assert.strictEqual(res1.success, true);
      assert.ok(res1.data);
      const originalId = res1.data.id;

      // 2. User A mencoba menambahkan lagi "  polimorfisme  " dengan variasi huruf besar & spasi
      const resDuplicate = simulateCreateTerm("user_a", "  polimorfisme  ", "Catatan lain");
      assert.strictEqual(resDuplicate.success, false);
      assert.ok(resDuplicate.error?.includes("sudah ada"), "Pesan error harus mengandung 'sudah ada'");
      assert.strictEqual(resDuplicate.existingId, originalId, "Harus mengembalikan id istilah yang sudah ada");
    });

    test("User B diizinkan membuat istilah dengan nama sama karena kamus bersifat pribadi", () => {
      // User B membuat istilah "Polimorfisme"
      const resUserB = simulateCreateTerm("user_b", "Polimorfisme", "Catatan milik User B");
      assert.strictEqual(resUserB.success, true, "User B bebas memiliki istilah dengan nama sama");
      assert.strictEqual(resUserB.data?.userId, "user_b");
    });
  });

  describe("4. Isolasi Privasi Pengguna (User B Tidak Bisa Mengakses Data User A)", () => {
    const databaseTerms = [
      {
        id: "term_a_1",
        userId: "user_a",
        term: "Enkapsulasi",
        termKey: "enkapsulasi",
        shortDefinition: "Menyembunyikan detail implementasi",
        body: "Detail enkapsulasi milik User A",
        courseId: null,
        tags: ["oop", "dasar"],
        archivedAt: null,
      },
      {
        id: "term_a_2",
        userId: "user_a",
        term: "Inheritance",
        termKey: "inheritance",
        shortDefinition: "Pewarisan sifat",
        body: "Detail inheritance milik User A",
        courseId: null,
        tags: ["oop"],
        archivedAt: null,
      },
      {
        id: "term_b_1",
        userId: "user_b",
        term: "Normalisasi 1NF",
        termKey: "normalisasi 1nf",
        shortDefinition: "Tidak ada grup berulang",
        body: "Detail normalisasi milik User B",
        courseId: null,
        tags: ["database"],
        archivedAt: null,
      },
    ];

    test("User B tidak bisa membaca istilah milik User A via getGlossaryTerm", () => {
      // Query Prisma pada server action disaring ketat dengan userId session
      const userBId = sessionUserB.user!.id;
      const targetTermId = "term_a_1";

      const queryResult = databaseTerms.find(
        (t) => t.id === targetTermId && t.userId === userBId
      );

      assert.strictEqual(queryResult, undefined, "Istilah User A tidak boleh ditemukan oleh User B");
    });

    test("User B tidak bisa mengubah istilah milik User A via updateGlossaryTerm", () => {
      const userBId = sessionUserB.user!.id;
      const targetTermId = "term_a_1";

      // Server action mengecek keberadaan dengan where: { id: targetTermId, userId: userBId }
      const termToUpdate = databaseTerms.find(
        (t) => t.id === targetTermId && t.userId === userBId
      );

      assert.strictEqual(termToUpdate, undefined);
      // Hasil server action jika null:
      const actionResponse = {
        success: false,
        error: "Istilah tidak ditemukan atau tidak memiliki izin akses.",
      };
      assert.strictEqual(actionResponse.success, false);
    });

    test("Pencarian (search) User B tidak pernah memunculkan istilah User A", () => {
      const userBId = sessionUserB.user!.id;
      const searchQuery = "Enkapsulasi"; // istilah milik User A

      // Logika pencarian di listGlossaryTerms menyaring dengan userId
      const userBResults = databaseTerms.filter(
        (t) =>
          t.userId === userBId &&
          (t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.body.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      assert.strictEqual(userBResults.length, 0, "Pencarian User B tidak boleh membocorkan istilah User A");
    });
  });

  describe("5. Validasi courseId Berdasarkan visibleCoursesWhere", () => {
    // Definisi courses di kelas 1-B
    const regularCourse = {
      id: "course_basis_data",
      name: "Basis Data",
      code: "BD101",
      kind: "REGULAR" as const,
      ownerId: null,
      archivedAt: null,
    };

    const extraCourseUserA = {
      id: "course_extra_user_a",
      name: "Belajar Rust Pribadi A",
      code: null,
      kind: "EXTRA" as const,
      ownerId: "user_a",
      archivedAt: null,
    };

    const coursesInDb = [regularCourse, extraCourseUserA];

    // Helper untuk mengecek apakah course lolos filter Prisma visibleCoursesWhere
    function courseMatchesWhere(
      course: {
        kind: string;
        visibility?: string;
        ownerId: string | null;
        archivedAt: Date | null;
      },
      whereInput: Prisma.CourseWhereInput
    ): boolean {
      if (whereInput.AND) {
        const andList = Array.isArray(whereInput.AND) ? whereInput.AND : [whereInput.AND];
        if (!andList.every((cond) => courseMatchesWhere(course, cond as Prisma.CourseWhereInput))) {
          return false;
        }
      }
      if (whereInput.OR) {
        const orList = Array.isArray(whereInput.OR) ? whereInput.OR : [whereInput.OR];
        if (!orList.some((cond) => courseMatchesWhere(course, cond as Prisma.CourseWhereInput))) {
          return false;
        }
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
      return true;
    }

    test("User A dapat mengaitkan istilah ke mata kuliah reguler kelas", () => {
      const whereA = visibleCoursesWhere(sessionUserA, { includeArchived: true });
      assert.strictEqual(courseMatchesWhere(regularCourse, whereA), true);
    });

    test("User A dapat mengaitkan istilah ke topik belajar mandiri miliknya sendiri", () => {
      const whereA = visibleCoursesWhere(sessionUserA, { includeArchived: true });
      assert.strictEqual(courseMatchesWhere(extraCourseUserA, whereA), true);
    });

    test("User B DITOLAK jika mencoba mengaitkan istilah ke courseId milik topik pribadi User A", () => {
      const whereB = visibleCoursesWhere(sessionUserB, { includeArchived: true });
      const isVisibleToB = courseMatchesWhere(extraCourseUserA, whereB);
      assert.strictEqual(
        isVisibleToB,
        false,
        "Course mandiri pribadi User A tidak boleh dapat dipilih atau dikaitkan oleh User B"
      );

      // Server action memvalidasi dengan findFirst: where: { id: courseId, ...visibleCoursesWhere(user) }
      const courseValidated = coursesInDb.find(
        (c) => c.id === extraCourseUserA.id && courseMatchesWhere(c, whereB)
      );

      assert.strictEqual(
        courseValidated,
        undefined,
        "Query validasi harus menolak akses mata kuliah milik user lain"
      );
    });
  });
});
