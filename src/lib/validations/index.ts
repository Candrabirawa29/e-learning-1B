import { z } from "zod";
import { TaskPriority, TaskStatus, TaskTargetType, MaterialType, MaterialVisibility, Role } from "@prisma/client";

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

export const createTaskSchema = z.object({
  title: z.string().min(3, "Judul tugas minimal 3 karakter").max(200, "Judul tugas maksimal 200 karakter"),
  description: z.string().optional(),
  courseId: z.string().optional().nullable(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  deadline: z.string().optional().nullable(),
  targetType: z.nativeEnum(TaskTargetType).default(TaskTargetType.ALL),
  assignees: z.array(z.string()).default([]),
  attachmentUrl: z.string().url("URL tautan tidak valid").optional().or(z.literal("")),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3, "Judul tugas minimal 3 karakter").max(200),
  description: z.string().optional(),
  courseId: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  deadline: z.string().optional().nullable(),
});

export const updateProgressSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  progress: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

export const createMaterialSchema = z.object({
  title: z.string().min(3, "Judul materi minimal 3 karakter").max(200),
  description: z.string().optional(),
  courseId: z.string().min(1, "Mata kuliah wajib dipilih"),
  topicId: z.string().optional().nullable(),
  materialType: z.nativeEnum(MaterialType).default(MaterialType.PDF),
  externalUrl: z.string().url("URL tautan materi tidak valid").optional().or(z.literal("")),
  visibility: z.nativeEnum(MaterialVisibility).default(MaterialVisibility.PUBLIC),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(3, "Judul penugasan minimal 3 karakter").max(200),
  description: z.string().optional(),
  courseId: z.string().min(1, "Mata kuliah wajib dipilih"),
  deadline: z.string().min(1, "Batas waktu pengumpulan wajib diisi"),
  allowSubmissions: z.boolean().default(true),
  attachmentUrl: z.string().url("URL tautan tidak valid").optional().or(z.literal("")),
});

export const submitAssignmentSchema = z.object({
  linkUrl: z.string().url("Tautan pengumpulan tidak valid").optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Judul pengumuman minimal 3 karakter").max(200),
  content: z.string().min(5, "Isi pengumuman minimal 5 karakter"),
  isPinned: z.boolean().default(false),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(Role),
});
