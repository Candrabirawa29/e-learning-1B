"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession, assertCanMutate } from "@/lib/auth/session";
import { canCreateAssignment, canManageAssignment } from "@/lib/auth/rbac";
import { createAssignmentSchema, submitAssignmentSchema } from "@/lib/validations";
import { uploadToStorage, validateFile, sanitizeFileName, ALLOWED_SUBMISSION_MIME_TYPES } from "@/lib/supabase/storage";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createAssignmentAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  if (!canCreateAssignment(session)) {
    throw new Error("Akses ditolak: Hanya PJ atau Admin yang dapat membuat penugasan.");
  }

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || undefined;
  const courseId = formData.get("courseId") as string;
  const deadline = formData.get("deadline") as string;
  const attachmentUrl = (formData.get("attachmentUrl") as string) || undefined;

  const parsed = createAssignmentSchema.parse({
    title,
    description,
    courseId,
    deadline,
    attachmentUrl,
  });

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) {
    throw new Error("Kelas 1-B tidak ditemukan.");
  }

  const assignment = await prisma.assignment.create({
    data: {
      classId: class1B.id,
      courseId: parsed.courseId,
      title: parsed.title,
      description: parsed.description || null,
      deadline: new Date(parsed.deadline),
      attachmentUrl: parsed.attachmentUrl || null,
      createdById: session.profile.id,
      allowSubmissions: true,
    },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.ASSIGNMENT_CREATED,
    entityType: "Assignment",
    entityId: assignment.id,
    metadata: { title: assignment.title, deadline: assignment.deadline },
  });

  revalidatePath("/home/assignments");
  revalidatePath("/home/manage/assignments");
  revalidatePath("/assignments");
  revalidatePath("/");

  return { success: true, assignmentId: assignment.id };
}

export async function deleteAssignmentAction(assignmentId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) {
    throw new Error("Penugasan tidak ditemukan.");
  }

  if (!canManageAssignment(assignment, session)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk menghapus penugasan ini.");
  }

  await prisma.assignment.delete({
    where: { id: assignmentId },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.ASSIGNMENT_DELETED,
    entityType: "Assignment",
    entityId: assignmentId,
    metadata: { title: assignment.title },
  });

  revalidatePath("/home/assignments");
  revalidatePath("/home/manage/assignments");
  revalidatePath("/assignments");
  revalidatePath("/");

  return { success: true };
}

export async function submitAssignmentAction(assignmentId: string, formData: FormData) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login untuk mengumpulkan tugas.");
  }
  assertCanMutate(session);

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) {
    throw new Error("Penugasan tidak ditemukan.");
  }

  if (!assignment.allowSubmissions) {
    throw new Error("Pengumpulan untuk tugas ini telah ditutup.");
  }

  const linkUrl = (formData.get("linkUrl") as string) || undefined;
  const notes = (formData.get("notes") as string) || undefined;
  const file = formData.get("file") as File | null;

  const parsed = submitAssignmentSchema.parse({ linkUrl, notes });

  let storagePath: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;

  if (file && file.size > 0 && file.name) {
    const fileValidation = validateFile(file, ALLOWED_SUBMISSION_MIME_TYPES);
    if (!fileValidation.valid) {
      throw new Error(fileValidation.error || "File tidak valid.");
    }

    const cleanName = sanitizeFileName(file.name);
    const path = `${assignmentId}/${session.profile.id}/${Date.now()}_${cleanName}`;

    const uploadRes = await uploadToStorage("submissions", path, file);
    if (uploadRes.error) {
      throw new Error(`Gagal mengunggah file: ${uploadRes.error}`);
    }

    storagePath = uploadRes.storagePath;
    fileName = file.name;
    fileSize = file.size;
  }

  const submission = await prisma.submission.upsert({
    where: {
      assignmentId_profileId: {
        assignmentId,
        profileId: session.profile.id,
      },
    },
    update: {
      storagePath: storagePath || undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
      linkUrl: parsed.linkUrl || undefined,
      notes: parsed.notes || undefined,
      submittedAt: new Date(),
    },
    create: {
      assignmentId,
      profileId: session.profile.id,
      storagePath,
      fileName,
      fileSize,
      linkUrl: parsed.linkUrl || null,
      notes: parsed.notes || null,
      submittedAt: new Date(),
    },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.SUBMISSION_CREATED,
    entityType: "Submission",
    entityId: submission.id,
    metadata: {
      assignmentTitle: assignment.title,
      submittedAt: submission.submittedAt,
      isLate: submission.submittedAt > assignment.deadline,
    },
  });

  revalidatePath("/home/assignments");
  revalidatePath("/home/manage/assignments");
  revalidatePath("/assignments");

  return { success: true };
}
