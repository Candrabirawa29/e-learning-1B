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
  courseId?: string | null
): boolean {
  if (!session.user) return false;

  if (session.effectiveRole === "ADMIN") return true;
  if (session.effectiveRole === "PJ") {
    if (!courseId) return true;
    return session.assignedCourseIds?.includes(courseId) ?? false;
  }

  return false;
}

export function canCreateTask(
  session: CurrentUserSession,
  courseId?: string | null
): boolean {
  return canManageCourse(session, courseId);
}

export function canEditTask(
  task: { courseId?: string | null; createdById?: string },
  session: CurrentUserSession
): boolean {
  return canManageCourse(session, task.courseId);
}

export function canDeleteTask(
  task: { courseId?: string | null; createdById?: string },
  session: CurrentUserSession
): boolean {
  return canEditTask(task, session);
}

export function canUploadMaterial(
  session: CurrentUserSession,
  courseId?: string | null
): boolean {
  return canManageCourse(session, courseId);
}

export function canManageMaterial(
  material: { courseId?: string | null; uploadedById?: string },
  session: CurrentUserSession
): boolean {
  return canManageCourse(session, material.courseId);
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
