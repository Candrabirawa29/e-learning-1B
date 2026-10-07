"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession, assertCanMutate } from "@/lib/auth/session";
import { canUploadMaterial, canManageMaterial } from "@/lib/auth/rbac";
import { createMaterialSchema } from "@/lib/validations";
import { generateUploadSignature, deleteCloudinaryAsset } from "@/lib/cloudinary";
import { deleteFromStorage } from "@/lib/supabase/storage";
import { logActivity } from "@/lib/activity";
import { ActivityAction, MaterialType, MaterialVisibility } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getCloudinaryUploadSignatureAction(courseId: string) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login untuk mengunggah materi.");
  }
  assertCanMutate(session);

  if (!canUploadMaterial(session, courseId)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengunggah materi di mata kuliah ini.");
  }

  const sigData = generateUploadSignature(`class1b/materials/${courseId}`);
  return { success: true, ...sigData };
}

export async function createMaterialAction(data: {
  title: string;
  description?: string;
  courseId: string;
  topicId?: string | null;
  materialType: MaterialType;
  provider?: "CLOUDINARY" | "EXTERNAL";
  fileUrl?: string | null;
  publicId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  externalUrl?: string | null;
  visibility?: MaterialVisibility;
}) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login untuk menambahkan materi.");
  }
  assertCanMutate(session);

  if (!canUploadMaterial(session, data.courseId)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk menambahkan materi.");
  }

  const parsed = createMaterialSchema.parse(data);

  // Validasi ukuran file maksimal 10MB (10 * 1024 * 1024 bytes)
  if (parsed.fileSize && parsed.fileSize > 10 * 1024 * 1024) {
    throw new Error("Ukuran file melebihi batas maksimal 10 MB.");
  }

  const material = await prisma.material.create({
    data: {
      courseId: parsed.courseId,
      topicId: parsed.topicId || null,
      title: parsed.title,
      description: parsed.description || null,
      materialType: parsed.materialType,
      provider: parsed.provider || (parsed.externalUrl ? "EXTERNAL" : "CLOUDINARY"),
      fileUrl: parsed.fileUrl || null,
      publicId: parsed.publicId || null,
      fileName: parsed.fileName || null,
      fileSize: parsed.fileSize || null,
      externalUrl: parsed.externalUrl || null,
      visibility: parsed.visibility || MaterialVisibility.PUBLIC,
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
      topicId: material.topicId,
      fileName: material.fileName,
      provider: material.provider,
      actorName: session.profile.name || session.profile.email,
      actorRole: session.effectiveRole,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${parsed.courseId}`);
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true, materialId: material.id };
}

export async function updateMaterialAction(
  materialId: string,
  data: {
    title: string;
    description?: string | null;
    topicId?: string | null;
    materialType?: MaterialType;
    externalUrl?: string | null;
    visibility?: MaterialVisibility;
  }
) {
  const session = await getCurrentSession();
  if (!session.user || !session.profile) {
    throw new Error("Anda harus login.");
  }
  assertCanMutate(session);

  const existing = await prisma.material.findUnique({
    where: { id: materialId },
  });
  if (!existing) {
    throw new Error("Materi tidak ditemukan.");
  }

  if (!canManageMaterial(existing, session)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengedit materi ini.");
  }

  const updated = await prisma.material.update({
    where: { id: materialId },
    data: {
      title: data.title.trim(),
      description:
        data.description !== undefined
          ? data.description
            ? data.description.trim()
            : null
          : existing.description,
      topicId:
        data.topicId !== undefined
          ? data.topicId === "none" || !data.topicId
            ? null
            : data.topicId
          : existing.topicId,
      materialType: data.materialType || existing.materialType,
      externalUrl:
        data.externalUrl !== undefined
          ? data.externalUrl
            ? data.externalUrl.trim()
            : null
          : existing.externalUrl,
      visibility: data.visibility || existing.visibility,
    },
  });

  await logActivity({
    actorId: session.profile.id,
    action: ActivityAction.MATERIAL_UPLOADED,
    entityType: "Material",
    entityId: updated.id,
    metadata: {
      actionType: "MATERIAL_UPDATED",
      title: updated.title,
      courseId: updated.courseId,
      topicId: updated.topicId,
      actorName: session.profile.name || session.profile.email,
      actorRole: session.effectiveRole,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${updated.courseId}`);
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true };
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

  // Jika diupload di Cloudinary, hapus di Cloudinary server-side
  if (material.publicId) {
    await deleteCloudinaryAsset(material.publicId);
  }

  // Fallback jika file warisan di Supabase storage
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
    metadata: {
      title: material.title,
      courseId: material.courseId,
      actorName: session.profile.name || session.profile.email,
      actorRole: session.effectiveRole,
    },
  });

  revalidatePath("/home/materials");
  revalidatePath(`/home/materials/${material.courseId}`);
  revalidatePath("/materials");
  revalidatePath("/");

  return { success: true };
}
