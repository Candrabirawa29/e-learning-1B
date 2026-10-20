"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession, assertCanMutate } from "@/lib/auth/session";
import { canManageCourse, canManageTopic, canArchiveCourse } from "@/lib/auth/rbac";
import { createCourseSchema, courseScheduleSchema, topicSchema } from "@/lib/validations";
import { Role, CourseKind, CourseVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createExtraCourseAction(data: {
  name: string;
  description?: string | null;
  visibility?: CourseVisibility;
}) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const name = data.name?.trim();
  if (!name) {
    throw new Error("Nama topik belajar mandiri tidak boleh kosong.");
  }

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) {
    throw new Error("Kelas 1-B tidak ditemukan.");
  }

  const targetVisibility =
    data.visibility === CourseVisibility.CLASS
      ? CourseVisibility.CLASS
      : CourseVisibility.PRIVATE;

  const course = await prisma.course.create({
    data: {
      classId: class1B.id,
      name,
      description: data.description?.trim() || null,
      kind: CourseKind.EXTRA,
      visibility: targetVisibility,
      ownerId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      code: true,
      kind: true,
      visibility: true,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");

  return { success: true, course };
}

export async function archiveCourseAction(courseId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new Error("Mata kuliah / topik tidak ditemukan.");
  }

  if (!canArchiveCourse(session, course)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengarsipkan mata kuliah/topik ini.");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      archivedAt: new Date(),
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${courseId}`);
  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true };
}

export async function unarchiveCourseAction(courseId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new Error("Mata kuliah / topik tidak ditemukan.");
  }

  if (!canArchiveCourse(session, course)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk memulihkan mata kuliah/topik ini.");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      archivedAt: null,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${courseId}`);
  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true };
}

export async function updateCourseVisibilityAction(
  courseId: string,
  visibility: CourseVisibility
) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new Error("Mata kuliah / topik tidak ditemukan.");
  }

  if (course.kind !== CourseKind.EXTRA) {
    throw new Error("Pengaturan visibilitas publik/pribadi hanya berlaku untuk topik belajar mandiri (EXTRA).");
  }

  if (course.ownerId !== session.user.id && session.effectiveRole !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya pemilik topik yang dapat mengubah visibilitas.");
  }

  if (visibility !== CourseVisibility.PRIVATE && visibility !== CourseVisibility.CLASS) {
    throw new Error("Visibilitas tidak valid. Pilih PRIVATE atau CLASS.");
  }

  await prisma.course.update({
    where: { id: courseId },
    data: {
      visibility,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${courseId}`);
  revalidatePath("/home/focus");
  revalidatePath("/home/study-analytics");
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true, visibility };
}

export async function createCourseAction(data: {
  name: string;
  code?: string | null;
  description?: string | null;
  lecturer?: string | null;
}) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const canCreate =
    session.effectiveRole === "ADMIN" || session.effectiveRole === "PJ";

  if (!canCreate) {
    throw new Error("Akses ditolak: Hanya Admin dan PJ yang dapat membuat mata kuliah baru.");
  }

  const parsed = createCourseSchema.parse(data);

  const class1B = await prisma.class.findUnique({ where: { code: "1-B" } });
  if (!class1B) {
    throw new Error("Kelas 1-B tidak ditemukan.");
  }

  const course = await prisma.course.create({
    data: {
      classId: class1B.id,
      name: parsed.name,
      code: parsed.code || null,
      description: parsed.description || null,
      lecturer: parsed.lecturer || null,
      kind: CourseKind.REGULAR,
      visibility: CourseVisibility.CLASS,
      ownerId: null,
      ...(session.effectiveRole === "PJ"
        ? {
            pjs: {
              create: {
                userId: session.user.id,
              },
            },
          }
        : {}),
    },
  });

  revalidatePath("/home/materials");
  revalidatePath("/home/tasks");
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true, courseId: course.id };
}

export async function updateCourseAction(
  courseId: string,
  data: {
    name: string;
    code?: string | null;
    description?: string | null;
    lecturer?: string | null;
  }
) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !canManageCourse(session, course)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengedit mata kuliah ini.");
  }

  const parsed = createCourseSchema.parse(data);

  await prisma.course.update({
    where: { id: courseId },
    data: {
      name: parsed.name,
      code: parsed.code || null,
      description: parsed.description || null,
      lecturer: parsed.lecturer || null,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${courseId}`);
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true };
}

