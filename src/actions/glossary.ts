"use server";

import { prisma } from "@/lib/prisma";
import { requireUser, assertCanMutate } from "@/lib/auth/session";
import { visibleCoursesWhere } from "@/lib/courses/course-filter";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  CreateGlossaryTermSchema,
  UpdateGlossaryTermSchema,
  ListGlossaryTermsQuerySchema,
  normalizeTermKey,
  extractSummaryFromBody,
} from "@/lib/glossary/glossary-logic";
import {
  GlossaryTermDto,
  CreateGlossaryTermInput,
  UpdateGlossaryTermInput,
  ListGlossaryTermsQuery,
  ListGlossaryTermsResult,
  GlossaryActionResult,
} from "@/types/glossary";

function serializeGlossaryTerm(term: {
  id: string;
  userId: string;
  term: string;
  termKey: string;
  shortDefinition: string | null;
  body: string;
  courseId: string | null;
  tags: string[];
  source: string | null;
  verified: boolean;
  box: number;
  nextReviewAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  course?: { id: string; name: string; code: string | null } | null;
}): GlossaryTermDto {
  return {
    id: term.id,
    userId: term.userId,
    term: term.term,
    termKey: term.termKey,
    shortDefinition: term.shortDefinition,
    body: term.body,
    courseId: term.courseId,
    tags: term.tags || [],
    source: term.source,
    verified: term.verified,
    box: term.box,
    nextReviewAt: term.nextReviewAt ? term.nextReviewAt.toISOString() : null,
    archivedAt: term.archivedAt ? term.archivedAt.toISOString() : null,
    createdAt: term.createdAt.toISOString(),
    updatedAt: term.updatedAt.toISOString(),
    course: term.course
      ? {
          id: term.course.id,
          name: term.course.name,
          code: term.course.code,
        }
      : null,
  };
}

/**
 * Menambahkan istilah baru ke kamus istilah pribadi.
 */
