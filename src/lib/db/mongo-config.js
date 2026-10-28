import { MongoClient } from "mongodb";

export const MONGO_CLIENT_OPTIONS = Object.freeze({
  appName: "the-cut-next",
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 8000,
});

export function createConfiguredMongoClient(uri, options = {}) {
  return new MongoClient(uri, { ...MONGO_CLIENT_OPTIONS, ...options });
}

export function selectConfiguredDatabase(client, databaseName) {
  return client.db(databaseName || undefined);
}

export async function resolveConfiguredDatabaseName(uri, databaseName) {
  if (typeof uri !== "string" || !uri.trim()) return null;
  const client = createConfiguredMongoClient(uri);
  try {
    return selectConfiguredDatabase(client, databaseName).databaseName;
  } finally {
    await client.close();
  }
}
