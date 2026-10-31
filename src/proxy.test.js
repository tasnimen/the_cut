import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy, SONNER_STYLE_HASHES } from "./proxy.js";

const hash = (text) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

// The CSS text sonner inserts, read from the installed package.
function sonnerCss() {
  const source = fs.readFileSync(path.join(process.cwd(), "node_modules/sonner/dist/index.mjs"), "utf8");
  const start = source.indexOf('__insertCSS("') + "__insertCSS(".length;
  let end = start + 1;
  while (source[end] !== '"' || source[end - 1] === "\\") end += 1;
  return Function(`return ${source.slice(start, end + 1)}`)();
}

describe("content security policy", () => {
  const response = proxy(new NextRequest("http://localhost/"));
  const policy = response.headers.get("content-security-policy");
  const directive = (name) => policy.split("; ").find((part) => part.startsWith(`${name} `));

  it("allows exactly the two style contents sonner inserts, matching the installed version", () => {
    expect(SONNER_STYLE_HASHES).toBe(`${hash("")} ${hash(sonnerCss())}`);
    expect(directive("style-src-elem")).toContain(SONNER_STYLE_HASHES);
  });

  it("still has no unsafe-inline for style elements or scripts, and keeps the per-request nonce", () => {
    expect(directive("style-src-elem")).not.toContain("unsafe-inline");
    expect(directive("script-src")).not.toContain("unsafe-inline");
    expect(directive("style-src-elem")).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it("passes the path and a fresh nonce to the page", () => {
    const first = proxy(new NextRequest("http://localhost/admin/barbers"));
    const second = proxy(new NextRequest("http://localhost/admin/barbers"));
    expect(first.headers.get("content-security-policy")).not.toBe(second.headers.get("content-security-policy"));
  });
});