export async function createGlossaryTerm(
  rawInput: CreateGlossaryTermInput
): Promise<GlossaryActionResult> {
  const user = await requireUser();
  assertCanMutate(user);
  const userId = user.user!.id;

  const parsedResult = CreateGlossaryTermSchema.safeParse(rawInput);
  if (!parsedResult.success) {
    return {
      success: false,
      error: parsedResult.error.issues.map((i) => i.message).join(", "),
    };
  }
  const data = parsedResult.data;
  const termKey = normalizeTermKey(data.term);

  // 1. Cek duplikasi istilah untuk user ini
  const existing = await prisma.glossaryTerm.findUnique({
    where: {
      userId_termKey: {
        userId,
        termKey,
      },
    },
  });

  if (existing) {
    return {
      success: false,
      error: `Istilah "${data.term}" sudah ada di kamus Anda.`,
      existingId: existing.id,
    };
  }

  // 2. Cek validitas akses mata kuliah jika courseId disediakan
  if (data.courseId) {
    const course = await prisma.course.findFirst({
      where: {
        id: data.courseId,
        ...visibleCoursesWhere(user, { includeArchived: true }),
      },
    });

    if (!course) {
      return {
        success: false,
        error: "Mata kuliah tidak ditemukan atau tidak memiliki izin akses.",
      };
    }
  }

  // 3. Ringkasan kosong otomatis diambil dari kalimat pertama catatan (maks 200 karakter), tanpa AI.
  const finalShortDef =
    data.shortDefinition?.trim() || extractSummaryFromBody(data.body);

  const created = await prisma.glossaryTerm.create({
    data: {
      userId,
      term: data.term.trim(),
      termKey,
      shortDefinition: finalShortDef || null,
      body: data.body.trim(),
      courseId: data.courseId || null,
      tags: data.tags,
      source: data.source || null,
      verified: data.verified,
    },
    include: {
      course: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  revalidatePath("/home/kosakata");

  return {
    success: true,
    message: "Istilah berhasil ditambahkan ke kamus.",
    data: serializeGlossaryTerm(created),
    term: serializeGlossaryTerm(created),
  };
}

/**
 * Memperbarui data istilah yang sudah ada.
 */
export async function updateGlossaryTerm(
  rawInput: UpdateGlossaryTermInput
): Promise<GlossaryActionResult> {
  const user = await requireUser();
  assertCanMutate(user);
  const userId = user.user!.id;

  const parsedResult = UpdateGlossaryTermSchema.safeParse(rawInput);
  if (!parsedResult.success) {
    return {
      success: false,
      error: parsedResult.error.issues.map((i) => i.message).join(", "),
    };
  }
  const data = parsedResult.data;

  // 1. Ambil data lama milik user
  const current = await prisma.glossaryTerm.findFirst({
    where: { id: data.id, userId },
  });

  if (!current) {
    return {
      success: false,
      error: "Istilah tidak ditemukan di kamus Anda.",
    };
  }

  // 2. Jika nama istilah diubah, periksa duplikasi termKey baru
  let newTermKey = current.termKey;
  if (data.term && data.term.trim() !== current.term) {
    newTermKey = normalizeTermKey(data.term);
    if (newTermKey !== current.termKey) {
      const duplicate = await prisma.glossaryTerm.findUnique({
        where: {
          userId_termKey: {
            userId,
            termKey: newTermKey,
          },
        },
      });

      if (duplicate && duplicate.id !== current.id) {
        return {
          success: false,
          error: `Istilah "${data.term}" sudah ada di kamus Anda.`,
          existingId: duplicate.id,
        };
      }
    }
  }

  // 3. Periksa validitas courseId jika diperbarui
  if (data.courseId && data.courseId !== current.courseId) {
    const course = await prisma.course.findFirst({
      where: {
        id: data.courseId,
        ...visibleCoursesWhere(user, { includeArchived: true }),
      },
    });

    if (!course) {
      return {
        success: false,
        error: "Mata kuliah tidak ditemukan atau tidak memiliki izin akses.",
      };
    }
  }

  // 4. Hitung ringkasan baru bila diperlukan
  let finalShortDef = current.shortDefinition;
  if (data.shortDefinition !== undefined) {
    finalShortDef = data.shortDefinition?.trim() || null;
  }
  // Jika ringkasan kosong dan catatan ada, fallback otomatis ke kalimat pertama
  const finalBody = data.body !== undefined ? data.body.trim() : current.body;
  if (!finalShortDef && finalBody) {
    finalShortDef = extractSummaryFromBody(finalBody);
  }

  const updated = await prisma.glossaryTerm.update({
    where: { id: current.id },
    data: {
      term: data.term !== undefined ? data.term.trim() : undefined,
      termKey: newTermKey,
      shortDefinition: finalShortDef || null,
      body: finalBody,
      courseId: data.courseId === "" ? null : data.courseId,
      tags: data.tags !== undefined ? data.tags : undefined,
      source: data.source !== undefined ? (data.source ? data.source.trim() : null) : undefined,
      verified: data.verified !== undefined ? data.verified : undefined,
    },
    include: {
      course: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  revalidatePath("/home/kosakata");

  return {
    success: true,
    message: "Istilah berhasil diperbarui.",
    data: serializeGlossaryTerm(updated),
    term: serializeGlossaryTerm(updated),
  };
}

/**
 * Mengarsipkan istilah.
 */
export async function archiveGlossaryTerm(id: string): Promise<GlossaryActionResult> {
  const user = await requireUser();
  assertCanMutate(user);
  const userId = user.user!.id;

  const current = await prisma.glossaryTerm.findFirst({
    where: { id, userId },
  });

  if (!current) {
    return {
      success: false,
      error: "Istilah tidak ditemukan di kamus Anda.",
    };
  }

  const updated = await prisma.glossaryTerm.update({
    where: { id },
    data: { archivedAt: new Date() },
    include: {
      course: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  revalidatePath("/home/kosakata");

  return {
    success: true,
    message: `Istilah "${updated.term}" berhasil diarsipkan.`,
    data: serializeGlossaryTerm(updated),
    term: serializeGlossaryTerm(updated),
  };
}

/**
 * Memulihkan istilah dari arsip.
 */
export async function restoreGlossaryTerm(id: string): Promise<GlossaryActionResult> {
  const user = await requireUser();
  assertCanMutate(user);
  const userId = user.user!.id;

  const current = await prisma.glossaryTerm.findFirst({
    where: { id, userId },
  });

  if (!current) {
    return {
      success: false,
      error: "Istilah tidak ditemukan di kamus Anda.",
    };
  }

  // Cek apakah ada istilah aktif lain dengan termKey yang sama
  const activeConflict = await prisma.glossaryTerm.findFirst({
    where: {
      userId,
      termKey: current.termKey,
      archivedAt: null,
      id: { not: current.id },
    },
  });

  if (activeConflict) {
    return {
      success: false,
      error: `Istilah "${current.term}" sudah ada pada daftar istilah aktif.`,
      existingId: activeConflict.id,
    };
  }

  const updated = await prisma.glossaryTerm.update({
    where: { id },
    data: { archivedAt: null },
    include: {
      course: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  revalidatePath("/home/kosakata");

  return {
    success: true,
    message: `Istilah "${updated.term}" berhasil dipulihkan ke daftar aktif.`,
    data: serializeGlossaryTerm(updated),
    term: serializeGlossaryTerm(updated),
  };
}

/**
 * Menghapus istilah secara permanen.
 */
export async function deleteGlossaryTerm(id: string): Promise<GlossaryActionResult> {
  const user = await requireUser();
  assertCanMutate(user);
  const userId = user.user!.id;

  const current = await prisma.glossaryTerm.findFirst({
    where: { id, userId },
  });

  if (!current) {
    return {
      success: false,
      error: "Istilah tidak ditemukan di kamus Anda.",
    };
  }

  await prisma.glossaryTerm.delete({
    where: { id },
  });

  revalidatePath("/home/kosakata");

  return {
    success: true,
    message: `Istilah "${current.term}" berhasil dihapus.`,
  };
}

/**
 * Mengambil detail satu istilah milik user.
 */
export async function getGlossaryTerm(id: string): Promise<GlossaryTermDto | null> {
  const user = await requireUser();
  const userId = user.user!.id;

  const term = await prisma.glossaryTerm.findFirst({
    where: { id, userId },
    include: {
      course: {
        select: { id: true, name: true, code: true },
      },
    },
  });

  if (!term) return null;
  return serializeGlossaryTerm(term);
}

/**
 * Mengambil daftar istilah (pencarian, filter mata kuliah dan tag, urutan, paginasi).
 */
export async function listGlossaryTerms(
  rawQuery: ListGlossaryTermsQuery = {}
): Promise<ListGlossaryTermsResult> {
  const user = await requireUser();
  const userId = user.user!.id;

  const parsedQuery = ListGlossaryTermsQuerySchema.parse(rawQuery);
  const { search, courseId, tag, verified, isArchived, sortBy, page, limit } =
    parsedQuery;

  const where: Prisma.GlossaryTermWhereInput = {
    userId,
    archivedAt: isArchived ? { not: null } : null,
  };

  if (courseId && courseId !== "all") {
    where.courseId = courseId;
  }

  if (tag && tag !== "all") {
    where.tags = { has: tag };
  }

  if (typeof verified === "boolean") {
    where.verified = verified;
  }

  if (search && search.trim().length > 0) {
    const s = search.trim();
    const termKeySearch = normalizeTermKey(s);
    where.OR = [
      { term: { contains: s, mode: "insensitive" } },
      { termKey: { contains: termKeySearch, mode: "insensitive" } },
      { shortDefinition: { contains: s, mode: "insensitive" } },
      { body: { contains: s, mode: "insensitive" } },
      { tags: { has: s } },
    ];
  }

  let orderBy: Prisma.GlossaryTermOrderByWithRelationInput;
  switch (sortBy) {
    case "term_desc":
      orderBy = { term: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "term_asc":
    default:
      orderBy = { term: "asc" };
      break;
  }

  const [total, items] = await Promise.all([
    prisma.glossaryTerm.count({ where }),
    prisma.glossaryTerm.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        course: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
  ]);

  return {
    items: items.map(serializeGlossaryTerm),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Mengambil daftar seluruh tag yang digunakan oleh istilah user.
 */
export async function getGlossaryUserTags(): Promise<string[]> {
  const user = await requireUser();
  const userId = user.user!.id;

  const terms = await prisma.glossaryTerm.findMany({
    where: { userId },
    select: { tags: true },
  });

  const tagSet = new Set<string>();
  for (const t of terms) {
    for (const tag of t.tags) {
      if (tag && tag.trim()) tagSet.add(tag.trim());
    }
  }

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}
