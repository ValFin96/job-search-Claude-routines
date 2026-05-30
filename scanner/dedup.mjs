// KV-backed dedup: remembers job IDs across runs so each weekly run only
// surfaces genuinely new jobs. `kv` is a Cloudflare KV namespace binding
// (env.SEEN_JOBS). Keys are "job:<adzunaId>"; values are tiny; entries
// self-expire so the store stays small.

const KEY_PREFIX = "job:";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const key = (id) => KEY_PREFIX + id;

/**
 * Split jobs into those not seen before (returned) — already-seen ones are
 * dropped. Does NOT mark them seen; call markSeen() after a successful run so
 * a mid-run failure doesn't silently swallow jobs on the next run.
 */
export async function filterNew(jobs, kv) {
  const seen = await Promise.all(jobs.map((j) => kv.get(key(j.id))));
  return jobs.filter((_, i) => seen[i] == null);
}

/** Record jobs as seen (with TTL). Call only after they've been delivered. */
export async function markSeen(jobs, kv) {
  await Promise.all(
    jobs.map((j) => kv.put(key(j.id), "1", { expirationTtl: TTL_SECONDS }))
  );
}
