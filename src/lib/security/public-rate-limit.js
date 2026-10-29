import "server-only";
import { createHmac } from "node:crypto";
import { getIP } from "@better-auth/core/utils/ip";
import { requireEnv } from "@/config/env";
import { getMongo } from "@/lib/db/mongo";
import { createMongoRateLimiter } from "@/lib/security/rate-limit-core";

let rateLimiterPromise;

async function getRateLimiter() {
  if (!rateLimiterPromise) {
    rateLimiterPromise = (async () => {
      const { db } = await getMongo();
      const collection = db.collection("publicRateLimit");
      await Promise.all([
        collection.createIndex({ key: 1 }, { unique: true, name: "public_rate_limit_key_unique" }),
        collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "public_rate_limit_expiry_ttl" }),
      ]);
      return createMongoRateLimiter(collection);
    })().catch((error) => {
      rateLimiterPromise = undefined;
      throw error;
    });
  }
  return rateLimiterPromise;
}

export async function consumePublicRateLimit(request, { bucket, limit, windowMs }) {
  let ip = "unknown";
  try {
    ip = getIP(request, {}) || ip;
  } catch {
    // Missing proxy IP configuration shares a conservative fallback bucket.
  }
  const key = `${bucket}:${createHmac("sha256", requireEnv("BETTER_AUTH_SECRET")).update(ip).digest("hex")}`;
  return (await getRateLimiter()).consume({ key, limit, windowMs });
}

// Rate limit keyed by the signed-in user (used by privileged Server Actions).
export async function consumeUserRateLimit(userId, { bucket, limit, windowMs }) {
  const key = `${bucket}:user:${createHmac("sha256", requireEnv("BETTER_AUTH_SECRET")).update(String(userId)).digest("hex")}`;
  return (await getRateLimiter()).consume({ key, limit, windowMs });
}
