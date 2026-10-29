import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SITE_URL: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "must use HTTP or HTTPS").optional(),
  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_DB_NAME: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  AUTH_REQUIRE_EMAIL_VERIFICATION: z.preprocess((value) => value === "" ? undefined : value, z.enum(["true", "false"]).default("false").transform((value) => value === "true")),
  IMGBB_API_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  TURNSTILE_SECRET_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  SMTP_HOST: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).optional()),
  SMTP_PORT: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().int().min(1).max(65535).optional()),
  SMTP_USER: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  SMTP_PASS: z.preprocess((value) => value === "" ? undefined : value, z.string().min(1).optional()),
  MAIL_FROM: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).max(320).optional()),
  MAIL_TO: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().min(1).max(320).optional()),
}).refine((values) => Boolean(values.TURNSTILE_SECRET_KEY) === Boolean(values.NEXT_PUBLIC_TURNSTILE_SITE_KEY), {
  message: "TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY must be configured together",
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid server environment: ${parsedEnv.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
}

export const env = Object.freeze(parsedEnv.data);

export function requireEnv(name) {
  const value = env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value;
}
