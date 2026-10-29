import { describe, expect, it } from "vitest";
import { describeSetting, getAdminSettings, holidaysToValues, hoursToValues, saveSetting } from "./admin-settings.js";

function fakeDb(docs = []) {
  const data = { siteSetting: docs.map((doc) => ({ ...doc })), auditLog: [] };
  const collection = (name) => ({
    find: () => ({ limit: () => ({ toArray: async () => data[name].map((doc) => ({ ...doc })) }) }),
    insertOne: async (doc) => { data[name].push({ ...doc }); },
    updateOne: async (filter, update, options) => {
      let doc = data[name].find((item) => item.key === filter.key);
      if (!doc && options?.upsert) { doc = { key: filter.key, ...update.$setOnInsert }; data[name].push(doc); }
      Object.assign(doc, update.$set);
    },
  });
  return { data, collection };
}

describe("admin settings repository", () => {
  it("starts from the file defaults when nothing is saved", async () => {
    const settings = await getAdminSettings(fakeDb());
    expect(Object.keys(settings.hours)).toEqual(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
    expect(settings.contact).toEqual({ phone: null, email: null, streetAddress: null, postalCode: null });
    expect(settings.holidays.thanksgiving).toBe(true);
  });

  it("shows saved values merged over the defaults", async () => {
    const settings = await getAdminSettings(fakeDb([{ key: "contact", value: { phone: "+1 212 555 0100", streetAddress: "1 Main St" } }, { key: "hours", value: { monday: { open: "10:00", close: "16:00" } } }]));
    expect(settings.contact).toMatchObject({ phone: "+1 212 555 0100", streetAddress: "1 Main St", email: null });
    expect(Object.keys(settings.hours)).toEqual(["monday"]);
  });

  it("upserts one document per key and audits only which fields are set, never the values", async () => {
    const db = fakeDb();
    await saveSetting(db, "contact", { phone: "+1 212 555 0100", email: null, streetAddress: "1 Main St", postalCode: null }, "admin-1");
    await saveSetting(db, "contact", { phone: null, email: "a@b.co", streetAddress: null, postalCode: null }, "admin-1");
    expect(db.data.siteSetting).toHaveLength(1);
    expect(db.data.siteSetting[0].value.email).toBe("a@b.co");
    const [first] = db.data.auditLog;
    expect(first).toMatchObject({ action: "catalog.settings.contact_updated", actorId: "admin-1", targetId: "contact", details: { phone: "set", email: "empty", streetAddress: "set", postalCode: "empty" } });
    expect(JSON.stringify(db.data.auditLog)).not.toContain("555");
    expect(JSON.stringify(db.data.auditLog)).not.toContain("Main St");
  });

  it("rejects unknown setting keys", async () => {
    await expect(saveSetting(fakeDb(), "evil", {}, "admin-1")).rejects.toThrow(/Unknown setting/);
  });

  it("summarizes hours and holidays for the audit log and builds form values", () => {
    expect(describeSetting("hours", { monday: {}, friday: {} })).toEqual({ openDays: "2" });
    expect(describeSetting("holidays", { additionalClosedDates: ["2027-01-02"], december24EarlyClose: true })).toEqual({ closedDates: "1", earlyClose: "true" });
    expect(hoursToValues({ monday: { open: "09:00", close: "19:00" } }).tuesday).toEqual({ works: false, open: "09:00", close: "17:00" });
    expect(holidaysToValues({ thanksgiving: true, additionalClosedDates: ["2027-01-02"], december24EarlyCloseAt: "14:00" })).toMatchObject({ flags: { thanksgiving: true, laborDay: false }, datesText: "2027-01-02", earlyCloseAt: "14:00" });
  });
});
