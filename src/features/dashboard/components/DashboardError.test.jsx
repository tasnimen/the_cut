import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DashboardError } from "./DashboardError.jsx";

describe("DashboardError", () => {
  it("says something useful about a slow or restarting server and offers Try again, without showing error details", () => {
    const html = renderToStaticMarkup(<DashboardError error={Object.assign(new Error("secret internals sam@example.com"), { digest: "abc" })} reset={() => {}} />);
    expect(html).toContain("Something went wrong");
    expect(html).toMatch(/slow or restarting/);
    expect(html).toContain("Try again");
    expect(html).not.toMatch(/secret internals|sam@example/);
  });

  it("every dashboard error boundary passes the error on so it can be logged", () => {
    for (const area of ["admin", "user", "super-admin"]) {
      const source = fs.readFileSync(path.join(process.cwd(), "src/app", area, "error.jsx"), "utf8");
      expect(source, area).toContain("error={error}");
    }
  });
});

describe("walk-in form protections", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/features/dashboard/bookings/WalkInForm.jsx"), "utf8");
  it("blocks a second submit at once, catches a failed request and offers a retry for the free times", () => {
    expect(source).toMatch(/if \(submitting\.current\) return;\s+submitting\.current = true;/);
    expect(source).toMatch(/finally \{\s+submitting\.current = false;/);
    expect(source).toMatch(/\} catch \{/);
    expect(source).toMatch(/\.catch\(\(\) => \{/);
    expect(source).toContain("setReload");
  });
});
