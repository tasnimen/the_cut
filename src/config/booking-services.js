export const BOOKING_SERVICES = Object.freeze([
  Object.freeze({ number: "01", slug: "haircut", name: "Haircut", detail: "A clean, tailored haircut.", durationMinutes: 30, priceMinorUnits: 2500, icon: "scissors", category: "hair" }),
  Object.freeze({ number: "02", slug: "beard-trim", name: "Beard Trim", detail: "Clean lines and a closer finish.", durationMinutes: 20, priceMinorUnits: 1500, icon: "beard", category: "beard" }),
  Object.freeze({ number: "03", slug: "shave", name: "Shave", detail: "A close, considered shave.", durationMinutes: 30, priceMinorUnits: 2000, icon: "razor", category: "shave" }),
  Object.freeze({ number: "04", slug: "hair-color", name: "Hair Color", detail: "Professional hair color service.", durationMinutes: 60, priceMinorUnits: 6000, icon: "sparkle", category: "hair" }),
  Object.freeze({ number: "05", slug: "hair-treatment", name: "Hair Treatment", detail: "A restorative hair treatment.", durationMinutes: 45, priceMinorUnits: 4000, icon: "sparkle", category: "hair" }),
  Object.freeze({ number: "06", slug: "combo", name: "Combo (Haircut + Beard)", detail: "A haircut and beard trim together.", durationMinutes: 45, priceMinorUnits: 3500, icon: "scissors", category: "hair" }),
]);

export const BOOKING_SERVICE_LEGACY_SLUGS = Object.freeze({
  haircut: Object.freeze(["the-signature-cut"]),
  shave: Object.freeze(["the-hot-shave"]),
  "hair-color": Object.freeze(["hair-colouring", "hair-coloring"]),
  "hair-treatment": Object.freeze(["hair-scalp"]),
  combo: Object.freeze(["haircut-beard", "haircut-and-beard", "haircut-beard-combo"]),
});
