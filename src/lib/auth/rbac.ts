import { CurrentUserSession } from "./session";
import { Role } from "@prisma/client";

export function canCreateTask(session: CurrentUserSession): boolean {
  if (session.isViewAs) {
    return session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";
  }
  return session.realRole === Role.ADMIN || session.realRole === Role.PJ;
}

export function canEditTask(
  task: { createdById: string },
  session: CurrentUserSession
): boolean {
  if (session.isViewAs) return false;
  if (session.realRole === Role.ADMIN) return true;
  if (session.realRole === Role.PJ && session.user?.id === task.createdById) return true;
  return false;
}

export function canDeleteTask(
  task: { createdById: string },
  session: CurrentUserSession
): boolean {
  return canEditTask(task, session);
}

export function canUploadMaterial(session: CurrentUserSession): boolean {
  if (session.isViewAs) {
    return session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";
  }
  return session.realRole === Role.ADMIN || session.realRole === Role.PJ;
}

export function canManageMaterial(
  material: { uploadedById: string },
  session: CurrentUserSession
): boolean {
  if (session.isViewAs) return false;
  if (session.realRole === Role.ADMIN) return true;
  if (session.realRole === Role.PJ && session.user?.id === material.uploadedById) return true;
  return false;
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

export function canCreateAssignment(session: CurrentUserSession): boolean {
  if (session.isViewAs) {
    return session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";
  }
  return session.realRole === Role.ADMIN || session.realRole === Role.PJ;
}

export function canManageAssignment(
  assignment: { createdById: string },
  session: CurrentUserSession
): boolean {
  if (session.isViewAs) return false;
  if (session.realRole === Role.ADMIN) return true;
  if (session.realRole === Role.PJ && session.user?.id === assignment.createdById) return true;
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
