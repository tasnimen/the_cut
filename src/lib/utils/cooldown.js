// After a failed load, skip the database for a while so a database outage does not add the full
// connection timeout to every public page view. Pure and clock-injectable for tests.
export function createCooldown({ ms, now = () => Date.now() }) {
  let retryAt = 0;
  return async function run(load) {
    if (now() < retryAt) throw new Error("catalog source cooling down");
    try {
      return await load();
    } catch (error) {
      retryAt = now() + ms;
      throw error;
    }
  };
}
