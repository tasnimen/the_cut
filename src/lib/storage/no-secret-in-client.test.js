import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Static guard: nothing that runs in the browser may import server-only image code or mention the secret.
const SRC = path.join(process.cwd(), "src");
const FORBIDDEN_IMPORTS = ["@/lib/storage/cloudinary", "@/lib/storage/imgbb", "@/lib/storage/build-service", "@/lib/storage/index", "@/lib/storage\"", "@/config/env\"", "@/lib/gallery/media"];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

const clientFiles = walk(SRC).filter((file) => fs.readFileSync(file, "utf8").trimStart().startsWith('"use client"'));

describe("client bundle", () => {
  it("finds the client components it is supposed to check", () => {
    expect(clientFiles.length).toBeGreaterThan(10);
  });
  it("never imports the storage adapters or the server environment", () => {
    for (const file of clientFiles) {
      const source = fs.readFileSync(file, "utf8");
      for (const forbidden of FORBIDDEN_IMPORTS) expect(source, `${path.relative(SRC, file)} imports ${forbidden}`).not.toContain(`from "${forbidden}`);
    }
  });
  it("never mentions the Cloudinary secret or API key variables", () => {
    for (const file of clientFiles) {
      const source = fs.readFileSync(file, "utf8");
      expect(source, path.relative(SRC, file)).not.toMatch(/CLOUDINARY_API_(SECRET|KEY)|NEXT_PUBLIC_CLOUDINARY/);
    }
  });
  it("keeps the secret out of NEXT_PUBLIC variables and the example file", () => {
    const example = fs.readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
    expect(example).not.toMatch(/NEXT_PUBLIC_CLOUDINARY/);
    expect(example).toMatch(/^CLOUDINARY_API_SECRET=$/m);
  });
});
