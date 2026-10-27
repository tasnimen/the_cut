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
