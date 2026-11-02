import { z } from "zod";

/**
 * Normalisasi termKey: huruf kecil, trim, spasi berlebih dirapatkan menjadi 1 spasi.
 */
export function normalizeTermKey(term: string): string {
  if (!term) return "";
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Ringkasan kosong otomatis diambil dari kalimat pertama catatan (maks 200 karakter), tanpa AI.
 * Membersihkan format heading, link, formatting markdown sederhana agar bersih saat tampil di ringkasan kartu.
 */
export function extractSummaryFromBody(body: string, maxLen = 200): string {
  if (!body) return "";

  // 1. Bersihkan baris heading (# ...) sepenuhnya agar tidak dianggap sebagai kalimat ringkasan
  const withoutHeadings = body.replace(/^#+.*$/gm, "");

  // 2. Bersihkan elemen markdown lain: blockquote (>), bullet list (- * +), link markdown, formatting
  const cleaned = withoutHeadings
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();

  if (!cleaned) return "";

  // 3. Ambil blok paragraf pertama yang tidak kosong
  const blocks = cleaned.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const firstBlock = blocks[0] || cleaned;

  // 4. Ambil kalimat pertama yang diakhiri tanda baca titik, tanda seru, tanda tanya, atau baris pertama
  const sentenceMatch = firstBlock.match(/^.*?[.!?](?:\s|$)/);
  const rawSentence = sentenceMatch
    ? sentenceMatch[0].trim()
    : firstBlock.split("\n")[0].trim();

  // 5. Batasi maksimal 200 karakter
  if (rawSentence.length <= maxLen) {
    return rawSentence;
  }
  return rawSentence.slice(0, maxLen - 3).trimEnd() + "...";
}

export const CreateGlossaryTermSchema = z.object({
  term: z
    .string()
    .trim()
    .min(1, "Istilah tidak boleh kosong")
    .max(120, "Istilah maksimal 120 karakter"),
  shortDefinition: z
    .string()
    .trim()
    .max(300, "Ringkasan maksimal 300 karakter")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  body: z
    .string()
    .trim()
    .min(1, "Catatan tidak boleh kosong")
    .max(20000, "Catatan maksimal 20.000 karakter"),
  courseId: z
    .string()
    .uuid("ID mata kuliah tidak valid")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val && val.length > 0 ? val : null)),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Tag tidak boleh kosong")
        .max(30, "Tag maksimal 30 karakter")
    )
    .max(10, "Maksimal 10 tag")
    .default([]),
  source: z
    .string()
    .trim()
    .max(200, "Sumber maksimal 200 karakter")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  verified: z.boolean().default(false),
});

export const UpdateGlossaryTermSchema = z.object({
  id: z.string().uuid("ID istilah tidak valid"),
  term: z
    .string()
    .trim()
    .min(1, "Istilah tidak boleh kosong")
    .max(120, "Istilah maksimal 120 karakter")
    .optional(),
  shortDefinition: z
    .string()
    .trim()
    .max(300, "Ringkasan maksimal 300 karakter")
    .optional()
    .nullable(),
  body: z
    .string()
    .trim()
    .min(1, "Catatan tidak boleh kosong")
    .max(20000, "Catatan maksimal 20.000 karakter")
    .optional(),
  courseId: z
    .string()
    .uuid("ID mata kuliah tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Tag tidak boleh kosong")
        .max(30, "Tag maksimal 30 karakter")
    )
    .max(10, "Maksimal 10 tag")
    .optional(),
  source: z
    .string()
    .trim()
    .max(200, "Sumber maksimal 200 karakter")
    .optional()
    .nullable(),
  verified: z.boolean().optional(),
});

export const ListGlossaryTermsQuerySchema = z.object({
  search: z.string().optional(),
  courseId: z.string().optional(),
  tag: z.string().optional(),
  verified: z.boolean().optional(),
  isArchived: z.boolean().default(false),
  sortBy: z.enum(["term_asc", "term_desc", "newest", "oldest"]).default("term_asc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
