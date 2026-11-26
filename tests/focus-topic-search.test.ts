import { test, describe } from "node:test";
import assert from "node:assert";
import {
  filterFocusCourses,
  filterFocusTasks,
  type SearchableCourse,
  type SearchableTask,
} from "../src/lib/focus/context-search";

const sampleCourses: SearchableCourse[] = [
  { id: "c1", name: "Dasar-dasar Pemrograman", code: "IF101", kind: "REGULAR" },
  { id: "c2", name: "Elektronika Dasar", code: "EL102", kind: "REGULAR" },
  { id: "c3", name: "Matematika Diskrit", code: "MTK103", kind: "REGULAR" },
  { id: "c4", name: "Studi Islam", code: "MKU01", kind: "REGULAR" },
  { id: "e1", name: "Akidah", code: null, kind: "EXTRA" },
  { id: "e2", name: "Persiapan Sertifikasi Cloud", code: null, kind: "EXTRA" },
];

const sampleTasks: SearchableTask[] = [
  { id: "t1", title: "Praktikum Array & List Python", courseId: "c1" },
  { id: "t2", title: "Rangkaian Seri Paralel", courseId: "c2" },
  { id: "t3", title: "Resume Bab 1 Logika Proposisi", courseId: "c3" },
  { id: "t4", title: "Tugas Umum Kelas", courseId: null },
];

describe("Searchbar Filter untuk Topik / Mata Kuliah & Tugas di Ruang Fokus", () => {
  test("1. Query kosong mengembalikan seluruh Mata Kuliah Reguler dan Belajar Mandiri terpisah", () => {
    const res = filterFocusCourses(sampleCourses, "");
    assert.strictEqual(res.regular.length, 4);
    assert.strictEqual(res.extra.length, 2);
    assert.strictEqual(res.totalMatches, 6);
  });

  test("2. Pencarian case-insensitive mencocokkan nama mata kuliah dan topik Belajar Mandiri", () => {
    const resDasar = filterFocusCourses(sampleCourses, "  dasar ");
    assert.deepStrictEqual(
      resDasar.regular.map((c) => c.id),
      ["c1", "c2"]
    );
    assert.strictEqual(resDasar.extra.length, 0);

    const resExtra = filterFocusCourses(sampleCourses, "akidah");
    assert.strictEqual(resExtra.regular.length, 0);
    assert.deepStrictEqual(
      resExtra.extra.map((c) => c.id),
      ["e1"]
    );
  });

  test("3. Pencarian dapat menemukan mata kuliah lewat kode mata kuliah (misal IF101 atau MTK)", () => {
    const resCode = filterFocusCourses(sampleCourses, "if101");
    assert.deepStrictEqual(
      resCode.regular.map((c) => c.id),
      ["c1"]
    );

    const resPrefix = filterFocusCourses(sampleCourses, "mtk");
    assert.deepStrictEqual(
      resPrefix.regular.map((c) => c.id),
      ["c3"]
    );
  });

  test("4. Query yang tidak cocok mengembalikan 0 hasil agar UI bisa menawarkan + Tambah topik", () => {
    const resNone = filterFocusCourses(sampleCourses, "Machine Learning");
    assert.strictEqual(resNone.regular.length, 0);
    assert.strictEqual(resNone.extra.length, 0);
    assert.strictEqual(resNone.totalMatches, 0);
  });

  test("5. filterFocusTasks menyaring tugas berdasarkan query judul secara case-insensitive", () => {
    assert.strictEqual(filterFocusTasks(sampleTasks, "").length, 4);
    const matched = filterFocusTasks(sampleTasks, "python");
    assert.deepStrictEqual(
      matched.map((t) => t.id),
      ["t1"]
    );
  });
});
