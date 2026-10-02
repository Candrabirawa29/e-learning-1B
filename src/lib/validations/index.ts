import { z } from "zod";
import {
  TaskPriority,
  TaskStatus,
  TaskTargetType,
  MaterialType,
  MaterialVisibility,
  Role,
} from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter")
      .regex(/[A-Z]/, "Harus mengandung setidaknya 1 huruf besar")
      .regex(/[a-z]/, "Harus mengandung setidaknya 1 huruf kecil")
      .regex(/[0-9]/, "Harus mengandung setidaknya 1 angka"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password baru tidak cocok",
    path: ["confirmPassword"],
  });

export const httpsUrlSchema = z
  .string()
  .url("URL tidak valid")
  .refine((val) => val.startsWith("https://"), {
    message: "URL pengumpulan harus menggunakan protokol HTTPS (https://...)",
  })
  .optional()
  .or(z.literal(""));

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, "Judul tugas minimal 3 karakter")
    .max(200, "Judul tugas maksimal 200 karakter"),
  description: z.string().optional(),
  courseId: z.string().optional().nullable(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  deadline: z.string().optional().nullable(),
  targetType: z.nativeEnum(TaskTargetType).default(TaskTargetType.ALL),
  assignees: z.array(z.string()).default([]),
  attachmentUrl: z.string().url("URL tautan lampiran tidak valid").optional().or(z.literal("")),
  submissionUrl: httpsUrlSchema,
});

export const updateTaskSchema = z.object({
  title: z.string().min(3, "Judul tugas minimal 3 karakter").max(200),
  description: z.string().optional(),
  courseId: z.string().optional().nullable(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  deadline: z.string().optional().nullable(),
  targetType: z.nativeEnum(TaskTargetType).default(TaskTargetType.ALL),
  assignees: z.array(z.string()).default([]),
  attachmentUrl: z.string().url("URL tautan lampiran tidak valid").optional().or(z.literal("")),
  submissionUrl: httpsUrlSchema,
});

export const updateProgressSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  progress: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

export const createCourseSchema = z.object({
  name: z.string().min(2, "Nama mata kuliah minimal 2 karakter").max(100),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  lecturer: z.string().optional().nullable(),
});

export const courseScheduleSchema = z.object({
  dayOfWeek: z.coerce.number().min(1).max(7),
  startMinute: z.coerce.number().min(0).max(1439),
  endMinute: z.coerce.number().min(0).max(1439),
  room: z.string().optional().nullable(),
});

export const topicSchema = z.object({
  title: z.string().min(2, "Judul sub-topik minimal 2 karakter").max(150),
  description: z.string().optional().nullable(),
  order: z.coerce.number().default(0),
});

export const createMaterialSchema = z.object({
  title: z.string().min(3, "Judul materi minimal 3 karakter").max(200),
  description: z.string().optional(),
  courseId: z.string().min(1, "Mata kuliah wajib dipilih"),
  topicId: z.string().optional().nullable(),
  materialType: z.nativeEnum(MaterialType).default(MaterialType.PDF),
  provider: z.enum(["CLOUDINARY", "EXTERNAL"]).default("CLOUDINARY"),
  fileUrl: z.string().optional().nullable(),
  publicId: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.coerce.number().optional().nullable(),
  externalUrl: z.string().url("URL tautan materi tidak valid").optional().or(z.literal("")),
  visibility: z.nativeEnum(MaterialVisibility).default(MaterialVisibility.PUBLIC),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Judul pengumuman minimal 3 karakter").max(200),
  content: z.string().min(5, "Isi pengumuman minimal 5 karakter"),
  isPinned: z.boolean().default(false),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(Role),
});
