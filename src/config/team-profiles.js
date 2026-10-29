// File fallback for the public team section. These cards carry no names: real barber names,
// roles and photos appear only when a barber document is marked `publicProfile: true`
// (set by the owner in the barbers editor), because the real team is not confirmed yet.
export const TEAM_PROFILES = Object.freeze([
  Object.freeze({ key: "profile-1", slug: null, name: null, role: "Master Barber", focus: "Classic, considered cuts", photoSlot: "barber-daniel-carter" }),
  Object.freeze({ key: "profile-2", slug: null, name: null, role: "Senior Barber", focus: "Texture and shape", photoSlot: "barber-james-miller" }),
  Object.freeze({ key: "profile-3", slug: null, name: null, role: "Barber & Groomer", focus: "Beard and shave", photoSlot: "barber-robert-wilson" }),
]);
