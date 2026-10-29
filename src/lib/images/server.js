import "server-only";
import fs from "node:fs";
import path from "node:path";
import { resolveImage } from "@/lib/images/resolve";

let cached = null;

function listAvailable() {
  // Cached per server process: restart (or rebuild) after adding photos.
  if (cached && process.env.NODE_ENV === "production") return cached;
  try {
    cached = fs.readdirSync(path.join(process.cwd(), "public", "images"));
  } catch {
    cached = [];
  }
  return cached;
}

// Use from Server Components, then pass the result to the image component as props.
export function getImage(slotKey, overrides = {}) {
  return resolveImage(slotKey, { available: listAvailable(), overrides });
}
