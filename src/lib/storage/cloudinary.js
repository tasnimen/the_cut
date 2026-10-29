import { createHash, randomUUID } from "node:crypto";

// Cloudinary storage adapter: signed REST upload and delete, server side only. This file never logs
// and never returns the API secret or a signature; errors carry a short code only. It has no
// "server-only" import so the dev check script and the tests can load it; never import it from a
// client component (a test enforces this).

export const CLOUDINARY_FOLDERS = Object.freeze({
  avatar: "the-cut/avatars",
  barbers: "the-cut/barbers",
  services: "the-cut/services",
  gallery: "the-cut/gallery",
  banners: "the-cut/banners",
  slots: "the-cut/slots",
  products: "the-cut/products",
  test: "the-cut/_test",
});

const FOLDER_VALUES = new Set(Object.values(CLOUDINARY_FOLDERS));
const PUBLIC_ID_PATTERN = /^the-cut\/[a-z_]+\/[A-Za-z0-9-]{8,64}$/;

export class StorageError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = "StorageError";
    this.code = code;
    this.status = status;
  }
}

// Cloudinary signature: SHA-1 of the sorted "key=value" pairs joined with "&", followed by the API secret.
// `file`, `api_key`, `resource_type` and `cloud_name` are never part of it. Deterministic for fixed input.
export function signParams(params, apiSecret) {
  if (!apiSecret) throw new StorageError("missing_storage_secret");
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function safeSecureUrl(value, cloudName) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new StorageError("invalid_provider_response");
  }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.startsWith(`/${cloudName}/`) || url.username || url.password) {
    throw new StorageError("invalid_provider_response");
  }
  return url.toString();
}

export function createCloudinaryStorage({ cloudName, apiKey, apiSecret, fetchImpl = fetch, now = () => Date.now(), makeId = () => randomUUID() }) {
  if (!cloudName || !apiKey || !apiSecret) throw new StorageError("missing_storage_configuration");
  const base = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image`;

  async function post(action, fields, file) {
    const timestamp = Math.floor(now() / 1000);
    const signedFields = { ...fields, timestamp };
    const body = new FormData();
    for (const [key, value] of Object.entries(signedFields)) body.append(key, String(value));
    body.append("api_key", apiKey);
    body.append("signature", signParams(signedFields, apiSecret));
    if (file) body.append("file", file.blob, file.name);
    let response;
    try {
      response = await fetchImpl(`${base}/${action}`, { method: "POST", body, redirect: "error", signal: AbortSignal.timeout(20_000) });
    } catch {
      throw new StorageError("provider_unreachable");
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new StorageError(response.status === 401 || response.status === 403 ? "provider_rejected_credentials" : "provider_error", response.status);
    return data;
  }

  return Object.freeze({
    provider: "cloudinary",

    // `folder` must be one of the fixed folders; the id is random, so no part of the path is user controlled.
    async upload({ bytes, folder, mimeType = "image/webp" }) {
      if (!FOLDER_VALUES.has(folder)) throw new StorageError("invalid_folder");
      const publicId = `${folder}/${makeId()}`;
      const data = await post("upload", { public_id: publicId, overwrite: "false" }, { blob: new Blob([bytes], { type: mimeType }), name: `${publicId.split("/").pop()}.webp` });
      if (!data?.public_id || !data?.secure_url) throw new StorageError("invalid_provider_response");
      if (data.public_id !== publicId) throw new StorageError("invalid_provider_response");
      return Object.freeze({
        provider: "cloudinary",
        publicId: data.public_id,
        resourceType: "image",
        secureUrl: safeSecureUrl(data.secure_url, cloudName),
        width: Number(data.width),
        height: Number(data.height),
        format: String(data.format ?? "webp"),
        bytes: Number(data.bytes),
        folder,
      });
    },

    // Deletes by public id only. A missing asset counts as already deleted.
    async delete({ publicId }) {
      if (typeof publicId !== "string" || !PUBLIC_ID_PATTERN.test(publicId)) throw new StorageError("invalid_public_id");
      const data = await post("destroy", { public_id: publicId, invalidate: "true" });
      if (data?.result !== "ok" && data?.result !== "not found") throw new StorageError("provider_error");
      return true;
    },
  });
}
