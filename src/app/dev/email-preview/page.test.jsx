import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BOOKING_EVENTS } from "@/lib/mail/templates/booking";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
const { default: Page } = await import("./page.jsx");

afterEach(() => vi.unstubAllEnvs());

describe("development email preview", () => {
  it("does not exist outside development", () => {
    for (const mode of ["production", "test"]) {
      vi.stubEnv("NODE_ENV", mode);
      expect(() => Page(), mode).toThrow("NEXT_NOT_FOUND");
    }
  });

  it("shows every booking email with fake data in development, and sends nothing", () => {
    vi.stubEnv("NODE_ENV", "development");
    const html = renderToStaticMarkup(Page());
    for (const event of Object.keys(BOOKING_EVENTS)) expect(html, event).toContain(`id="email-${event}"`);
    expect(html).toContain("Test Customer");
    expect(html).toContain("Monday, November 9, 2026 at 10:00 AM ET");
    expect(html).toContain("Nothing is sent");
  });
});
