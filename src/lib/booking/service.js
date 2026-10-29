import "server-only";
import { getBookingConfig } from "@/lib/catalog/source";
import { getMongo, ensureApplicationIndexes } from "@/lib/db/mongo";
import { createBookingRepository } from "@/lib/booking/repository";

// A booking repository wired with the current business config (saved hours and closed dates).
export async function openBookingRepository() {
  const { client, db } = await getMongo();
  await ensureApplicationIndexes(db);
  const config = await getBookingConfig();
  return { db, config, repository: createBookingRepository({ client, db, config }) };
}
