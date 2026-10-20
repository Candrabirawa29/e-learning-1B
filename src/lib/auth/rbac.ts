import { CurrentUserSession } from "./session";

/**
 * Centralized permissions:
 * - Admin: Full access across all courses and management
 * - PJ: Can manage courses assigned to them, and general content without a course
 * - Member: Cannot manage courses, materials, or class tasks
 * - Guest: Read-only for public materials and tasks
 */

export function canCreateCourse(session: CurrentUserSession): boolean {
  if (!session.user) return false;
  return session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";
}

export function canDeleteCourse(session: CurrentUserSession): boolean {
  if (!session.user) return false;
  return session.effectiveRole === "ADMIN";
}

export function canManageCourse(
  session: CurrentUserSession,
  course?: { id?: string; kind?: "REGULAR" | "EXTRA" | null; ownerId?: string | null } | string | null
): boolean {
  if (!session.user) return false;

  // EXTRA hanya pemilik yang boleh mengelola
  if (course && typeof course === "object" && course.kind === "EXTRA") {
    return session.user.id === course.ownerId;
  }

  // Admin memiliki hak penuh untuk REGULAR
  if (session.effectiveRole === "ADMIN") return true;

  // PJ dapat mengelola mata kuliah REGULAR yang ditugaskan
  if (session.effectiveRole === "PJ") {
    const courseId = typeof course === "string" ? course : course?.id;
    if (!courseId) return true;
    return session.assignedCourseIds?.includes(courseId) ?? false;
  }

  return false;
}

export function canArchiveCourse(
  session: CurrentUserSession,
  course?: { id?: string; kind?: "REGULAR" | "EXTRA" | null; ownerId?: string | null } | null
): boolean {
  if (!session.user) return false;
  // Admin boleh mengarsipkan semua mata kuliah/topik
  if (session.effectiveRole === "ADMIN") return true;
  // Untuk EXTRA, pemilik boleh mengarsipkan
  if (course && course.kind === "EXTRA") {
    return session.user.id === course.ownerId;
  }
  return false;
}

export function canCreateTask(
  session: CurrentUserSession,
  courseId?: string | null
): boolean {
  void courseId;
  if (!session.user) return false;
  return (
    session.effectiveRole === "ADMIN" ||
    session.effectiveRole === "PJ" ||
    session.effectiveRole === "MEMBER"
  );
}

export function canEditTask(
  task: { courseId?: string | null; createdById?: string },
  session: CurrentUserSession
): boolean {
  void task;
  if (!session.user) return false;
  return (
    session.effectiveRole === "ADMIN" ||
    session.effectiveRole === "PJ" ||
    session.effectiveRole === "MEMBER"
  );
}

export function canDeleteTask(
  task: { courseId?: string | null; createdById?: string },
  session: CurrentUserSession
): boolean {
  void task;
  if (!session.user) return false;
  return (
    session.effectiveRole === "ADMIN" ||
    session.effectiveRole === "PJ" ||
    session.effectiveRole === "MEMBER"
  );
}

export function canUploadMaterial(
  session: CurrentUserSession,
  course?: { id?: string; kind?: "REGULAR" | "EXTRA" | null; ownerId?: string | null } | string | null
): boolean {
  if (!session.user) return false;
  if (course && typeof course === "object" && course.kind === "EXTRA") {
    return session.user.id === course.ownerId;
  }
  return (
    session.effectiveRole === "ADMIN" ||
    session.effectiveRole === "PJ" ||
    session.effectiveRole === "MEMBER"
  );
}

export function canManageMaterial(
  material: { courseId?: string | null; uploadedById?: string; course?: { kind?: "REGULAR" | "EXTRA" | null; ownerId?: string | null } | null },
  session: CurrentUserSession
): boolean {
  if (!session.user) return false;
  if (material.course && material.course.kind === "EXTRA") {
    return session.user.id === material.course.ownerId;
  }
  return (
    session.effectiveRole === "ADMIN" ||
    session.effectiveRole === "PJ" ||
    session.effectiveRole === "MEMBER"
  );
}

export function canManageTopic(
  session: CurrentUserSession,
  course?: { id?: string; kind?: "REGULAR" | "EXTRA" | null; ownerId?: string | null } | string | null
): boolean {
  if (!session.user) return false;
  if (course && typeof course === "object" && course.kind === "EXTRA") {
    return session.user.id === course.ownerId;
  }
  return (
    session.effectiveRole === "ADMIN" ||
    session.effectiveRole === "PJ" ||
    session.effectiveRole === "MEMBER"
  );
}

export function canCreateAnnouncement(session: CurrentUserSession): boolean {
  if (!session.user) return false;
  return session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";
}

export function canManageAnnouncement(
  announcement: { createdById: string },
  session: CurrentUserSession
): boolean {
  if (!session.user) return false;
  if (session.effectiveRole === "ADMIN") return true;
  if (session.effectiveRole === "PJ" && session.user.id === announcement.createdById) return true;
  return false;
}

export function canManageMembers(session: CurrentUserSession): boolean {
  if (!session.user) return false;
  return session.effectiveRole === "ADMIN";
}

export function canViewAuditLog(session: CurrentUserSession): boolean {
  if (!session.user) return false;
  return session.effectiveRole === "ADMIN";
}
