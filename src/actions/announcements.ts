"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession, assertCanMutate } from "@/lib/auth/session";
import { canCreateAnnouncement, canManageAnnouncement } from "@/lib/auth/rbac";
import { createAnnouncementSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createAnnouncementAction(data: {
  title: string;
  content: string;
  isPinned?: boolean;
}) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  if (!canCreateAnnouncement(session)) {
    throw new Error("Akses ditolak: Hanya PJ atau Admin yang dapat membuat pengumuman.");
  }

  const parsed = createAnnouncementSchema.parse(data);

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) {
    throw new Error("Kelas 1-B tidak ditemukan.");
  }

  const announcement = await prisma.announcement.create({
    data: {
      classId: class1B.id,
      title: parsed.title,
      content: parsed.content,
      isPinned: parsed.isPinned || false,
      createdById: session.profile.id,
    },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.ASSIGNMENT_CREATED, // or general announcement log
    entityType: "Announcement",
    entityId: announcement.id,
    metadata: { title: announcement.title, isPinned: announcement.isPinned },
  });

  revalidatePath("/home/announcements");
  revalidatePath("/home/manage/announcements");
  revalidatePath("/announcements");
  revalidatePath("/");

  return { success: true, announcementId: announcement.id };
}

export async function deleteAnnouncementAction(announcementId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement) {
    throw new Error("Pengumuman tidak ditemukan.");
  }

  if (!canManageAnnouncement(announcement, session)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk menghapus pengumuman ini.");
  }

  await prisma.announcement.delete({
    where: { id: announcementId },
  });

  revalidatePath("/home/announcements");
  revalidatePath("/home/manage/announcements");
  revalidatePath("/announcements");
  revalidatePath("/");

  return { success: true };
}
