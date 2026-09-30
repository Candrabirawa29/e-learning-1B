import { prisma } from "@/lib/prisma";
import { ActivityAction } from "@prisma/client";

export async function logActivity({
  actorId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  actorId?: string | null;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    // Sanitasi metadata agar tidak pernah memuat password atau rahasia
    const safeMetadata = metadata ? { ...metadata } : {};
    delete safeMetadata.password;
    delete safeMetadata.newPassword;
    delete safeMetadata.oldPassword;
    delete safeMetadata.token;

    await prisma.activityLog.create({
      data: {
        actorId: actorId || null,
        action,
        entityType,
        entityId: entityId || null,
        metadata: Object.keys(safeMetadata).length > 0 ? JSON.stringify(safeMetadata) : null,
      },
    });
  } catch (error) {
    // Activity logging should not fail the main user transaction
    console.error("Gagal mencatat log aktivitas:", error);
  }
}
