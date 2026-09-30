"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession, assertCanMutate } from "@/lib/auth/session";
import { canUploadMaterial, canManageMaterial } from "@/lib/auth/rbac";
import { createMaterialSchema } from "@/lib/validations";
import { uploadToStorage, deleteFromStorage, validateFile, sanitizeFileName } from "@/lib/supabase/storage";
import { logActivity } from "@/lib/activity";
import { ActivityAction, MaterialType, MaterialVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createMaterialAction(formData: FormData) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login untuk mengunggah materi.");
  }
  assertCanMutate(session);

  if (!canUploadMaterial(session)) {
    throw new Error("Akses ditolak: Hanya PJ atau Admin yang dapat menambahkan materi.");
  }

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || undefined;
  const courseId = formData.get("courseId") as string;
  const topicId = (formData.get("topicId") as string) || undefined;
  const materialType = (formData.get("materialType") as MaterialType) || MaterialType.PDF;
  const externalUrl = (formData.get("externalUrl") as string) || undefined;
  const visibility = (formData.get("visibility") as MaterialVisibility) || MaterialVisibility.PUBLIC;
  const file = formData.get("file") as File | null;

  const parsed = createMaterialSchema.parse({
    title,
    description,
    courseId,
    topicId,
    materialType,
    externalUrl,
    visibility,
  });

  let storagePath: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;

  // Jika materi berupa file dan ada file diupload
  if (file && file.size > 0 && file.name) {
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      throw new Error(fileValidation.error || "File tidak valid.");
    }

    const cleanName = sanitizeFileName(file.name);
    const path = `${parsed.courseId}/${Date.now()}_${cleanName}`;

    const uploadRes = await uploadToStorage("materials", path, file);
    if (uploadRes.error) {
      throw new Error(`Gagal mengunggah file ke storage: ${uploadRes.error}`);
    }

    storagePath = uploadRes.storagePath;
    fileName = file.name;
    fileSize = file.size;
  }

  const material = await prisma.material.create({
    data: {
      courseId: parsed.courseId,
      topicId: parsed.topicId || null,
      title: parsed.title,
      description: parsed.description || null,
      materialType: parsed.materialType,
      storagePath,
      fileName,
      fileSize,
      externalUrl: parsed.externalUrl || null,
      visibility: parsed.visibility,
      uploadedById: session.profile.id,
    },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.MATERIAL_UPLOADED,
    entityType: "Material",
    entityId: material.id,
    metadata: {
      title: material.title,
      courseId: material.courseId,
      fileName: material.fileName,
      visibility: material.visibility,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath("/home/manage/materials");
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true, materialId: material.id };
}

export async function deleteMaterialAction(materialId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const material = await prisma.material.findUnique({
    where: { id: materialId },
  });
  if (!material) {
    throw new Error("Materi tidak ditemukan.");
  }

  if (!canManageMaterial(material, session)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk menghapus materi ini.");
  }

  // Jika memiliki file fisik di Supabase storage, hapus
  if (material.storagePath) {
    await deleteFromStorage("materials", material.storagePath);
  }

  await prisma.material.delete({
    where: { id: materialId },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.MATERIAL_DELETED,
    entityType: "Material",
    entityId: materialId,
    metadata: { title: material.title },
  });

  revalidatePath("/home/materials");
  revalidatePath("/home/manage/materials");
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true };
}
