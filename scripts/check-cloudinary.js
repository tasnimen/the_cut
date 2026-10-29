import sharp from "sharp";
import { loadSeedEnvironment } from "../src/lib/booking/load-seed-environment.js";
import { createCloudinaryStorage, CLOUDINARY_FOLDERS, StorageError } from "../src/lib/storage/cloudinary.js";
import { CLOUDINARY_ENV_NAMES, missingStorageEnv } from "../src/lib/storage/storage-env.js";

// Development-only credential check: uploads a 1x1 image to the-cut/_test, deletes it straight away and
// prints SUCCESS or FAILURE with a short safe code. It never prints the cloud name, key, secret or any
// signature, and it refuses to run in production.
//   npm run check:cloudinary

if (process.env.NODE_ENV === "production") {
  console.log("FAILURE: refused (this check never runs in production).");
  process.exit(1);
}

loadSeedEnvironment(process.cwd(), "development");

const missing = missingStorageEnv({ ...process.env, STORAGE_PROVIDER: "cloudinary" });
if (missing.length > 0) {
  console.log(`FAILURE: missing_variables (set ${missing.join(", ")} in .env; expected names: ${CLOUDINARY_ENV_NAMES.join(", ")})`);
  process.exit(1);
}

function safeCode(error) {
  if (error instanceof StorageError) return error.status ? `${error.code} (HTTP ${error.status})` : error.code;
  return "unexpected_error";
}

let uploaded = null;
let storage;
try {
  storage = createCloudinaryStorage({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  });
  const bytes = await sharp({ create: { width: 1, height: 1, channels: 3, background: "#071923" } }).webp().toBuffer();
  uploaded = await storage.upload({ bytes, folder: CLOUDINARY_FOLDERS.test, mimeType: "image/webp" });
} catch (error) {
  console.log(`FAILURE: upload_failed: ${safeCode(error)}`);
  process.exit(1);
}

try {
  await storage.delete({ publicId: uploaded.publicId });
  console.log("SUCCESS: uploaded a 1x1 test image to the-cut/_test and deleted it again.");
} catch (error) {
  console.log(`FAILURE: upload worked but delete_failed: ${safeCode(error)} (remove the file in the-cut/_test by hand)`);
  process.exit(1);
}
