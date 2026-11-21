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
  task: { courseId?: string | null; createdById?: string | null },
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
  task: { courseId?: string | null; createdById?: string | null },
  session: CurrentUserSession
): boolean {
  if (!session.user) return false;

  // Admin can delete any task
  if (session.effectiveRole === "ADMIN") return true;

  // Creator can delete their own task
  if (task.createdById && session.user.id === task.createdById) {
    return true;
  }

  // PJ of that task's course, or any PJ if task has no course
  if (session.effectiveRole === "PJ") {
    if (!task.courseId) return true;
    return session.assignedCourseIds?.includes(task.courseId) ?? false;
  }

  return false;
}

export function canUploadMaterial(
  session: CurrentUserSession,
  course?: { id?: string; kind?: "REGULAR" | "EXTRA" | null; ownerId?: string | null } | string | null
): boolean {
  if (!session.user) return false;

  // EXTRA hanya pemilik yang boleh menambah materi
  if (course && typeof course === "object" && course.kind === "EXTRA") {
    return session.user.id === course.ownerId;
  }

  // Admin memiliki hak penuh untuk REGULAR
  if (session.effectiveRole === "ADMIN") return true;

  // PJ dapat mengunggah ke mata kuliah yang ditugaskan atau materi umum
  if (session.effectiveRole === "PJ") {
    const courseId = typeof course === "string" ? course : course?.id;
    if (!courseId) return true;
    return session.assignedCourseIds?.includes(courseId) ?? false;
  }

  // Regular members are read-only for regular course materials
  return false;
}

export function canManageMaterial(
  material: {
    courseId?: string | null;
    uploadedById?: string | null;
    course?: { id?: string; kind?: "REGULAR" | "EXTRA" | null; ownerId?: string | null } | null;
  },
  session: CurrentUserSession
): boolean {
  if (!session.user) return false;

  // EXTRA hanya pemilik yang boleh mengelola materi
  if (material.course && material.course.kind === "EXTRA") {
    return session.user.id === material.course.ownerId;
  }

  // Admin memiliki hak penuh
  if (session.effectiveRole === "ADMIN") return true;

  // Pengunggah materi dapat mengelola materi miliknya sendiri
  if (material.uploadedById && session.user.id === material.uploadedById) {
    return true;
  }

  // PJ dapat mengelola materi pada mata kuliah yang ditugaskan atau materi umum
  if (session.effectiveRole === "PJ") {
    if (!material.courseId) return true;
    return session.assignedCourseIds?.includes(material.courseId) ?? false;
  }

  return false;
}

export function canManageTopic(
  session: CurrentUserSession,
  course?: { id?: string; kind?: "REGULAR" | "EXTRA" | null; ownerId?: string | null } | string | null
): boolean {
  if (!session.user) return false;

  // EXTRA hanya pemilik yang boleh mengelola sub-topik
  if (course && typeof course === "object" && course.kind === "EXTRA") {
    return session.user.id === course.ownerId;
  }

  // Admin memiliki hak penuh
  if (session.effectiveRole === "ADMIN") return true;

  // PJ dapat mengelola topik pada mata kuliah yang ditugaskan atau topik umum
  if (session.effectiveRole === "PJ") {
    const courseId = typeof course === "string" ? course : course?.id;
    if (!courseId) return true;
    return session.assignedCourseIds?.includes(courseId) ?? false;
  }

  return false;
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
