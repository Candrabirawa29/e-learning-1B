"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession, assertCanMutate } from "@/lib/auth/session";
import { canCreateTask, canEditTask, canDeleteTask } from "@/lib/auth/rbac";
import { createTaskSchema, updateTaskSchema, updateProgressSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { ActivityAction, TaskPriority, TaskStatus, TaskTargetType } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createTaskAction(data: {
  title: string;
  description?: string;
  courseId?: string | null;
  priority: TaskPriority;
  deadline?: string | null;
  targetType: TaskTargetType;
  assignees?: string[];
  attachmentUrl?: string;
  submissionUrl?: string;
}) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login untuk membuat tugas.");
  }
  assertCanMutate(session);

  if (!canCreateTask(session, data.courseId)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk membuat tugas pada mata kuliah ini.");
  }

  const parsed = createTaskSchema.parse(data);

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) {
    throw new Error("Kelas 1-B tidak ditemukan di sistem.");
  }

  const task = await prisma.task.create({
    data: {
      classId: class1B.id,
      courseId: parsed.courseId || null,
      title: parsed.title,
      description: parsed.description || null,
      priority: parsed.priority,
      status: TaskStatus.TODO,
      deadline: parsed.deadline ? new Date(parsed.deadline) : null,
      targetType: parsed.targetType,
      createdById: session.profile.id,
      attachmentUrl: parsed.attachmentUrl || null,
      submissionUrl: parsed.submissionUrl || null,
      assignments:
        parsed.targetType === TaskTargetType.SPECIFIC && parsed.assignees && parsed.assignees.length > 0
          ? {
              create: parsed.assignees.map((profileId) => ({
                profileId,
              })),
            }
          : undefined,
    },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.TASK_CREATED,
    entityType: "Task",
    entityId: task.id,
    metadata: {
      title: task.title,
      targetType: task.targetType,
      assignedCount: parsed.targetType === TaskTargetType.SPECIFIC ? parsed.assignees?.length : "ALL",
    },
  });

  revalidatePath("/home/tasks");
  revalidatePath("/home/materials");
  revalidatePath("/tasks");
  revalidatePath("/home");
  revalidatePath("/");

  return { success: true, taskId: task.id };
}

export async function updateTaskAction(
  taskId: string,
  data: {
    title: string;
    description?: string;
    courseId?: string | null;
    priority: TaskPriority;
    deadline?: string | null;
    targetType: TaskTargetType;
    assignees?: string[];
    attachmentUrl?: string;
    submissionUrl?: string;
  }
) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignments: true },
  });
  if (!existingTask) {
    throw new Error("Tugas tidak ditemukan.");
  }

  if (!canEditTask(existingTask, session)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengedit tugas ini.");
  }

  const parsed = updateTaskSchema.parse(data);

  // Jika targetType berubah atau di-update:
  if (parsed.targetType === TaskTargetType.ALL) {
    // Bersihkan task_assignments jika pindah ke ALL
    await prisma.taskAssignment.deleteMany({
      where: { taskId },
    });
  } else if (parsed.targetType === TaskTargetType.SPECIFIC) {
    // Reset dan masukkan assignees baru
    await prisma.taskAssignment.deleteMany({
      where: { taskId },
    });
    if (parsed.assignees && parsed.assignees.length > 0) {
      await prisma.taskAssignment.createMany({
        data: parsed.assignees.map((profileId) => ({
          taskId,
          profileId,
        })),
      });
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: parsed.title,
      description: parsed.description || null,
      courseId: parsed.courseId || null,
      priority: parsed.priority,
      deadline: parsed.deadline ? new Date(parsed.deadline) : null,
      targetType: parsed.targetType,
      attachmentUrl: parsed.attachmentUrl || null,
      submissionUrl: parsed.submissionUrl || null,
    },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.TASK_UPDATED,
    entityType: "Task",
    entityId: updated.id,
    metadata: { title: updated.title, targetType: updated.targetType },
  });

  revalidatePath("/home/tasks");
  revalidatePath("/home/materials");
  revalidatePath("/tasks");
  revalidatePath("/home");
  revalidatePath("/");

  return { success: true };
}

export async function deleteTaskAction(taskId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
  });
  if (!existingTask) {
    throw new Error("Tugas tidak ditemukan.");
  }

  if (!canDeleteTask(existingTask, session)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk menghapus tugas ini.");
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.TASK_DELETED,
    entityType: "Task",
    entityId: taskId,
    metadata: { title: existingTask.title },
  });

  revalidatePath("/home/tasks");
  revalidatePath("/home/materials");
  revalidatePath("/tasks");
  revalidatePath("/home");
  revalidatePath("/");

  return { success: true };
}

export async function updateTaskProgressAction(
  taskId: string,
  data: {
    status: TaskStatus;
    progress?: number;
    notes?: string;
  }
) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  let defaultProgress = data.progress;
  if (defaultProgress === undefined) {
    if (data.status === TaskStatus.DONE) defaultProgress = 100;
    else if (data.status === TaskStatus.IN_PROGRESS) defaultProgress = 50;
    else defaultProgress = 0;
  }

  const parsed = updateProgressSchema.parse({
    status: data.status,
    progress: defaultProgress,
    notes: data.notes,
  });

  // Verifikasi tugas dapat diakses user
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignments: {
        where: { profileId: session.profile.id },
      },
    },
  });

  if (!task) {
    throw new Error("Tugas tidak ditemukan.");
  }

  // Jika tugas ditujukan ke SPECIFIC dan user bukan assignee serta bukan admin/creator:
  if (
    task.targetType === TaskTargetType.SPECIFIC &&
    task.assignments.length === 0 &&
    session.realRole !== "ADMIN" &&
    task.createdById !== session.profile.id
  ) {
    throw new Error("Tugas ini tidak ditugaskan kepada Anda.");
  }

  // Upsert progress personal mahasiswa
  await prisma.taskProgress.upsert({
    where: {
      taskId_profileId: {
        taskId,
        profileId: session.profile.id,
      },
    },
    update: {
      status: parsed.status,
      progress: parsed.progress,
      notes: parsed.notes || null,
    },
    create: {
      taskId,
      profileId: session.profile.id,
      status: parsed.status,
      progress: parsed.progress,
      notes: parsed.notes || null,
    },
  });

  revalidatePath("/home/tasks");
  revalidatePath("/home");
  revalidatePath("/");

  return { success: true };
}
