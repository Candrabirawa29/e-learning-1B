import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function generateUploadSignature(folder: string = "class1b_materials") {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder,
    },
    process.env.CLOUDINARY_API_SECRET || ""
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    folder,
  };
}

export async function deleteCloudinaryAsset(publicId: string, resourceType: "image" | "raw" | "video" = "raw") {
  if (!publicId) return null;
  try {
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    if (res.result !== "ok") {
      // Coba destroy sebagai image jika raw tidak ditemukan
      return await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    }
    return res;
  } catch (error) {
    console.error("Cloudinary delete asset error:", error);
    try {
      return await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    } catch {
      return null;
    }
  }
}

export { cloudinary };
