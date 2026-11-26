export interface SearchableCourse {
  id: string;
  name: string;
  code: string | null;
  kind?: "REGULAR" | "EXTRA";
}

export interface SearchableTask {
  id: string;
  title: string;
  courseId: string | null;
}

/**
 * Menyaring daftar mata kuliah reguler dan topik Belajar Mandiri berdasarkan kata kunci.
 * Pencarian bersifat case-insensitive terhadap nama maupun kode mata kuliah.
 */
export function filterFocusCourses<T extends SearchableCourse>(
  courses: T[],
  query: string
): {
  regular: T[];
  extra: T[];
  totalMatches: number;
} {
  const q = query.trim().toLowerCase();
  const matches = q
    ? courses.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(q);
        const codeMatch = c.code ? c.code.toLowerCase().includes(q) : false;
        return nameMatch || codeMatch;
      })
    : courses;

  const regular = matches.filter((c) => c.kind !== "EXTRA");
  const extra = matches.filter((c) => c.kind === "EXTRA");

  return {
    regular,
    extra,
    totalMatches: regular.length + extra.length,
  };
}

/**
 * Menyaring daftar tugas berdasarkan kata kunci judul (case-insensitive).
 */
export function filterFocusTasks<T extends SearchableTask>(tasks: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter((t) => t.title.toLowerCase().includes(q));
}