export async function deleteCourseAction(courseId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new Error("Mata kuliah tidak ditemukan.");
  }

  // Jika EXTRA, diarahkan ke arsip (arsip alih-alih hapus)
  if (course.kind === CourseKind.EXTRA) {
    return archiveCourseAction(courseId);
  }

  if (session.effectiveRole !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya Admin yang dapat menghapus mata kuliah.");
  }

  await prisma.course.delete({
    where: { id: courseId },
  });

  revalidatePath("/home/materials");
  revalidatePath("/home/tasks");
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true };
}

// ================= SCHEDULE CRUD =================

export async function addCourseScheduleAction(data: {
  courseId: string;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
  room?: string | null;
}) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course || course.kind !== CourseKind.REGULAR) {
    throw new Error("Jadwal mingguan hanya berlaku untuk mata kuliah resmi (REGULAR).");
  }

  if (!canManageCourse(session, course)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengelola jadwal mata kuliah ini.");
  }

  const parsed = courseScheduleSchema.parse({
    dayOfWeek: data.dayOfWeek,
    startMinute: data.startMinute,
    endMinute: data.endMinute,
    room: data.room,
  });

  if (parsed.startMinute >= parsed.endMinute) {
    throw new Error("Waktu mulai harus lebih awal dari waktu selesai.");
  }

  const schedule = await prisma.courseSchedule.create({
    data: {
      courseId: data.courseId,
      dayOfWeek: parsed.dayOfWeek,
      startMinute: parsed.startMinute,
      endMinute: parsed.endMinute,
      room: parsed.room || null,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${data.courseId}`);
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true, scheduleId: schedule.id };
}

export async function updateCourseScheduleAction(
  scheduleId: string,
  data: {
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    room?: string | null;
  }
) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const schedule = await prisma.courseSchedule.findUnique({
    where: { id: scheduleId },
    include: { course: true },
  });
  if (!schedule) {
    throw new Error("Jadwal tidak ditemukan.");
  }

  if (schedule.course.kind !== CourseKind.REGULAR) {
    throw new Error("Jadwal mingguan hanya berlaku untuk mata kuliah resmi (REGULAR).");
  }

  if (!canManageCourse(session, schedule.course)) {
    throw new Error("Akses ditolak.");
  }

  const parsed = courseScheduleSchema.parse(data);

  if (parsed.startMinute >= parsed.endMinute) {
    throw new Error("Waktu mulai harus lebih awal dari waktu selesai.");
  }

  await prisma.courseSchedule.update({
    where: { id: scheduleId },
    data: {
      dayOfWeek: parsed.dayOfWeek,
      startMinute: parsed.startMinute,
      endMinute: parsed.endMinute,
      room: parsed.room || null,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${schedule.courseId}`);
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true };
}

