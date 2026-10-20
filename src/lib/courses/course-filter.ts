import { Prisma, CourseKind } from "@prisma/client";
import { CurrentUserSession } from "@/lib/auth/session";

export interface VisibleCoursesOptions {
  includeArchived?: boolean;
  onlyArchived?: boolean;
  classId?: string;
  kind?: CourseKind;
}

/**
 * Helper terpusat untuk menyaring Course yang boleh dilihat oleh user:
 * - REGULAR: selalu bisa dilihat jika tidak diarsipkan.
 * - EXTRA: hanya bisa dilihat jika visibility = CLASS atau ownerId = user.id.
 * - archivedAt null secara default, kecuali includeArchived = true atau onlyArchived = true.
 */
export function visibleCoursesWhere(
  user?: CurrentUserSession | { id?: string; user?: { id?: string } } | string | null,
  options: VisibleCoursesOptions = {}
): Prisma.CourseWhereInput {
  const userId =
    typeof user === "string"
      ? user
      : user && "user" in user && user.user
      ? user.user.id
      : user && "id" in user
      ? user.id
      : undefined;

  const conditions: Prisma.CourseWhereInput[] = [];

  if (options.onlyArchived) {
    conditions.push({ archivedAt: { not: null } });
    if (options.kind === "REGULAR") {
      conditions.push({ kind: "REGULAR" });
    } else if (options.kind === "EXTRA") {
      conditions.push({
        kind: "EXTRA",
        ...(userId ? { ownerId: userId } : { id: "impossible" }),
      });
    } else {
      conditions.push({
        OR: [
          { kind: "REGULAR" },
          ...(userId ? [{ kind: CourseKind.EXTRA, ownerId: userId }] : []),
        ],
      });
    }
  } else if (options.includeArchived) {
    if (options.kind === "REGULAR") {
      conditions.push({ kind: "REGULAR" });
    } else if (options.kind === "EXTRA") {
      conditions.push({
        kind: "EXTRA",
        OR: [
          { visibility: "CLASS", archivedAt: null },
          ...(userId ? [{ ownerId: userId }] : []),
        ],
      });
    } else {
      conditions.push({
        OR: [
          { kind: "REGULAR" },
          {
            kind: "EXTRA",
            OR: [
              { visibility: "CLASS", archivedAt: null },
              ...(userId ? [{ ownerId: userId }] : []),
            ],
          },
        ],
      });
    }
  } else {
    conditions.push({ archivedAt: null });

    if (options.kind === "REGULAR") {
      conditions.push({ kind: "REGULAR" });
    } else if (options.kind === "EXTRA") {
      conditions.push({
        kind: "EXTRA",
        OR: [
          { visibility: "CLASS" },
          ...(userId ? [{ ownerId: userId }] : []),
        ],
      });
    } else {
      conditions.push({
        OR: [
          { kind: "REGULAR" },
          {
            kind: "EXTRA",
            OR: [
              { visibility: "CLASS" },
              ...(userId ? [{ ownerId: userId }] : []),
            ],
          },
        ],
      });
    }
  }

  if (options.classId) {
    conditions.push({ classId: options.classId });
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { AND: conditions };
}

/**
 * Helper SQL fragment untuk $queryRaw yang menyertakan Course JOIN:
 * Menyaring baris Course agar mematuhi aturan visibilitas yang sama.
 */
export function visibleCoursesSql(
  userId?: string | null,
  options: { courseAlias?: string; includeArchived?: boolean } = {}
) {
  const alias = options.courseAlias ?? "c";
  const archivedCondition = options.includeArchived
    ? Prisma.empty
    : Prisma.sql`AND (${Prisma.raw(alias)}.id IS NULL OR ${Prisma.raw(alias)}."archivedAt" IS NULL)`;

  return Prisma.sql`
    AND (
      ${Prisma.raw(alias)}.id IS NULL OR
      ${Prisma.raw(alias)}."kind" = 'REGULAR' OR
      (
        ${Prisma.raw(alias)}."kind" = 'EXTRA' AND
        (${Prisma.raw(alias)}."visibility" = 'CLASS' ${
          userId ? Prisma.sql`OR ${Prisma.raw(alias)}."ownerId" = ${userId}` : Prisma.empty
        })
      )
    )
    ${archivedCondition}
  `;
}
