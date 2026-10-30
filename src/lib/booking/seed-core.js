import { BOOKING_SERVICES, BOOKING_SERVICE_LEGACY_SLUGS } from "../../config/booking-services.js";

export const BOOKING_BARBERS = Object.freeze([
  Object.freeze({ slug: "daniel-carter", name: "Daniel Carter" }),
  Object.freeze({ slug: "james-miller", name: "James Miller" }),
  Object.freeze({ slug: "robert-wilson", name: "Robert Wilson" }),
  Object.freeze({ slug: "michael-brown", name: "Michael Brown" }),
]);

export const BOOKING_SEED_OPT_IN_NAME = "ALLOW_THE_CUT_BOOKING_SEED";
export const BOOKING_SEED_OPT_IN_VALUE = "YES_I_REVIEWED_THE_CUT_DATABASE";
const LEGACY_NAMES = Object.freeze({
  haircut: ["The Signature Cut"],
  shave: ["The Hot Shave"],
  "hair-color": ["Hair Colour", "Hair Coloring", "Hair Colouring"],
  "hair-treatment": ["Hair & Scalp"],
  combo: ["Haircut + Beard", "Haircut & Beard", "Haircut and Beard", "Combo"],
});

export class BookingSeedGuardError extends Error {
  constructor(message) {
    super(message);
    this.name = "BookingSeedGuardError";
  }
}

export class BookingSeedAmbiguityError extends Error {
  constructor(message) {
    super(message);
    this.name = "BookingSeedAmbiguityError";
  }
}

function normalized(value) {
  return String(value || "").trim().toLocaleLowerCase("en-US");
}

export function isAllowedSeedDatabase(name) {
  return name === "the_cut" || (typeof name === "string" && /.+_(dev|test)$/.test(name));
}

export function validateBookingSeedGuards({ nodeEnv, databaseName, optIn, apply }) {
  if (nodeEnv !== "development") throw new BookingSeedGuardError("NODE_ENV must be development.");
  if (!isAllowedSeedDatabase(databaseName)) throw new BookingSeedGuardError("Resolved MongoDB database must be the_cut or end with _dev or _test.");
  if (apply && optIn !== BOOKING_SEED_OPT_IN_VALUE) {
    throw new BookingSeedGuardError(`Set ${BOOKING_SEED_OPT_IN_NAME} to its documented opt-in value before writes.`);
  }
  return Object.freeze({ databaseName, mode: apply ? "apply" : "dry-run" });
}

function findUnambiguousRecord(records, candidate, identify) {
  const matches = records.filter((record) => identify(record));
  if (matches.length > 1) throw new BookingSeedAmbiguityError(`Multiple existing records match ${candidate.name}.`);
  return matches[0] || null;
}

export function planBookingSeed({ existingServices, existingBarbers }) {
  const serviceActions = BOOKING_SERVICES.map((service) => {
    const record = findUnambiguousRecord(existingServices, service, (candidate) =>
      candidate.slug === service.slug || normalized(candidate.name) === normalized(service.name));
    if (record && (record.slug !== service.slug || normalized(record.name) !== normalized(service.name))) {
      throw new BookingSeedAmbiguityError(`Service identifier conflicts for ${service.name}.`);
    }
    const aliases = BOOKING_SERVICE_LEGACY_SLUGS[service.slug] || [];
    const aliasNames = LEGACY_NAMES[service.slug] || [];
    const legacyMatch = existingServices.find((candidate) =>
      aliases.includes(candidate.slug) || aliasNames.some((name) => normalized(name) === normalized(candidate.name)));
    if (legacyMatch && legacyMatch !== record) {
      throw new BookingSeedAmbiguityError(`An existing legacy service may overlap ${service.name}.`);
    }
    return Object.freeze({ kind: record ? (record.archivedAt ? "skip (archived)" : "update") : "insert", service, record });
  });

  const barberActions = BOOKING_BARBERS.map((barber) => {
    const record = findUnambiguousRecord(existingBarbers, barber, (candidate) =>
      candidate.slug === barber.slug || normalized(candidate.name) === normalized(barber.name));
    if (record && (record.slug !== barber.slug || normalized(record.name) !== normalized(barber.name))) {
      throw new BookingSeedAmbiguityError(`Barber identifier conflicts for ${barber.name}.`);
    }
    {
      const [firstName, lastName] = normalized(barber.name).split(/\s+/);
      const possibleDuplicate = existingBarbers.find((candidate) => {
        if (candidate === record) return false;
        const existingName = normalized(candidate.name).split(/\s+/);
        return existingName.includes(firstName) || existingName.includes(lastName);
      });
      if (possibleDuplicate) throw new BookingSeedAmbiguityError(`An existing barber may match ${barber.name}.`);
    }
    return Object.freeze({ kind: record ? (record.archivedAt ? "skip (archived)" : "update") : "insert", barber, record });
  });

  return Object.freeze({ services: Object.freeze(serviceActions), barbers: Object.freeze(barberActions) });
}

export async function applyBookingSeed(db, plan, now = new Date()) {
  const serviceCollection = db.collection("service");
  const barberCollection = db.collection("barber");
  const allServiceSlugs = BOOKING_SERVICES.map(({ slug }) => slug);

  for (const action of plan.services) {
    const { service, record } = action;
    if (record?.archivedAt) continue; // an archived record is never touched, so the seed cannot bring it back
    const fields = {
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceMinorUnits: service.priceMinorUnits,
      currency: "USD",
      active: true,
      displayOrder: Number(service.number),
      updatedAt: now,
    };
    if (record) {
      await serviceCollection.updateOne({ _id: record._id, slug: service.slug }, { $set: fields });
    } else {
      await serviceCollection.updateOne({ slug: service.slug }, {
        $setOnInsert: { ...fields, description: service.detail, createdAt: now },
      }, { upsert: true });
    }
  }

  for (const action of plan.barbers) {
    const { barber, record } = action;
    if (record?.archivedAt) continue;
    if (record) {
      await barberCollection.updateOne({ _id: record._id, slug: barber.slug }, {
        $addToSet: { serviceSlugs: { $each: allServiceSlugs } },
        $set: { updatedAt: now },
      });
    } else {
      await barberCollection.updateOne({ slug: barber.slug }, {
        $setOnInsert: {
          ...barber,
          active: true,
          serviceSlugs: allServiceSlugs,
          weeklySchedule: {},
          breaks: {},
          daysOff: [],
          createdAt: now,
          updatedAt: now,
        },
      }, { upsert: true });
    }
  }
}
