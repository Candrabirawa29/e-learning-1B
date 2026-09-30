import { createAdminClient } from "./admin";
import { createClient } from "./server";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Megabytes

export const ALLOWED_MATERIAL_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
];

export const ALLOWED_SUBMISSION_MIME_TYPES = [
  ...ALLOWED_MATERIAL_MIME_TYPES,
  "application/zip",
  "application/x-zip-compressed",
];

export function validateFile(
  file: File,
  allowedMimes: string[] = ALLOWED_MATERIAL_MIME_TYPES
): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Ukuran file melebihi batas maksimum 10 MB (ukuran file: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  // Cek MIME type atau fallback extension jika browser tidak mendeteksi mime
  const fileName = file.name.toLowerCase();
  const validByMime = allowedMimes.includes(file.type);
  const validByExt =
    fileName.endsWith(".pdf") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx") ||
    fileName.endsWith(".ppt") ||
    fileName.endsWith(".pptx") ||
    fileName.endsWith(".txt") ||
    (allowedMimes.includes("application/zip") && fileName.endsWith(".zip"));

  if (!validByMime && !validByExt) {
    return {
      valid: false,
      error: "Format file tidak didukung. Harap unggah file PDF, DOC, DOCX, PPT, PPTX, atau TXT.",
    };
  }

  return { valid: true };
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
}

export async function uploadToStorage(
  bucket: "materials" | "submissions",
  path: string,
  file: File | Blob
): Promise<{ storagePath: string; publicUrl?: string; error?: string }> {
  const adminClient = createAdminClient();
  const supabase = adminClient || (await createClient());

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: (file as File).type || "application/octet-stream",
    upsert: true,
  });

  if (error) {
    return { storagePath: "", error: error.message };
  }

  let publicUrl: string | undefined;
  if (bucket === "materials") {
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    publicUrl = publicUrlData.publicUrl;
  }

  return { storagePath: data.path, publicUrl };
}

export async function getStorageFileUrl(
  bucket: "materials" | "submissions",
  storagePath: string
): Promise<string> {
  const supabase = (await createClient()) || createAdminClient();
  if (bucket === "materials") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data.publicUrl;
  } else {
    // Untuk submissions privat gunakan signed URL
    const { data } = await supabase.storage.from(bucket).createSignedUrl(storagePath, 3600); // 1 jam
    return data?.signedUrl || "";
  }
}

export async function deleteFromStorage(
  bucket: "materials" | "submissions",
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();
  const supabase = adminClient || (await createClient());

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