export async function deleteCourseScheduleAction(scheduleId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const schedule = await prisma.courseSchedule.findUnique({
    where: { id: scheduleId },
    include: { course: true },
  });
  if (!schedule) {
    throw new Error("Jadwal tidak ditemukan.");
  }

  if (schedule.course.kind !== CourseKind.REGULAR) {
    throw new Error("Jadwal mingguan hanya berlaku untuk mata kuliah resmi (REGULAR).");
  }

  if (!canManageCourse(session, schedule.course)) {
    throw new Error("Akses ditolak.");
  }

  await prisma.courseSchedule.delete({
    where: { id: scheduleId },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${schedule.courseId}`);
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true };
}

// ================= TOPIC / SUB-TOPIC CRUD =================

export async function createTopicAction(data: {
  courseId: string;
  title: string;
  description?: string | null;
  order?: number;
}) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const course = await prisma.course.findUnique({ where: { id: data.courseId } });
  if (!course || !canManageTopic(session, course)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengelola sub-topik.");
  }

  const parsed = topicSchema.parse(data);

  // Jika order tidak dispesifikasikan, taruh di paling akhir
  let topicOrder = parsed.order;
  if (topicOrder === undefined || topicOrder === 0) {
    const highestTopic = await prisma.topic.findFirst({
      where: { courseId: data.courseId },
      orderBy: { order: "desc" },
    });
    topicOrder = (highestTopic?.order ?? -1) + 1;
  }

  const topic = await prisma.topic.create({
    data: {
      courseId: data.courseId,
      title: parsed.title,
      description: parsed.description || null,
      order: topicOrder,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${data.courseId}`);

  return { success: true, topicId: topic.id };
}

export async function updateTopicAction(
  topicId: string,
  data: {
    title: string;
    description?: string | null;
    order?: number;
  }
) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { course: true },
  });
  if (!topic) {
    throw new Error("Sub-topik tidak ditemukan.");
  }

  if (!canManageTopic(session, topic.course)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengedit sub-topik.");
  }

  const parsed = topicSchema.parse({
    title: data.title,
    description: data.description,
    order: data.order ?? topic.order,
  });

  await prisma.topic.update({
    where: { id: topicId },
    data: {
      title: parsed.title,
      description: parsed.description || null,
      order: parsed.order,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${topic.courseId}`);

  return { success: true };
}

export async function deleteTopicAction(topicId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { course: true },
  });
  if (!topic) {
    throw new Error("Sub-topik tidak ditemukan.");
  }

  if (!canManageTopic(session, topic.course)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk menghapus sub-topik.");
  }

  // Sesuai requirement: menghapus sub-topik memindahkan materi terkait ke "Umum" (topicId: null)
  await prisma.material.updateMany({
    where: { topicId },
    data: { topicId: null },
  });

  await prisma.topic.delete({
    where: { id: topicId },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${topic.courseId}`);

  return { success: true };
}

export async function reorderTopicsAction(courseId: string, orderedTopicIds: string[]) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || !canManageTopic(session, course)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengatur urutan sub-topik.");
  }

  await prisma.$transaction(
    orderedTopicIds.map((id, index) =>
      prisma.topic.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${courseId}`);

  return { success: true };
}

// ================= COURSE PJ ASSIGNMENT =================

export async function assignCoursePJAction(courseId: string, userIds: string[]) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  if (session.effectiveRole !== "ADMIN") {
    throw new Error("Akses ditolak: Hanya Admin yang dapat menetapkan PJ Mata Kuliah.");
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.kind !== CourseKind.REGULAR) {
    throw new Error("Penugasan PJ hanya berlaku untuk mata kuliah resmi (REGULAR).");
  }

  // Transaksi: ganti seluruh list PJ course ini
  await prisma.$transaction(async (tx) => {
    await tx.coursePJ.deleteMany({
      where: { courseId },
    });

    if (userIds.length > 0) {
      await tx.coursePJ.createMany({
        data: userIds.map((userId) => ({
          courseId,
          userId,
        })),
      });

      // Update role membership mahasiswa menjadi PJ jika saat ini masih MEMBER
      const class1B = await tx.class.findUnique({ where: { code: "1-B" } });
      if (class1B) {
        await tx.classMembership.updateMany({
          where: {
            classId: class1B.id,
            profileId: { in: userIds },
            role: Role.MEMBER,
          },
          data: {
            role: Role.PJ,
          },
        });
      }
    }
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${courseId}`);
  revalidatePath("/home/manage/members");
  revalidatePath("/");

  return { success: true };
}
