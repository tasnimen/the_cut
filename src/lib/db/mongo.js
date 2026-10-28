import 'server-only';
import { MongoClient } from 'mongodb';
import { env, requireEnv } from '@/config/env';

const globalForMongo = globalThis;

export async function getMongo() {
  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(requireEnv('MONGODB_URI'), {
      appName: 'the-cut-next',
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 8000,
    });
    globalForMongo.mongoClientPromise = client.connect().catch((error) => {
      globalForMongo.mongoClientPromise = undefined;
      throw error;
    });
  }

  const client = await globalForMongo.mongoClientPromise;
  const db = client.db(env.MONGODB_DB_NAME || undefined);
  return { client, db };
}

let indexPromise;

export async function ensureSecurityIndexes(db) {
  if (!indexPromise) {
    indexPromise = Promise.all([
      db
        .collection('user')
        .createIndex({ email: 1 }, { unique: true, name: 'user_email_unique' }),
      db
        .collection('session')
        .createIndex(
          { token: 1 },
          { unique: true, name: 'session_token_unique' },
        ),
      db
        .collection('session')
        .createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0, name: 'session_expiry_ttl' },
        ),
      db
        .collection('verification')
        .createIndex(
          { expiresAt: 1 },
          { expireAfterSeconds: 0, name: 'verification_expiry_ttl' },
        ),
      db
        .collection('emailVerificationToken')
        .createIndex({ tokenHash: 1 }, { unique: true, name: 'email_verification_token_unique' }),
      db
        .collection('emailVerificationToken')
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'email_verification_token_expiry_ttl' }),
      db
        .collection('rateLimit')
        .createIndex(
          { key: 1 },
          { unique: true, name: 'rate_limit_key_unique' },
        ),
      db
        .collection('auditLog')
        .createIndex({ createdAt: -1 }, { name: 'audit_created_desc' }),
      db
        .collection('auditLog')
        .createIndex(
          { actorId: 1, createdAt: -1 },
          { name: 'audit_actor_created' },
        ),
      db
        .collection('auditLog')
        .createIndex(
          { targetType: 1, targetId: 1, createdAt: -1 },
          { name: 'audit_target_created' },
        ),
      db
        .collection('auditLog')
        .createIndex(
          { action: 1, ip: 1, createdAt: -1 },
          { name: 'audit_auth_failure_ip_created' },
        ),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  await indexPromise;
}

let applicationIndexPromise;

export async function ensureApplicationIndexes(db) {
  if (!applicationIndexPromise) {
    applicationIndexPromise = Promise.all([
      db.collection("media").createIndex({ category: 1, createdAt: -1 }, { name: "media_category_created" }),
      db.collection("media").createIndex({ ownerId: 1, category: 1 }, { name: "media_owner_category" }),
      db.collection("contactMessage").createIndex({ status: 1, createdAt: -1 }, { name: "contact_status_created" }),
      db.collection("service").createIndex({ slug: 1 }, { unique: true, name: "service_slug_unique" }),
      db.collection("service").createIndex({ active: 1, slug: 1 }, { name: "service_active_slug" }),
      db.collection("barber").createIndex({ slug: 1 }, { unique: true, name: "barber_slug_unique" }),
      db.collection("barber").createIndex({ active: 1, name: 1 }, { name: "barber_active_name" }),
      db.collection("booking").createIndex({ userId: 1, startsAt: -1 }, { name: "booking_user_start" }),
      db.collection("booking").createIndex({ userId: 1, status: 1, startsAt: 1 }, { name: "booking_user_active" }),
      db.collection("booking").createIndex({ barberId: 1, startsAt: 1 }, { name: "booking_barber_start" }),
      db.collection("booking").createIndex({ status: 1, startsAt: 1 }, { name: "booking_status_start" }),
      db.collection("booking").createIndex({ status: 1, reminderDueAt: 1, startsAt: 1 }, { name: "booking_reminder_due" }),
      db.collection("bookingSlot").createIndex({ barberId: 1, slotStart: 1 }, { unique: true, name: "booking_slot_barber_start_unique" }),
      db.collection("bookingSlot").createIndex({ bookingId: 1 }, { name: "booking_slot_booking" }),
    ]).catch((error) => {
      applicationIndexPromise = undefined;
      throw error;
    });
  }
  await applicationIndexPromise;
}
