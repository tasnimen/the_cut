import "server-only";
import { env } from "@/config/env";
import { createCloudinaryStorage } from "@/lib/storage/cloudinary";
import { createImgBBStorage } from "@/lib/storage/imgbb";
import { assertStorageEnv } from "@/lib/storage/storage-env";

// The one place that knows which image service is used. To swap providers, add an adapter with the
// same two methods (upload, delete) and select it here.
//   upload({ bytes, folder, mimeType }) -> provider-neutral record fields (see media-model.js)
//   remove(record)                      -> deletes the stored file of a Media record

function cloudinary() {
  assertStorageEnv({ ...env, STORAGE_PROVIDER: "cloudinary" }); // names the missing variables, never their values
  return createCloudinaryStorage({ cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, apiSecret: env.CLOUDINARY_API_SECRET });
}

let cached;
const currentAdapter = () => (cached ??= cloudinary());

export async function upload({ bytes, folder, mimeType }) {
  if (env.STORAGE_PROVIDER === "imgbb") throw new Error("Uploads to the legacy image provider were retired; set STORAGE_PROVIDER=cloudinary.");
  return currentAdapter().upload({ bytes, folder, mimeType });
}

// Records created before the switch have no `provider`; they were stored on ImgBB and are deleted there.
export async function remove(record) {
  if ((record?.provider ?? "imgbb") === "cloudinary") return currentAdapter().delete({ publicId: record.publicId });
  if (!env.IMGBB_API_KEY) throw new Error("Legacy image provider is not configured: set IMGBB_API_KEY to delete older images.");
  return createImgBBStorage({ apiKey: env.IMGBB_API_KEY }).delete({ deleteUrl: record.deleteUrl });
}
