// A tiny in-memory stand-in for the parts of MongoDB the mail layer uses. Test helper only (not imported by the app).
function matches(doc, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or") return expected.some((part) => matches(doc, part));
    const actual = doc[key];
    if (expected && typeof expected === "object" && !(expected instanceof Date) && !(expected?._bsontype)) {
      if ("$lt" in expected && !(actual < expected.$lt)) return false;
      if ("$lte" in expected && !(actual <= expected.$lte)) return false;
      if ("$gte" in expected && !(actual >= expected.$gte)) return false;
      if ("$in" in expected && !expected.$in.includes(actual)) return false;
      if ("$exists" in expected && (key in doc) !== expected.$exists) return false;
      return true;
    }
    return String(actual) === String(expected);
  });
}

export function mailTestDb(initial = {}) {
  const data = { user: [], booking: [], mailLog: [], auditLog: [], ...initial };
  const collection = (name) => {
    const rows = data[name] ?? (data[name] = []);
    return {
      async insertOne(doc) {
        if (name === "mailLog" && rows.some((row) => row.key === doc.key)) throw Object.assign(new Error("duplicate"), { code: 11000 });
        rows.push({ ...doc });
        return { insertedId: doc._id };
      },
      async findOne(filter) {
        const row = rows.find((item) => matches(item, filter));
        return row ? { ...row } : null;
      },
      find(filter = {}) {
        let result = rows.filter((row) => matches(row, filter));
        const cursor = { sort(spec) { const [[field, dir]] = Object.entries(spec); result = [...result].sort((a, b) => (a[field] > b[field] ? dir : -dir)); return cursor; }, limit(count) { result = result.slice(0, count); return cursor; }, async toArray() { return result.map((row) => ({ ...row })); } };
        return cursor;
      },
      async updateOne(filter, update) {
        const row = rows.find((item) => matches(item, filter));
        if (!row) return { matchedCount: 0 };
        Object.assign(row, update.$set ?? {});
        return { matchedCount: 1 };
      },
      async findOneAndUpdate(filter, update) {
        const row = rows.find((item) => matches(item, filter));
        if (!row) return null;
        Object.assign(row, update.$set ?? {});
        return { ...row };
      },
    };
  };
  return { data, collection };
}
