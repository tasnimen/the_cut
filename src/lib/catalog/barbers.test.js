import { describe, expect, it } from "vitest";
import { TEAM_PROFILES } from "../../config/team-profiles.js";
import { barberPhotoSlot, normalizePublicBarbers } from "./barbers.js";

const doc = (overrides = {}) => ({ slug: "daniel-carter", name: "Daniel Carter", role: "Master Barber", focus: "Classic cuts", active: true, publicProfile: true, displayOrder: 1, weeklySchedule: { monday: {} }, serviceSlugs: ["haircut"], ...overrides });

describe("normalizePublicBarbers", () => {
  it("keeps the generic, nameless file profiles until a barber is marked public", () => {
    for (const documents of [[], null, undefined, [doc({ publicProfile: false })], [doc({ publicProfile: undefined })]]) {
      const result = normalizePublicBarbers(documents, TEAM_PROFILES);
      expect(result.map((profile) => profile.name)).toEqual([null, null, null]);
    }
  });

  it("shows only active, public barbers, ordered, with an allow-list of fields", () => {
    const result = normalizePublicBarbers([
      doc({ slug: "james-miller", name: "James Miller", displayOrder: 2 }),
      doc(),
      doc({ slug: "hidden", name: "Hidden", publicProfile: false }),
      doc({ slug: "off", name: "Off", active: false }),
      doc({ slug: "nameless", name: " " }),
    ], TEAM_PROFILES);
    expect(result.map((profile) => profile.name)).toEqual(["Daniel Carter", "James Miller"]);
    expect(Object.keys(result[0]).sort()).toEqual(["focus", "image", "key", "name", "photoSlot", "role", "slug"]);
    expect(result[0].weeklySchedule).toBeUndefined();
    expect(result[0].serviceSlugs).toBeUndefined();
  });

  it("maps a photo slot only when one is defined for that barber", () => {
    expect(barberPhotoSlot("daniel-carter")).toBe("barber-daniel-carter");
    expect(barberPhotoSlot("someone-new")).toBeNull();
    expect(barberPhotoSlot("__proto__")).toBeNull();
  });
});
