// Which storage settings are required for the chosen provider (pure; never returns a value).

export const STORAGE_PROVIDERS = Object.freeze(["cloudinary", "imgbb"]);
export const CLOUDINARY_ENV_NAMES = Object.freeze(["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]);

// Names of the variables that are missing for the provider. Empty when everything needed is present.
export function missingStorageEnv(env) {
  const provider = env.STORAGE_PROVIDER ?? "cloudinary";
  const required = provider === "cloudinary" ? CLOUDINARY_ENV_NAMES : ["IMGBB_API_KEY"];
  return required.filter((name) => typeof env[name] !== "string" || env[name].length === 0);
}

// Throws an error that names the missing variables (never their values).
export function assertStorageEnv(env) {
  const missing = missingStorageEnv(env);
  if (missing.length > 0) {
    const provider = env.STORAGE_PROVIDER ?? "cloudinary";
    throw new Error(`Image storage is not configured: set ${missing.join(", ")} (STORAGE_PROVIDER=${provider}). See .env.example.`);
  }
}
