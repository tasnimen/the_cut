export function createMongoRateLimiter(collection) {
  async function ensureCounter(key, expiresAt) {
    try {
      await collection.updateOne(
        { key },
        { $setOnInsert: { key, count: 0, lastRequest: new Date(0), expiresAt } },
        { upsert: true },
      );
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  async function consume({ key, limit, windowMs, now = Date.now() }) {
    const cutoff = new Date(now - windowMs);
    const expiresAt = new Date(now + windowMs);
    await ensureCounter(key, expiresAt);
    const allowedRow = await collection.findOneAndUpdate(
      {
        key,
        $or: [{ lastRequest: { $lte: cutoff } }, { count: { $lt: limit } }],
      },
      [{
        $set: {
          count: { $cond: [{ $lte: ["$lastRequest", cutoff] }, 1, { $add: ["$count", 1] }] },
          lastRequest: new Date(now),
          expiresAt,
        },
      }],
      { returnDocument: "after" },
    );
    if (allowedRow) return Object.freeze({ allowed: true, retryAfterMs: 0 });

    const current = await collection.findOne({ key });
    if (!current) return consume({ key, limit, windowMs, now });
    return Object.freeze({
      allowed: false,
      retryAfterMs: Math.max(0, windowMs - (now - new Date(current.lastRequest).getTime())),
    });
  }

  return Object.freeze({ consume });
}

export function createMemoryRateLimiter() {
  const counters = new Map();
  return Object.freeze({
    async consume({ key, limit, windowMs, now = Date.now() }) {
      const current = counters.get(key);
      if (!current || now - current.lastRequest >= windowMs) {
        counters.set(key, { count: 1, lastRequest: now });
        return Object.freeze({ allowed: true, retryAfterMs: 0 });
      }
      if (current.count >= limit) {
        return Object.freeze({ allowed: false, retryAfterMs: Math.max(0, windowMs - (now - current.lastRequest)) });
      }
      counters.set(key, { count: current.count + 1, lastRequest: now });
      return Object.freeze({ allowed: true, retryAfterMs: 0 });
    },
  });
}
