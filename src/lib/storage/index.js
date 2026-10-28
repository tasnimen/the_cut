import "server-only";
import { requireEnv } from "@/config/env";
import { createImgBBStorage } from "@/lib/storage/imgbb";

let adapter;

function getAdapter() {
  if (!adapter) adapter = createImgBBStorage({ apiKey: requireEnv("IMGBB_API_KEY") });
  return adapter;
}

export async function upload({ bytes, filename, mimeType }) {
  return getAdapter().upload({ bytes, filename, mimeType });
}

export async function remove({ deleteUrl }) {
  return getAdapter().delete({ deleteUrl });
}
