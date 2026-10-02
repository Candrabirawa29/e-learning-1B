import { CurrentUserSession } from "./session";
import { Role } from "@prisma/client";

/**
 * Centralized permission:
 * Admin = all
 * PJ = only courses in CoursePJ (can edit fellow PJ's content in that course)
 * Content without course = any PJ can manage
 */
export function canManageCourse(
  session: CurrentUserSession,
  courseId?: string | null
): boolean {
  if (!session.user) return false;

  if (session.isViewAs) {
    if (session.effectiveRole === "ADMIN") return true;
    if (session.effectiveRole === "PJ") {
      if (!courseId) return true;
      return session.assignedCourseIds?.includes(courseId) ?? false;
    }
    return false;
  }

  if (session.realRole === Role.ADMIN) return true;
  if (session.realRole === Role.PJ) {
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
  if (session.isViewAs) {
    if (session.effectiveRole === "ADMIN") return true;
    if (session.effectiveRole === "PJ") {
      return canManageCourse(session, task.courseId);
    }
    return false;
  }
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
  if (session.isViewAs) {
    return session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";
  }
  return session.realRole === Role.ADMIN || session.realRole === Role.PJ;
}

export function canManageAnnouncement(
  announcement: { createdById: string },
  session: CurrentUserSession
): boolean {
  if (session.isViewAs) return false;
  if (session.realRole === Role.ADMIN) return true;
  if (session.realRole === Role.PJ && session.user?.id === announcement.createdById) return true;
  return false;
}

export function canManageMembers(session: CurrentUserSession): boolean {
  if (session.isViewAs) return false;
  return session.realRole === Role.ADMIN;
}

export function canViewAuditLog(session: CurrentUserSession): boolean {
  if (session.isViewAs) return false;
  return session.realRole === Role.ADMIN;
}
